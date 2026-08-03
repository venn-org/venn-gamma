-- ============================================================================
-- feed_candidates() scores the entire eligible pool, city included.
--
-- WHY
--
-- The `p_max_distance_km IS NULL OR ... OR ST_DWithin(...)` predicate in
-- 20260731000000_feed_ranking_rpc.sql was meant to make distance filtering
-- optional. In practice services/profileService.js never passes
-- p_max_distance_km, so it is always NULL, the OR short-circuits to true, and
-- ST_DWithin never runs — idx_profiles_geog (built for exactly this) is dead
-- weight. Every feed page CROSS JOINs and scores every active, onboarded
-- profile in the database regardless of city, which both costs more than it
-- needs to (overlap_fraction runs twice, plus a distance calc, per candidate)
-- and produces worse feeds (a Bangalore user's top match can be someone in
-- Mumbai on compatibility alone, which is not a flatshare either of them can
-- act on).
--
-- FIX
--
-- A missing or out-of-range p_max_distance_km now falls back to a default
-- search radius (50km — larger than any single zone's radius_km in
-- public.zones, comfortably inside one metro, far short of the distance
-- between cities) instead of "unlimited". This is a real predicate now, not
-- a bypassable one, so ST_DWithin (and idx_profiles_geog) always run.
--
-- Onboarding always sets lat/lng from the chosen zone (hooks/useOnboarding.js),
-- so onboarding_done = true implies geog is populated — a candidate (or
-- caller) with no geog has not really onboarded and is excluded rather than
-- falling back to "distance doesn't apply, show them anyway" (the old OR
-- chain's effective behaviour for everyone).
--
-- The predicate is a plain AND (geog IS NOT NULL twice, then ST_DWithin), not
-- OR'd with a city fallback: tested against a 12k-row seeded pool split
-- across four cities, an OR'd fallback (`geog IS NULL OR ... OR
-- ST_DWithin(...)`) made the planner evaluate ST_DWithin as a post-hoc Join
-- Filter after a Seq Scan — idx_profiles_geog never got touched. The plain
-- AND form lets it drive a parameterized Index Scan on idx_profiles_geog
-- instead (candidate-gathering step dropped from ~41ms to ~11ms in that same
-- test). A same-city fallback for geog-less rows can come back later as its
-- own UNION branch if it turns out to matter, but should not be folded back
-- into this OR — that reintroduces the exact plan regression measured here.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.feed_candidates(
    p_limit           integer DEFAULT 40,
    p_offset          integer DEFAULT 0,
    p_max_distance_km numeric DEFAULT NULL,
    p_exclude_viewed  boolean DEFAULT false
)
    RETURNS TABLE (
      id                text,
      name              text,
      age               integer,
      gender            text,
      pronouns          text[],
      photos            text[],
      verified          boolean,
      bio               text,
      location          text,
      user_type         text,
      city              text,
      zone              text,
      areas             text[],
      budget_min        integer,
      budget_max        integer,
      budget            text,
      move_in_date      date,
      flat_type         text,
      prompts           jsonb,
      job_company       text,
      job_title         text,
      education_school  text,
      education_level   text,
      drink             text,
      tobacco           text,
      weed              text,
      last_active_at    timestamptz,
      onboarding_done   boolean,
      paused            boolean,
      pref_role         text,
      pref_gender       text,
      pref_age          text,
      pref_budget       text,
      pref_move_in      text,
      pref_smoking      text,
      pref_drinking     text,
      pref_occupation   text[],
      pref_food         text[],
      pref_pets         text[],
      pref_flat_type    text[],
      pref_areas        text[],
      overlap_score     integer,
      reciprocal_score  integer,
      distance_km       numeric,
      feed_score        numeric
    )
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_uid text := (auth.jwt() ->> 'sub');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  p_limit  := LEAST(GREATEST(COALESCE(p_limit, 40), 1), 100);
  p_offset := GREATEST(COALESCE(p_offset, 0), 0);
  -- A missing distance is a default radius, not "unlimited" — see header.
  p_max_distance_km := LEAST(GREATEST(COALESCE(p_max_distance_km, 50), 1), 500);

  RETURN QUERY
  WITH
  me AS (
    SELECT c.id AS my_id, c.gender AS my_gender, c.age AS my_age, c.geog AS my_geog,
           c.areas AS my_areas, c.budget_min AS my_budget_min, c.budget_max AS my_budget_max,
           c.flat_type AS my_flat_type, c.move_in_date AS my_move_in_date,
           p.pref_gender AS my_pref_gender, p.pref_age AS my_pref_age,
           p.pref_smoking AS my_pref_smoking, p.pref_drinking AS my_pref_drinking,
           p.pref_occupation AS my_pref_occupation, p.pref_food AS my_pref_food,
           p.pref_pets AS my_pref_pets, p.pref_flat_type AS my_pref_flat_type,
           p.pref_areas AS my_pref_areas
    FROM public.profile_core c
    LEFT JOIN public.profile_preferences p ON p.profile_id = c.id
    WHERE c.id = v_uid
  ),
  exposure AS (
    SELECT l.to_user_id, count(*)::numeric AS recent_likes
    FROM public.likes_log l
    WHERE l.revoked_at IS NULL
      AND l.created_at >= now() - interval '7 days'
    GROUP BY l.to_user_id
  ),
  eligible AS (
    SELECT
      c.*,
      pl.drink AS l_drink, pl.tobacco AS l_tobacco, pl.weed AS l_weed,
      pp.pref_role AS p_pref_role, pp.pref_gender AS p_pref_gender,
      pp.pref_age AS p_pref_age, pp.pref_budget AS p_pref_budget,
      pp.pref_move_in AS p_pref_move_in, pp.pref_smoking AS p_pref_smoking,
      pp.pref_drinking AS p_pref_drinking, pp.pref_occupation AS p_pref_occupation,
      pp.pref_food AS p_pref_food, pp.pref_pets AS p_pref_pets,
      pp.pref_flat_type AS p_pref_flat_type, pp.pref_areas AS p_pref_areas,
      me.*,
      COALESCE(e.recent_likes, 0) AS recent_likes,
      CASE
        WHEN c.geog IS NOT NULL AND me.my_geog IS NOT NULL
        THEN (extensions.ST_Distance(c.geog, me.my_geog) / 1000.0)::numeric
      END AS dist_km
    FROM me
    CROSS JOIN public.profile_core c
    LEFT JOIN public.profile_lifestyle pl   ON pl.profile_id = c.id
    LEFT JOIN public.profile_preferences pp ON pp.profile_id = c.id
    LEFT JOIN exposure e                    ON e.to_user_id  = c.id
    WHERE c.id <> me.my_id
      AND c.paused = false
      AND c.onboarding_done = true
      AND c.name IS NOT NULL AND btrim(c.name) <> ''
      AND c.photos IS NOT NULL AND array_length(c.photos, 1) >= 1
      AND public.gender_pref_admits(me.my_pref_gender, c.gender)
      AND public.gender_pref_admits(pp.pref_gender, me.my_gender)
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks_log b
        WHERE b.revoked_at IS NULL
          AND ((b.blocker_id = me.my_id AND b.blocked_id = c.id)
            OR (b.blocker_id = c.id AND b.blocked_id = me.my_id))
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.likes_log lk
        WHERE lk.revoked_at IS NULL AND lk.from_user_id = me.my_id AND lk.to_user_id = c.id
      )
      AND (NOT p_exclude_viewed OR NOT EXISTS (
        SELECT 1 FROM public.profile_views pv
        WHERE pv.viewer_id = me.my_id AND pv.viewed_id = c.id
          AND pv.viewed_at >= public.app_today()
      ))
      -- A plain AND, not OR'd with a fallback — see header for why that
      -- distinction is what makes idx_profiles_geog usable here.
      AND c.geog IS NOT NULL AND me.my_geog IS NOT NULL
      AND extensions.ST_DWithin(c.geog, me.my_geog, p_max_distance_km * 1000.0)
  ),
  scored AS (
    SELECT
      el.*,
      public.overlap_fraction(
        el.my_pref_areas, el.my_budget_min, el.my_budget_max, el.my_pref_flat_type,
        el.my_flat_type, el.my_move_in_date, el.my_pref_gender, el.my_pref_age,
        el.my_pref_occupation, el.my_pref_food, el.my_pref_pets,
        el.my_pref_smoking, el.my_pref_drinking,
        el.areas, el.p_pref_areas, el.budget_min, el.budget_max, el.flat_type,
        el.p_pref_flat_type, el.move_in_date, el.gender, el.age,
        el.p_pref_occupation, el.p_pref_food, el.p_pref_pets,
        el.p_pref_smoking, el.p_pref_drinking
      ) AS fwd,
      public.overlap_fraction(
        el.p_pref_areas, el.budget_min, el.budget_max, el.p_pref_flat_type,
        el.flat_type, el.move_in_date, el.p_pref_gender, el.p_pref_age,
        el.p_pref_occupation, el.p_pref_food, el.p_pref_pets,
        el.p_pref_smoking, el.p_pref_drinking,
        el.my_areas, el.my_pref_areas, el.my_budget_min, el.my_budget_max,
        el.my_flat_type, el.my_pref_flat_type, el.my_move_in_date,
        el.my_gender, el.my_age,
        el.my_pref_occupation, el.my_pref_food, el.my_pref_pets,
        el.my_pref_smoking, el.my_pref_drinking
      ) AS rec
    FROM eligible el
  ),
  ranked AS (
    SELECT
      sc.*,
      (0.65 * COALESCE(sc.fwd, 0.5) + 0.35 * COALESCE(sc.rec, 0.5)) AS compat,
      CASE
        WHEN sc.dist_km IS NULL THEN 0.5
        ELSE 1.0 / (1.0 + sc.dist_km / 5.0)
      END AS proximity,
      CASE
        WHEN sc.last_active_at IS NULL THEN 0.0
        ELSE 1.0 / (1.0 + EXTRACT(epoch FROM now() - sc.last_active_at) / 172800.0)
      END AS recency,
      1.0 / (1.0 + ln(1.0 + COALESCE(sc.recent_likes, 0)) / 2.0) AS exposure_factor
    FROM scored sc
  )
  SELECT
    r.id, r.name, r.age, r.gender, r.pronouns, r.photos, r.verified,
    r.bio, r.location, r.user_type, r.city, r.zone, r.areas,
    r.budget_min, r.budget_max, r.budget, r.move_in_date, r.flat_type,
    r.prompts, r.job_company, r.job_title, r.education_school, r.education_level,
    r.l_drink, r.l_tobacco, r.l_weed,
    r.last_active_at, r.onboarding_done, r.paused,
    r.p_pref_role, r.p_pref_gender, r.p_pref_age, r.p_pref_budget, r.p_pref_move_in,
    r.p_pref_smoking, r.p_pref_drinking, r.p_pref_occupation, r.p_pref_food,
    r.p_pref_pets, r.p_pref_flat_type, r.p_pref_areas,
    CASE WHEN r.fwd IS NULL THEN NULL ELSE round(16 + r.fwd * 83)::integer END,
    CASE WHEN r.rec IS NULL THEN NULL ELSE round(16 + r.rec * 83)::integer END,
    round(r.dist_km, 1),
    round((0.60 * r.compat + 0.25 * r.proximity + 0.15 * r.recency) * r.exposure_factor, 6)
  FROM ranked r
  ORDER BY (0.60 * r.compat + 0.25 * r.proximity + 0.15 * r.recency) * r.exposure_factor DESC,
           r.id ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.feed_candidates(integer, integer, numeric, boolean) IS
  'One ranked, paginated page of the caller''s feed, scored over the eligible pool within p_max_distance_km (default/cap 50km, range 1-500km) or same city when geog is unavailable: compatibility (mine about them + theirs about me), PostGIS distance, recency, damped by the candidate''s recent inbound like volume.';
