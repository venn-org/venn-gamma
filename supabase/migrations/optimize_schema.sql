-- ============================================================
-- 1. Indexes — none exist beyond PKs today. These match actual
--    query patterns in feed.jsx, dailyLimits.js, blocks.js, etc.
-- ============================================================

-- Feed query: .eq('paused', false).eq('onboarding_done', true).eq('user_type', ...).order('last_active_at')
CREATE INDEX IF NOT EXISTS idx_profiles_feed
  ON public.profiles (user_type, paused, onboarding_done, last_active_at DESC)
  WHERE paused = false AND onboarding_done = true;

-- Array containment for area matching (pref_areas && theirAreas)
CREATE INDEX IF NOT EXISTS idx_profiles_pref_areas ON public.profiles USING gin (pref_areas);
CREATE INDEX IF NOT EXISTS idx_profiles_areas ON public.profiles USING gin (areas);

-- likes: canLikeToday / getRemainingLikes / duplicate check on insert
CREATE INDEX IF NOT EXISTS idx_likes_from_user ON public.likes (from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_to_user ON public.likes (to_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_likes_pair ON public.likes (from_user_id, to_user_id);

-- matches: real-time subscription filters + lookups by either side
CREATE INDEX IF NOT EXISTS idx_matches_user1 ON public.matches (user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON public.matches (user2_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_matches_pair
  ON public.matches (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));

-- messages: chat thread load + unread count
CREATE INDEX IF NOT EXISTS idx_messages_match ON public.messages (match_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages (match_id, read) WHERE read = false;

-- blocks: getBlockedIds(uid) checked on every feed fetch
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON public.blocks (blocker_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_blocks_pair ON public.blocks (blocker_id, blocked_id);

-- profile_views: getTodayViewedProfileIds(uid) — filtered by viewer + date range daily
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_date ON public.profile_views (viewer_id, viewed_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_profile_views_pair_day
  ON public.profile_views (viewer_id, viewed_id, ((timezone('utc', viewed_at))::date));

-- notifications: unread badge count per user
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC) WHERE read = false;

-- reports: moderation queue
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status, created_at DESC);


-- ============================================================
-- 2. Redundant/dead columns — three overlapping area fields
--    (areas, preferred_areas, pref_areas) exist only because
--    mapDbPrefsToUI() falls back across them for legacy rows.
--    Backfill once, then collapse to one.
-- ============================================================

UPDATE public.profiles
SET pref_areas = COALESCE(NULLIF(pref_areas, '{}'), NULLIF(preferred_areas, '{}'), NULLIF(areas, '{}'))
WHERE pref_areas IS NULL OR pref_areas = '{}';

-- Once lib/enums.js's mapDbPrefsToUI fallback is removed and the app
-- reads only pref_areas, drop the other two:
-- ALTER TABLE public.profiles DROP COLUMN areas;
-- ALTER TABLE public.profiles DROP COLUMN preferred_areas;

-- Same pattern: flat_type (single) vs pref_flat_type (array) — the
-- array is the one actually read by mapDbPrefsToUI's fallback.
-- Keep flat_type as "what this owner's flat is" and pref_flat_type as
-- "what a seeker wants" — these are semantically different, not
-- redundant. No action needed there.


-- ============================================================
-- 3. Location columns for city/zone matching (privacy-first flow)
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS zone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lng double precision;

CREATE INDEX IF NOT EXISTS idx_profiles_city_zone ON public.profiles (city, zone);

-- lat/lng are owner-only, backend-only (never rendered) — enforce that
-- boundary at the RLS layer, not just in app code:
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coords_private boolean NOT NULL DEFAULT true;

-- If you later add PostGIS for radius matching:
-- CREATE EXTENSION IF NOT EXISTS postgis;
-- ALTER TABLE public.profiles ADD COLUMN geog geography(Point, 4326)
--   GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED;
-- CREATE INDEX idx_profiles_geog ON public.profiles USING gist (geog);


-- ============================================================
-- 4. Constraints that are currently missing
-- ============================================================

-- likes/blocks/reports: a user acting on themselves is a bug, not data
ALTER TABLE public.likes ADD CONSTRAINT chk_likes_not_self CHECK (from_user_id <> to_user_id);
ALTER TABLE public.blocks ADD CONSTRAINT chk_blocks_not_self CHECK (blocker_id <> blocked_id);
ALTER TABLE public.reports ADD CONSTRAINT chk_reports_not_self CHECK (reporter_id <> reported_id);

-- budget_min/budget_max: min should never exceed max (edit-profile.jsx
-- already validates this client-side; enforce it server-side too)
ALTER TABLE public.profiles ADD CONSTRAINT chk_budget_range
  CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max);

-- age: sanity bound (profiles are user-editable via onboarding)
ALTER TABLE public.profiles ADD CONSTRAINT chk_age_range CHECK (age IS NULL OR (age >= 18 AND age <= 100));


-- ============================================================
-- 5. updated_at — every table has created_at, none have updated_at.
--    Profiles change constantly (edit-profile, prefs, photos) and
--    there's no way to tell when.
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 6. ON DELETE behavior — currently unspecified, defaults to
--    NO ACTION, meaning deleting a profile throws unless every
--    dependent row is deleted in application code first. The
--    "Delete Account" flow (rpc delete_account) needs this.
-- ============================================================

ALTER TABLE public.matches DROP CONSTRAINT matches_user1_id_fkey,
  ADD CONSTRAINT matches_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.matches DROP CONSTRAINT matches_user2_id_fkey,
  ADD CONSTRAINT matches_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages DROP CONSTRAINT messages_sender_id_fkey,
  ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.messages DROP CONSTRAINT messages_match_id_fkey,
  ADD CONSTRAINT messages_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;

ALTER TABLE public.likes DROP CONSTRAINT likes_from_user_id_fkey,
  ADD CONSTRAINT likes_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.likes DROP CONSTRAINT likes_to_user_id_fkey,
  ADD CONSTRAINT likes_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.blocks DROP CONSTRAINT blocks_blocker_id_fkey,
  ADD CONSTRAINT blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.blocks DROP CONSTRAINT blocks_blocked_id_fkey,
  ADD CONSTRAINT blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.notifications DROP CONSTRAINT notifications_user_id_fkey,
  ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.notifications DROP CONSTRAINT notifications_actor_id_fkey,
  ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.notifications DROP CONSTRAINT notifications_match_id_fkey,
  ADD CONSTRAINT notifications_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;

ALTER TABLE public.profile_views DROP CONSTRAINT profile_views_viewer_id_fkey,
  ADD CONSTRAINT profile_views_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.profile_views DROP CONSTRAINT profile_views_viewed_id_fkey,
  ADD CONSTRAINT profile_views_viewed_id_fkey FOREIGN KEY (viewed_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.push_subscriptions DROP CONSTRAINT push_subscriptions_user_id_fkey,
  ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- reports keep NO ACTION deliberately — moderation history should
-- survive account deletion. Leave reporter_id/reported_id as-is.
