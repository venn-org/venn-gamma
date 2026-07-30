-- ============================================================================
-- Feed ranking moves into SQL.
--
-- WHY
--
-- calculateOverlapScore/buildFeedOrder (lib/prefs.js) rank whatever the client
-- happened to fetch — one page of at most LIMITS.feedPageSize rows, ordered by
-- last_active_at. So "the best match for you" has only ever meant "the best of
-- the 200 most recently active profiles that survived the gender filter". The
-- ranking never sees the rest of the pool, and the rows it does see were
-- selected by a criterion (recency) that has nothing to do with match quality.
--
-- feed_candidates() scores the whole eligible pool in the database and returns
-- one ranked page. Three things follow that the client could not do:
--
--   1. WHOLE-POOL RANKING. The LIMIT now applies after ordering by score
--      instead of before it.
--
--   2. RECIPROCAL SCORING. A match needs both sides to want it. The client only
--      ever computed my preferences against them; it has no way to weigh their
--      preferences against me without fetching every candidate's full
--      preference row. Here it is the same expression with the arguments
--      swapped.
--
--   3. EXPOSURE BALANCING. Ranking purely on compatibility concentrates the
--      whole city's likes on the same handful of profiles: they sit at the top
--      of everyone's feed, their inbox becomes unreadable, they stop replying,
--      and every like spent on them is wasted. A profile's recent inbound like
--      volume damps its score, so attention spreads across the pool. This is
--      only computable centrally — no client knows what other clients are
--      seeing.
--
-- Distance is real now (PostGIS), rather than the name-equality area overlap
-- that was the only thing the client could do with `areas` text arrays. The
-- coordinates were already in profile_core, unused since
-- 20260727001000_enforce_coords_private.sql masked them from the view — and
-- they stay masked: this function is SECURITY DEFINER, reads lat/lng
-- internally, and returns only a rounded distance. Nothing here re-exposes a
-- position.
--
-- The scoring weights below mirror lib/prefs.js#calculateOverlapScore. That
-- duplication is deliberate and bounded: the client keeps its copy so a card
-- reached outside the feed (the likes grid, a profile sheet) can still show an
-- overlap badge. If the weights diverge, this file wins — it is what orders
-- the feed.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- PostGIS, and a stored geography point on profile_core.
--
-- The extension's schema is resolved from the catalog rather than assumed:
-- Supabase installs it into `extensions`, a plain Postgres installs it into
-- `public`, and a generated column has to name the function's schema
-- explicitly because it is stored with the table definition.
-- ----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

DO $mig$
DECLARE
  v_schema text;
BEGIN
  SELECT n.nspname INTO v_schema
  FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'postgis';

  IF v_schema IS NULL THEN
    RAISE EXCEPTION 'postgis is not installed; feed_candidates() needs it for distance';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.profile_core'::regclass
      AND attname = 'geog' AND attnum > 0 AND NOT attisdropped
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.profile_core ADD COLUMN geog %I.geography(Point, 4326) '
      || 'GENERATED ALWAYS AS ('
      || '  CASE WHEN lat IS NOT NULL AND lng IS NOT NULL'
      || '  THEN %I.ST_SetSRID(%I.ST_MakePoint(lng, lat), 4326)::%I.geography END'
      || ') STORED',
      v_schema, v_schema, v_schema, v_schema);
  END IF;
END
$mig$;

COMMENT ON COLUMN public.profile_core.geog IS
  'Generated from lat/lng. Private like its inputs — never exposed through the profiles view; feed_candidates() returns a rounded distance instead.';

-- Only rows that can appear in a feed are ever probed, so the index carries the
-- same partial predicate as idx_profiles_feed.
CREATE INDEX IF NOT EXISTS idx_profiles_geog ON public.profile_core USING gist (geog)
    WHERE (paused = false AND onboarding_done = true);

-- The exposure term aggregates inbound likes by day; without this the ranking
-- of every feed page scans likes_log in full.
CREATE INDEX IF NOT EXISTS idx_likes_to_user_recent
    ON public.likes_log USING btree (to_user_id, created_at)
    WHERE revoked_at IS NULL;


