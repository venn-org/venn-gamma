-- ============================================================================
-- feed_funnel(): why does my feed only have N profiles?
--
-- feed_candidates() applies eight independent exclusions inside one WHERE
-- clause, so a feed that comes back nearly empty gives no indication of which
-- one emptied it. Guessing costs a round of "try changing a preference and
-- look again"; this returns the count surviving each filter, applied
-- cumulatively in the same order, so the drop is visible in one call.
--
-- The predicates below are copied from feed_candidates()'s `eligible` CTE and
-- must stay in step with it. That duplication is the point — a diagnostic that
-- paraphrases the thing it diagnoses can report a stage the real query does
-- not have.
--
-- Diagnostic only: nothing in the app calls it. Run it as the affected user
-- (an authenticated session, since it reads auth.jwt()):
--
--   select * from feed_funnel();
-- ============================================================================

CREATE OR REPLACE FUNCTION public.feed_funnel()
    RETURNS TABLE (stage text, remaining bigint)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path = ''
AS $$
DECLARE
  v_uid text := (auth.jwt() ->> 'sub');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  RETURN QUERY
  WITH me AS (
    SELECT c.id AS my_id, c.gender AS my_gender, p.pref_gender AS my_pref_gender
    FROM public.profile_core c
    LEFT JOIN public.profile_preferences p ON p.profile_id = c.id
    WHERE c.id = v_uid
  ),
  cand AS (
    SELECT c.id, c.gender, c.name, c.photos, c.paused, c.onboarding_done,
           pp.pref_gender AS their_pref_gender, me.*
    FROM me CROSS JOIN public.profile_core c
    LEFT JOIN public.profile_preferences pp ON pp.profile_id = c.id
  ),
  -- Each flag is the predicate at that stage ALONE; the cumulative counts come
  -- from AND-ing the flags up to that point below.
  flagged AS (
    SELECT
      (id <> my_id)                                              AS f_not_me,
      (paused = false)                                           AS f_active,
      (onboarding_done = true)                                   AS f_onboarded,
      (name IS NOT NULL AND btrim(name) <> ''
        AND photos IS NOT NULL AND array_length(photos, 1) >= 1) AS f_complete,
      public.gender_pref_admits(my_pref_gender, gender)          AS f_my_gender,
      public.gender_pref_admits(their_pref_gender, my_gender)    AS f_their_gender,
      NOT EXISTS (
        SELECT 1 FROM public.blocks_log b
        WHERE b.revoked_at IS NULL
          AND ((b.blocker_id = cand.my_id AND b.blocked_id = cand.id)
            OR (b.blocker_id = cand.id AND b.blocked_id = cand.my_id))
      )                                                          AS f_unblocked,
      NOT EXISTS (
        SELECT 1 FROM public.likes_log lk
        WHERE lk.revoked_at IS NULL
          AND lk.from_user_id = cand.my_id AND lk.to_user_id = cand.id
      )                                                          AS f_not_liked,
      NOT EXISTS (
        SELECT 1 FROM public.profile_views pv
        WHERE pv.viewer_id = cand.my_id AND pv.viewed_id = cand.id
          AND pv.viewed_at >= public.app_today()
      )                                                          AS f_not_viewed
    FROM cand
  )
  SELECT s.stage, s.remaining FROM (VALUES
    ('0. all profiles',            (SELECT count(*) FROM flagged)),
    ('1. not me',                  (SELECT count(*) FROM flagged WHERE f_not_me)),
    ('2. not paused',              (SELECT count(*) FROM flagged WHERE f_not_me AND f_active)),
    ('3. onboarding done',         (SELECT count(*) FROM flagged WHERE f_not_me AND f_active AND f_onboarded)),
    ('4. has name + photo',        (SELECT count(*) FROM flagged WHERE f_not_me AND f_active AND f_onboarded AND f_complete)),
    ('5. my gender pref admits',   (SELECT count(*) FROM flagged WHERE f_not_me AND f_active AND f_onboarded AND f_complete AND f_my_gender)),
    ('6. their pref admits me',    (SELECT count(*) FROM flagged WHERE f_not_me AND f_active AND f_onboarded AND f_complete AND f_my_gender AND f_their_gender)),
    ('7. not blocked',             (SELECT count(*) FROM flagged WHERE f_not_me AND f_active AND f_onboarded AND f_complete AND f_my_gender AND f_their_gender AND f_unblocked)),
    ('8. not already liked',       (SELECT count(*) FROM flagged WHERE f_not_me AND f_active AND f_onboarded AND f_complete AND f_my_gender AND f_their_gender AND f_unblocked AND f_not_liked)),
    -- Only applied when FLAGS.dailyViewLimitEnabled is on, which it is not —
    -- reported anyway so turning the flag back on has a predictable cost.
    ('9. not viewed today (flag off)',
                                   (SELECT count(*) FROM flagged WHERE f_not_me AND f_active AND f_onboarded AND f_complete AND f_my_gender AND f_their_gender AND f_unblocked AND f_not_liked AND f_not_viewed))
  ) AS s(stage, remaining)
  ORDER BY s.stage;
END;
$$;

COMMENT ON FUNCTION public.feed_funnel() IS
  'Diagnostic: profiles surviving each of feed_candidates()''s exclusions, applied cumulatively. Not called by the app.';

REVOKE ALL ON FUNCTION public.feed_funnel() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.feed_funnel() TO authenticated, service_role;
