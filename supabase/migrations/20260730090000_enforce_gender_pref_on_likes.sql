-- ============================================================================
-- `pref_gender` becomes a two-way rule: it also governs who may LIKE you.
--
-- WHY
--
-- Until now "women only" / "men only" only filtered the feed the preference
-- holder was shown. It said nothing about the other direction, so a user who
-- asked for men only still received likes — and therefore matches, and
-- therefore conversations — from anyone whose own feed happened to surface
-- them. For a preference that exists for comfort and safety, enforcing it in
-- one direction only is close to not enforcing it.
--
-- WHERE
--
-- Both write paths into likes_log are covered, because a rule the client can
-- route around is not a rule (see docs/adr/0002-server-side-daily-like-limit.md):
--
--   1. like_profile()      — the RPC the app calls.
--   2. likes_view_insert() — the INSTEAD OF trigger behind `INSERT INTO likes`,
--                            which is the legacy client path and what a direct
--                            PostgREST call would hit.
--
-- Both delegate to one function so the two can never disagree, and that
-- function mirrors genderPrefAdmits() in lib/prefs.js.
--
-- SEMANTICS
--
-- An unset gender is not a confirmation, so a strict preference excludes it —
-- the same reading the feed filter has always used. This also means non-binary,
-- transgender and "prefer not to say" users cannot like a profile set to
-- "men only" / "women only". That follows from the existing enum, but it is a
-- product decision worth revisiting deliberately rather than by default.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- The rule itself.
--
-- SECURITY DEFINER: the sender must not need read access to the recipient's
-- preferences to be judged by them, and vice versa.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.gender_pref_admits(p_pref_gender text, p_gender text)
    RETURNS boolean
    LANGUAGE sql IMMUTABLE
    SET search_path = ''
AS $$
  -- COALESCE is load-bearing, not defensive noise. Without it:
  --   * a NULL gender against 'men_only' yields NULL, not false — and
  --     `IF NOT NULL` is not true, so the like would be ALLOWED. That is the
  --     exact opposite of "an unstated gender is not a confirmation", and it
  --     would silently disagree with genderPrefAdmits() in lib/prefs.js.
  --   * an unrecognised pref_gender falls out of the CASE as NULL and would
  --     likewise fail open. A safety rule must fail closed.
  SELECT COALESCE(
    p_pref_gender IS NULL
      OR p_pref_gender = 'any_gender'
      OR p_gender = CASE p_pref_gender
                      WHEN 'women_only' THEN 'woman'
                      WHEN 'men_only'   THEN 'man'
                    END,
    false
  );
$$;

COMMENT ON FUNCTION public.gender_pref_admits(text, text) IS
  'Does a pref_gender admit someone of this gender? Mirrors genderPrefAdmits() in lib/prefs.js.';

CREATE OR REPLACE FUNCTION public.can_like_gender(p_sender_id text, p_target_id text)
    RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = ''
AS $$
  SELECT public.gender_pref_admits(
    (SELECT pp.pref_gender FROM public.profile_preferences pp WHERE pp.profile_id = p_target_id),
    (SELECT pc.gender      FROM public.profile_core        pc WHERE pc.id         = p_sender_id)
  );
$$;

COMMENT ON FUNCTION public.can_like_gender(text, text) IS
  'May the sender like the target, given the TARGET''s stated gender preference?';