-- ----------------------------------------------------------------------------
-- The overlap kernel, in one direction.
--
-- Returns the weighted fraction of criteria — set on BOTH sides — that agree,
-- or NULL when the two rows share no comparable criterion at all. NULL is not
-- zero: "we have nothing to compare" is not evidence of a bad match, and the
-- caller decides what a missing signal is worth (see the neutral 0.5 below).
--
-- One function, called twice with the arguments swapped, is what makes the
-- reciprocal term free. The first block of arguments is whoever holds the
-- preference; the second is whoever is being judged by it.
--
-- The weights are lib/prefs.js#OVERLAP_WEIGHTS: where you can afford to live
-- and where you want to live decide whether a flatshare is possible at all,
-- while pets or food are things you can live around.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.overlap_fraction(
    -- Preference holder.
    h_pref_areas      text[],
    h_budget_min      integer,
    h_budget_max      integer,
    h_pref_flat_type  text[],
    h_flat_type       text,
    h_move_in         date,
    h_pref_gender     text,
    h_pref_age        text,
    h_pref_occupation text[],
    h_pref_food       text[],
    h_pref_pets       text[],
    h_pref_smoking    text,
    h_pref_drinking   text,
    -- Candidate being judged.
    c_areas           text[],
    c_pref_areas      text[],
    c_budget_min      integer,
    c_budget_max      integer,
    c_flat_type       text,
    c_pref_flat_type  text[],
    c_move_in         date,
    c_gender          text,
    c_age             integer,
    c_pref_occupation text[],
    c_pref_food       text[],
    c_pref_pets       text[],
    c_pref_smoking    text,
    c_pref_drinking   text
)
    RETURNS numeric
    LANGUAGE sql IMMUTABLE
    SET search_path = ''
AS $$
WITH side AS (
  SELECT
    -- Mirrors the JS fallbacks exactly: a stated preference wins, and the
    -- holder's own attribute stands in when they never stated one.
    COALESCE(NULLIF(h_pref_areas, '{}'), '{}')                                   AS h_areas,
    COALESCE(
      NULLIF(h_pref_flat_type, '{}'),
      CASE WHEN h_flat_type IS NOT NULL THEN ARRAY[h_flat_type] END,
      '{}'
    )                                                                            AS h_flats,
    COALESCE(NULLIF(c_pref_areas, '{}'), COALESCE(c_areas, '{}'))                AS c_areas_eff,
    COALESCE(
      CASE WHEN c_flat_type IS NOT NULL THEN ARRAY[c_flat_type] END,
      c_pref_flat_type,
      '{}'
    )                                                                            AS c_flats,
    -- '18_22' style buckets, unpacked to bounds. 35_plus has no upper bound.
    (CASE h_pref_age WHEN '18_22' THEN 18 WHEN '22_26' THEN 22 WHEN '26_30' THEN 26
                     WHEN '30_35' THEN 30 WHEN '35_plus' THEN 35 END)            AS age_lo,
    (CASE h_pref_age WHEN '18_22' THEN 22 WHEN '22_26' THEN 26 WHEN '26_30' THEN 30
                     WHEN '30_35' THEN 35 WHEN '35_plus' THEN 200 END)           AS age_hi
),
criteria AS (
  SELECT * FROM side, LATERAL (VALUES
    -- (weight, comparable on both sides?, do they agree?)
    (3.0, h_areas <> '{}' AND c_areas_eff <> '{}',
          h_areas && c_areas_eff),

    -- [0, 20000] is the budget slider's untouched default (BUDGET_MIN /
    -- BUDGET_DEFAULT_MAX in lib/prefs.js), not a stated preference — scoring it
    -- would credit or penalise a range the user never chose.
    (3.0, h_budget_min IS NOT NULL AND h_budget_max IS NOT NULL
          AND c_budget_min IS NOT NULL AND c_budget_max IS NOT NULL
          AND NOT (h_budget_min = 0 AND h_budget_max = 20000),
          h_budget_max >= c_budget_min AND c_budget_max >= h_budget_min),

    (2.0, h_flats <> '{}' AND c_flats <> '{}',
          h_flats && c_flats),

    -- Move-in is a precise date, so exact equality would essentially never
    -- match; anything inside MOVE_IN_TOLERANCE_DAYS counts as compatible.
    (2.0, h_move_in IS NOT NULL AND c_move_in IS NOT NULL,
          abs(h_move_in - c_move_in) <= 60),

    (2.0, h_pref_gender IS NOT NULL AND h_pref_gender <> 'any_gender' AND c_gender IS NOT NULL,
          public.gender_pref_admits(h_pref_gender, c_gender)),

    (1.5, age_lo IS NOT NULL AND c_age IS NOT NULL,
          c_age >= age_lo AND c_age <= age_hi),

    (1.0, h_pref_occupation <> '{}' AND c_pref_occupation <> '{}',
          h_pref_occupation && c_pref_occupation),
    (1.0, h_pref_food <> '{}' AND c_pref_food <> '{}',
          h_pref_food && c_pref_food),
    (1.0, h_pref_pets <> '{}' AND c_pref_pets <> '{}',
          h_pref_pets && c_pref_pets),
    (1.0, h_pref_smoking IS NOT NULL AND c_pref_smoking IS NOT NULL,
          h_pref_smoking = c_pref_smoking),
    (1.0, h_pref_drinking IS NOT NULL AND c_pref_drinking IS NOT NULL,
          h_pref_drinking = c_pref_drinking)
  ) AS v(weight, comparable, agrees)
)
SELECT CASE
         WHEN COALESCE(sum(weight) FILTER (WHERE comparable), 0) = 0 THEN NULL
         ELSE sum(weight) FILTER (WHERE comparable AND agrees)
              / sum(weight) FILTER (WHERE comparable)
       END
