-- ============================================================================
-- Server-side daily like allowance.
--
-- WHY
--
-- The allowance was enforced entirely on the client: `canLikeToday()` counted
-- today's rows, and if the count was under the cap the client inserted. Two
-- holes follow from that shape:
--
--   1. Check-then-act across two round-trips. A fast double-tap issues both
--      likes while the first count is still in flight, so the cap is a
--      suggestion under any real thumb.
--   2. The bonus allowance lived in AsyncStorage (`venn_like_bonus_<uid>_<day>`),
--      i.e. in storage the user owns. Writing that key grants unlimited likes.
--      Harmless while "get more likes" is a free placeholder; a revenue hole
--      the day it becomes a purchase.
--
-- Both disappear once the check and the insert happen in one transaction on
-- the server, which is what like_profile() below does. The client keeps its
-- own count purely to render "N likes left" without a round-trip — it is a
-- display value now, not a control.
--
-- The day boundary is Asia/Kolkata, not UTC. The client used
-- `toISOString().slice(0,10)`, so the allowance reset at 05:30 local time for
-- every user in the app's only market. Both sides now agree on local midnight.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Bonus grants. One row per user per local day; `amount` accumulates.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.like_bonus_grants (
    user_id     text NOT NULL REFERENCES public.profile_core(id) ON DELETE CASCADE,
    grant_day   date NOT NULL,
    amount      integer NOT NULL DEFAULT 0 CHECK (amount >= 0 AND amount <= 100),
    updated_at  timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, grant_day)
);

ALTER TABLE public.like_bonus_grants ENABLE ROW LEVEL SECURITY;

-- Readable by its owner; writes go exclusively through grant_extra_likes(),
-- so there is deliberately no INSERT/UPDATE policy.
DROP POLICY IF EXISTS like_bonus_grants_select_own ON public.like_bonus_grants;
CREATE POLICY like_bonus_grants_select_own ON public.like_bonus_grants
    FOR SELECT USING (user_id = (auth.jwt() ->> 'sub'));

GRANT SELECT ON public.like_bonus_grants TO authenticated;


-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------

-- The app's market is India; "today" means today there, for every user.
-- Change this one function if the app ever needs per-user timezones.
CREATE OR REPLACE FUNCTION public.app_today()
    RETURNS date
    LANGUAGE sql STABLE
    SET search_path = ''
AS $$
  SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date;
$$;

CREATE OR REPLACE FUNCTION public.daily_like_allowance(p_user_id text)
    RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = ''
AS $$
  -- Base allowance, kept in step with LIMITS.dailyLikes in config/flags.js.
  SELECT 5 + COALESCE(
    (SELECT amount FROM public.like_bonus_grants
      WHERE user_id = p_user_id AND grant_day = public.app_today()),
    0
  );
$$;

CREATE OR REPLACE FUNCTION public.likes_used_today(p_user_id text)
    RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = ''
AS $$
  -- Counts the log, not the view: a like that was later revoked was still
  -- spent, and counting the view would refund it on unlike.
  SELECT count(*)::integer FROM public.likes_log
    WHERE from_user_id = p_user_id
      AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = public.app_today();
$$;


-- ----------------------------------------------------------------------------
-- like_profile(): the only path a client should use to send a like.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.like_profile(p_target_id text)
    RETURNS TABLE(ok boolean, remaining integer, matched boolean, match_id uuid)
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
  -- concurrent calls both read the same `used` count and both insert — the
  -- exact race the client-side check had. hashtext() keeps the lock key
  -- per-user, so unrelated users never contend.
  PERFORM pg_advisory_xact_lock(hashtext('like_profile:' || v_uid));

  -- Blocked in either direction: refuse without disclosing which.
  IF EXISTS (
    SELECT 1 FROM public.blocks_log
     WHERE revoked_at IS NULL
       AND ((blocker_id = v_uid AND blocked_id = p_target_id)
         OR (blocker_id = p_target_id AND blocked_id = v_uid))
  ) THEN
    RETURN QUERY SELECT false, 0, false, NULL::uuid;
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
    RETURN QUERY SELECT true, GREATEST(v_allowance - v_used, 0), v_match_id IS NOT NULL, v_match_id;
    RETURN;
  END IF;

  v_allowance := public.daily_like_allowance(v_uid);
  v_used := public.likes_used_today(v_uid);

  IF v_used >= v_allowance THEN
    RETURN QUERY SELECT false, 0, false, NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.likes_log (from_user_id, to_user_id) VALUES (v_uid, p_target_id);

  -- create_match_on_mutual_like fires on that insert, so a match completed by
  -- this like is already visible.
  SELECT m.id INTO v_match_id FROM public.matches_log m
    WHERE m.status = 'active'
      AND ((m.user1_id = v_uid AND m.user2_id = p_target_id)
        OR (m.user1_id = p_target_id AND m.user2_id = v_uid));

  RETURN QUERY SELECT true, GREATEST(v_allowance - v_used - 1, 0), v_match_id IS NOT NULL, v_match_id;
END;
$$;


-- ----------------------------------------------------------------------------
-- remaining_likes_today(): what the header pill renders.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.remaining_likes_today()
    RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = ''
AS $$
  SELECT GREATEST(
    public.daily_like_allowance(auth.jwt() ->> 'sub')
      - public.likes_used_today(auth.jwt() ->> 'sub'),
    0
  );
$$;


-- ----------------------------------------------------------------------------
-- grant_extra_likes(): stands in for the premium purchase.
--
-- Capped per day so a client loop cannot mint an unlimited allowance — the
-- exact failure the AsyncStorage version had. Replace the cap with a receipt
-- check when this becomes a real purchase.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.grant_extra_likes()
    RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = ''
AS $$
DECLARE
  v_uid    text := (auth.jwt() ->> 'sub');
  v_amount integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  INSERT INTO public.like_bonus_grants (user_id, grant_day, amount)
  VALUES (v_uid, public.app_today(), 5)
  ON CONFLICT (user_id, grant_day) DO UPDATE
    SET amount = LEAST(public.like_bonus_grants.amount + 5, 25),
        updated_at = now()
  RETURNING amount INTO v_amount;

  RETURN v_amount;
END;
$$;


REVOKE ALL ON FUNCTION public.like_profile(text) FROM public;
REVOKE ALL ON FUNCTION public.grant_extra_likes() FROM public;
REVOKE ALL ON FUNCTION public.remaining_likes_today() FROM public;

GRANT EXECUTE ON FUNCTION public.like_profile(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_extra_likes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.remaining_likes_today() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_today() TO authenticated;


-- ----------------------------------------------------------------------------
-- Message length: the 500-character cap was enforced only by the TextInput's
-- maxLength prop, i.e. not at all for anything that isn't the app's own UI.
-- ----------------------------------------------------------------------------

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS chk_messages_content_length;
ALTER TABLE public.messages ADD CONSTRAINT chk_messages_content_length
    CHECK (char_length(content) > 0 AND char_length(content) <= 500) NOT VALID;