REVOKE ALL ON FUNCTION public.gender_pref_admits(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_like_gender(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gender_pref_admits(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_like_gender(text, text) TO authenticated, service_role;


-- ----------------------------------------------------------------------------
-- Path 2: the `likes` view's INSTEAD OF INSERT trigger.
--
-- Raises rather than silently swallowing, so a direct insert cannot quietly
-- believe it succeeded. 42501 (insufficient_privilege) is what the profiles
-- view triggers already use for "not allowed".
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.likes_view_insert() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = ''
AS $$
BEGIN
  IF NOT public.can_like_gender(NEW.from_user_id, NEW.to_user_id) THEN
    RAISE EXCEPTION 'recipient does not accept likes from this profile'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.likes_log (from_user_id, to_user_id, comment)
  VALUES (NEW.from_user_id, NEW.to_user_id, NEW.comment)
  RETURNING id, created_at INTO NEW.id, NEW.created_at;
  RETURN NEW;
END;
$$;


-- ----------------------------------------------------------------------------
-- Path 1: like_profile().
--
-- The return type gains `reason`, so the app can tell "you are out of likes"
-- (offer more likes) apart from "this person does not accept likes from you"
-- (no amount of likes will help). Changing a function's return type requires a
-- DROP — CREATE OR REPLACE cannot do it.
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.like_profile(text);

CREATE FUNCTION public.like_profile(p_target_id text)
    RETURNS TABLE(ok boolean, reason text, remaining integer, matched boolean, match_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = ''
AS $$
DECLARE
  v_uid       text := (auth.jwt() ->> 'sub');
  v_allowance integer;
  v_used      integer;
  v_match_id  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_target_id IS NULL OR p_target_id = v_uid THEN
    RAISE EXCEPTION 'Invalid like target' USING ERRCODE = '22023';
  END IF;

  -- Serialise this user's likes against each other. Without it, two
  -- concurrent calls both read the same `used` count and both insert.
  PERFORM pg_advisory_xact_lock(hashtext('like_profile:' || v_uid));

  -- Blocked in either direction: refuse without disclosing which.
  IF EXISTS (
    SELECT 1 FROM public.blocks_log
     WHERE revoked_at IS NULL
       AND ((blocker_id = v_uid AND blocked_id = p_target_id)
         OR (blocker_id = p_target_id AND blocked_id = v_uid))
  ) THEN
    RETURN QUERY SELECT false, 'blocked'::text, 0, false, NULL::uuid;
    RETURN;
  END IF;

  -- The recipient's gender preference. Checked before the allowance so a
  -- refused like never costs the sender anything.
  IF NOT public.can_like_gender(v_uid, p_target_id) THEN
    v_allowance := public.daily_like_allowance(v_uid);
    v_used := public.likes_used_today(v_uid);
    RETURN QUERY
      SELECT false, 'not_accepted'::text, GREATEST(v_allowance - v_used, 0), false, NULL::uuid;
    RETURN;
  END IF;

  -- An existing active like is a no-op, and must not be charged twice.
  IF EXISTS (
    SELECT 1 FROM public.likes_log
     WHERE from_user_id = v_uid AND to_user_id = p_target_id AND revoked_at IS NULL
  ) THEN
    SELECT m.id INTO v_match_id FROM public.matches_log m
      WHERE m.status = 'active'
        AND ((m.user1_id = v_uid AND m.user2_id = p_target_id)
          OR (m.user1_id = p_target_id AND m.user2_id = v_uid));

    v_allowance := public.daily_like_allowance(v_uid);
    v_used := public.likes_used_today(v_uid);
    RETURN QUERY
      SELECT true, NULL::text, GREATEST(v_allowance - v_used, 0), v_match_id IS NOT NULL, v_match_id;
    RETURN;
  END IF;

  v_allowance := public.daily_like_allowance(v_uid);
  v_used := public.likes_used_today(v_uid);

  IF v_used >= v_allowance THEN
    RETURN QUERY SELECT false, 'limit_reached'::text, 0, false, NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.likes_log (from_user_id, to_user_id) VALUES (v_uid, p_target_id);

  -- create_match_on_mutual_like fires on that insert, so a match completed by
  -- this like is already visible.
  SELECT m.id INTO v_match_id FROM public.matches_log m
    WHERE m.status = 'active'
      AND ((m.user1_id = v_uid AND m.user2_id = p_target_id)
        OR (m.user1_id = p_target_id AND m.user2_id = v_uid));

  RETURN QUERY
    SELECT true, NULL::text, GREATEST(v_allowance - v_used - 1, 0), v_match_id IS NOT NULL, v_match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.like_profile(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.like_profile(text) TO authenticated;


-- ----------------------------------------------------------------------------
-- Backfill: likes that already violate the rule.
--
-- Soft-revoked, not deleted — likes_log is history-preserving, so `revoked_at`
-- hides the like from the `likes` view while keeping the row for trust & safety
-- review, and the change is reversible (see the rollback query below).
--
-- Deliberately NOT touching likes that already produced a match: unwinding
-- those would strand or delete live conversations, which is a product decision
-- and not something a schema migration should make on its own. Those are
-- reported instead — see the notice raised below.
-- ----------------------------------------------------------------------------

DO $mig$
DECLARE
  v_revoked integer;
  v_matched integer;
BEGIN
  WITH offending AS (
    SELECT l.id
      FROM public.likes_log l
      JOIN public.profile_core pc ON pc.id = l.from_user_id
      LEFT JOIN public.profile_preferences pp ON pp.profile_id = l.to_user_id
     WHERE l.revoked_at IS NULL
       AND NOT public.gender_pref_admits(pp.pref_gender, pc.gender)
       AND NOT EXISTS (
         SELECT 1 FROM public.matches_log m
          WHERE m.status = 'active'
            AND ((m.user1_id = l.from_user_id AND m.user2_id = l.to_user_id)
              OR (m.user1_id = l.to_user_id AND m.user2_id = l.from_user_id))
       )
  )
  UPDATE public.likes_log l
     SET revoked_at = now()
    FROM offending o
   WHERE l.id = o.id;

  GET DIAGNOSTICS v_revoked = ROW_COUNT;

  SELECT count(*) INTO v_matched
    FROM public.likes_log l
    JOIN public.profile_core pc ON pc.id = l.from_user_id
    LEFT JOIN public.profile_preferences pp ON pp.profile_id = l.to_user_id
   WHERE l.revoked_at IS NULL
     AND NOT public.gender_pref_admits(pp.pref_gender, pc.gender);

  RAISE NOTICE 'gender-pref backfill: revoked % pending like(s); % already-matched like(s) left untouched for manual review',
    v_revoked, v_matched;
END
$mig$;

-- Rollback for the backfill above, should it need undoing. Only the rows this
-- migration touched carry this exact timestamp window, so bound it by hand:
--
--   UPDATE public.likes_log SET revoked_at = NULL
--    WHERE revoked_at BETWEEN '<migration start>' AND '<migration end>';