FROM criteria;
$$;

COMMENT ON FUNCTION public.overlap_fraction IS
  'Weighted fraction of mutually-set criteria that agree, or NULL when nothing is comparable. Mirrors calculateOverlapScore() in lib/prefs.js. Call twice with the arguments swapped for the reciprocal term.';


-- ----------------------------------------------------------------------------
-- feed_candidates(): one ranked, paginated page of the whole eligible pool.
--
-- SECURITY DEFINER for two reasons, both about reading things the caller must
-- not be handed directly: lat/lng (masked from the profiles view, returned here
-- only as a rounded distance) and other users' inbound like counts (the
-- exposure term — visible to nobody, including the profile it describes).
--
-- The caller is always the JWT subject; there is no user-id parameter, so this
-- cannot be pointed at someone else's feed.
-- ----------------------------------------------------------------------------

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
-- RETURNS TABLE declares `id`, `name`, `age`, `gender`, … as plpgsql variables,
-- and every one of them is also a column in the query below. The default
-- (`error`) turns any unqualified reference into "column reference is
-- ambiguous"; resolving to the column is what this query means everywhere it
-- happens. The RETURN QUERY output list is fully qualified regardless.
DECLARE
  v_uid text := (auth.jwt() ->> 'sub');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- A caller-supplied page size is still a page size: without a ceiling this is
  -- a "SELECT the entire user table" endpoint for anyone with a session.
  p_limit  := LEAST(GREATEST(COALESCE(p_limit, 40), 1), 100);
  p_offset := GREATEST(COALESCE(p_offset, 0), 0);

  RETURN QUERY
  WITH
  -- Every column is prefixed `my_`. `me.*` alongside `c.*` would collide on
  -- roughly a dozen names (id, gender, budget_min, …) and silently resolve to
  -- the wrong side — which for the two-sided scoring below means comparing a
  -- profile against itself.
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
  -- Inbound likes over the exposure window, one pass over the index rather
  -- than a correlated subquery per candidate.
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
      -- isFeedReady (lib/profileUtils.js): a nameless or photoless profile
      -- renders as an empty card, so it was never a candidate — it just used to
      -- be discarded after the client had already paid to fetch it.
      AND c.name IS NOT NULL AND btrim(c.name) <> ''
      AND c.photos IS NOT NULL AND array_length(c.photos, 1) >= 1
      -- Both halves of the gender rule (lib/prefs.js#genderPrefAdmits): mine
      -- about them, and theirs about me. The second is not a nicety — a like
      -- to someone whose preference excludes me is refused by like_profile(),
      -- so showing the card spends a swipe on a button that can only fail.
      AND public.gender_pref_admits(me.my_pref_gender, c.gender)
      AND public.gender_pref_admits(pp.pref_gender, me.my_gender)
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks_log b
        WHERE b.revoked_at IS NULL
          AND ((b.blocker_id = me.my_id AND b.blocked_id = c.id)
            OR (b.blocker_id = c.id AND b.blocked_id = me.my_id))
      )
      -- Already liked: the card is spent, and re-showing it invites a second
      -- like that uniquely violates uq_likes_active_pair.
      AND NOT EXISTS (
        SELECT 1 FROM public.likes_log lk
        WHERE lk.revoked_at IS NULL AND lk.from_user_id = me.my_id AND lk.to_user_id = c.id
      )
      AND (NOT p_exclude_viewed OR NOT EXISTS (
        SELECT 1 FROM public.profile_views pv
        WHERE pv.viewer_id = me.my_id AND pv.viewed_id = c.id
          AND pv.viewed_at >= public.app_today()
      ))
      AND (
        p_max_distance_km IS NULL
        OR c.geog IS NULL OR me.geog IS NULL
        -- ST_DWithin is the indexable form; the distance above is only computed
        -- for display, and would not use idx_profiles_geog on its own.
        OR extensions.ST_DWithin(c.geog, me.my_geog, p_max_distance_km * 1000.0)
      )
  ),
  scored AS (
    SELECT
      el.*,
      -- Holder = me, candidate = them.
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
      -- Same kernel, sides swapped: holder = them, candidate = me. How well do
      -- I satisfy THEIR stated preferences? A like they would never return is
      -- not a good candidate, however well they score on mine.
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
      -- An unscorable side is neutral (0.5), not zero — the same reasoning
      -- buildFeedOrder uses when it sorts a null overlap as mid-pack.
      (0.65 * COALESCE(sc.fwd, 0.5) + 0.35 * COALESCE(sc.rec, 0.5)) AS compat,
      CASE
        WHEN sc.dist_km IS NULL THEN 0.5
        -- Halves by ~5km: within a neighbourhood barely matters, across a city
        -- decides whether people actually meet.
        ELSE 1.0 / (1.0 + sc.dist_km / 5.0)
      END AS proximity,
      CASE
        WHEN sc.last_active_at IS NULL THEN 0.0
        ELSE 1.0 / (1.0 + EXTRACT(epoch FROM now() - sc.last_active_at) / 172800.0)
      END AS recency,
      -- Exposure damping, logarithmic so a popular profile is demoted rather
      -- than buried: 0 likes → 1.00, 5 → 0.53, 20 → 0.40, 100 → 0.30. Linear
      -- damping would make the top of everyone's feed unreachable for anyone
      -- who has ever been liked.
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
    -- The badge the card renders, on the same [OVERLAP_FLOOR, OVERLAP_CEIL]
    -- band lib/prefs.js uses: a literal 0% reads as "this person is worthless
    -- to you", and a literal 100% promises what the data can't back.
    CASE WHEN r.fwd IS NULL THEN NULL ELSE round(16 + r.fwd * 83)::integer END,
    CASE WHEN r.rec IS NULL THEN NULL ELSE round(16 + r.rec * 83)::integer END,
    round(r.dist_km, 1),
    round((0.60 * r.compat + 0.25 * r.proximity + 0.15 * r.recency) * r.exposure_factor, 6)
  FROM ranked r
  -- id breaks ties deterministically. Without it two equally-scored profiles
  -- can swap places between page 1 and page 2 and be shown twice, or neither.
  ORDER BY (0.60 * r.compat + 0.25 * r.proximity + 0.15 * r.recency) * r.exposure_factor DESC,
           r.id ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.feed_candidates(integer, integer, numeric, boolean) IS
  'One ranked, paginated page of the caller''s feed, scored over the whole eligible pool: compatibility (mine about them + theirs about me), PostGIS distance, recency, damped by the candidate''s recent inbound like volume.';

REVOKE ALL ON FUNCTION public.overlap_fraction FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.feed_candidates(integer, integer, numeric, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.overlap_fraction TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.feed_candidates(integer, integer, numeric, boolean) TO authenticated, service_role;
