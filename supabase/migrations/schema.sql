-- ============================================================================
-- Venn — Postgres schema (redesign)
-- ============================================================================
-- Snapshot of the desired end state. To apply, run the migration in
-- supabase/migrations/ instead of this file directly.
--
-- Design notes (see supabase/DESIGN.md for the full write-up):
--
-- 1. Enum values (gender, food habit, budget bracket, ...) used to be native
--    Postgres ENUM types. Adding/renaming/retiring an option required a
--    schema migration (ALTER TYPE ... ADD VALUE), and values could never be
--    removed. They're now rows in `option_values`, an admin-editable catalog
--    table — the columns on `profiles` stay plain `text` (exactly what the
--    client already reads/writes), validated at the application layer the
--    same way they always were (lib/enums.js). `option_values` is the single
--    source of truth for what's valid, its labels, and its display order —
--    an admin panel can manage it with plain INSERT/UPDATE, no deploy.
--
-- 2. `profiles` is split for admin-portal manageability into three real
--    tables — `profile_core` (identity + searchable fields), `profile_
--    lifestyle` (drink/tobacco/weed), `profile_preferences` ("what I'm
--    looking for") — joined by a `profiles` view so the client's existing
--    `select('*')` / embedded joins keep working unchanged. Writes are
--    fanned out by INSTEAD OF INSERT/UPDATE/DELETE triggers on the view.
--    This required one small client change: `hooks/useOnboarding.js` used
--    `.upsert()` on 'profiles', and PostgREST implements upsert as SQL
--    `INSERT ... ON CONFLICT DO UPDATE` — which Postgres cannot run against
--    a view (views have no index for the conflict check to target). Since
--    `lib/auth.js`'s `ensureProfile()` already inserts a bare row right
--    after signup, the row always exists by the time onboarding runs, so
--    the upsert was changed to a plain `.update()` — no functional change.
--
-- 3. Likes / matches / blocks now keep history instead of hard-deleting on
--    unlike / unmatch / unblock (for trust & safety review and analytics).
--    The real tables are `likes_log`, `matches_log`, `blocks_log`, each with
--    a soft-close column (`revoked_at` / `status`). The client still talks
--    to plain-named `likes` / `matches` / `blocks` — those are views over
--    the `_log` tables (`WHERE revoked_at IS NULL` / `WHERE status =
--    'active'`) with INSTEAD OF triggers so INSERT/DELETE from the client
--    keep working unchanged (soft-closing instead of physically deleting).
--    This is safe from the ON CONFLICT problem above because the client
--    never upserts these tables — only plain insert/select/delete.
--    Every view is created WITH (security_invoker = true) so RLS on the
--    underlying _log table is evaluated as the calling user, not the view
--    owner — omitting this would silently bypass RLS.
--
-- 4. `messages`, `notifications`, `profile_views` use bigint identity PKs
--    instead of uuid — cheaper (8 vs 16 bytes), sequential inserts avoid the
--    random-order btree page splits uuidv4 causes, and none of these ids are
--    used as unguessable secrets (RLS is the real access control). They are
--    also the tables most likely to need range-partitioning by created_at
--    once volume justifies it; a bigint PK makes that a mechanical follow-up
--    rather than a redesign.
--
-- 5. Dead/broken objects from the schema's history are removed:
--    `handle_new_user()` (a Supabase-Auth-era trigger function with no
--    trigger wired to it — the app uses Firebase Auth and inserts the
--    profile row client-side in lib/auth.js), and the original
--    `is_admin(uuid)` (its signature could never have worked — profiles.id
--    is text). `is_admin` is recreated with the correct `text` signature and
--    is now actually used, to let trust & safety review messages/matches
--    after a user has unmatched (see policies below). `notify_send_push()`
--    no longer has a webhook secret hardcoded in the function body — it
--    reads it from Supabase Vault instead.
-- ============================================================================


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

SET default_tablespace = '';
SET default_table_access_method = heap;


-- ============================================================================
-- Reference / lookup tables
-- ============================================================================

CREATE TABLE public.option_groups (
    key text PRIMARY KEY
);

CREATE TABLE public.option_values (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_key   text NOT NULL REFERENCES public.option_groups(key) ON DELETE CASCADE,
    code        text NOT NULL,
    label       text NOT NULL,
    sort_order  smallint NOT NULL DEFAULT 0,
    active      boolean NOT NULL DEFAULT true,
    UNIQUE (group_key, code)
);

CREATE INDEX idx_option_values_group ON public.option_values USING btree (group_key, sort_order) WHERE active;

CREATE TABLE public.cities (
    id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL UNIQUE,
    slug text NOT NULL UNIQUE
);


-- ============================================================================
-- Core: profile_core / profile_lifestyle / profile_preferences, joined by
-- the `profiles` view below. Split three ways for admin-portal manageability
-- — identity, lifestyle, and match preferences are separate concerns that
-- can be moderated/edited independently.
-- ============================================================================

CREATE TABLE public.profile_core (
    id                text NOT NULL PRIMARY KEY,           -- Firebase UID
    name              text,
    bio               text,
    pronouns          text[],
    birthday          date,
    age               integer,
    gender            text,                                 -- option_values group 'gender'
    user_type         text,                                 -- option_values group 'user_type'
    city              text,
    zone              text,
    areas             text[],
    lat               double precision,
    lng               double precision,
    coords_private    boolean NOT NULL DEFAULT true,
    budget_min        integer,
    budget_max        integer,
    budget            text,                                 -- option_values group 'budget'
    move_in_date      date,
    flat_type         text,                                 -- option_values group 'flat_type'
    photos            text[],
    prompts           jsonb NOT NULL DEFAULT '[]'::jsonb,
    job_company       text,
    job_title         text,
    education_school  text,
    education_level   text,
    onboarding_done   boolean NOT NULL DEFAULT false,
    verified          boolean NOT NULL DEFAULT false,
    paused            boolean NOT NULL DEFAULT false,
    is_admin          boolean NOT NULL DEFAULT false,
    last_active_at    timestamp with time zone,
    created_at        timestamp with time zone NOT NULL DEFAULT now(),
    updated_at        timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT chk_age_range CHECK (age IS NULL OR (age >= 18 AND age <= 100)),
    CONSTRAINT chk_budget_range CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max)
);

CREATE INDEX idx_profiles_feed ON public.profile_core USING btree (user_type, paused, onboarding_done, last_active_at DESC)
    WHERE (paused = false AND onboarding_done = true);
CREATE INDEX idx_profiles_city_zone ON public.profile_core USING btree (city, zone);
CREATE INDEX idx_profiles_areas ON public.profile_core USING gin (areas);
CREATE INDEX idx_profiles_gender ON public.profile_core USING btree (gender);
CREATE INDEX idx_profiles_budget ON public.profile_core USING btree (budget);


CREATE TABLE public.profile_lifestyle (
    profile_id  text PRIMARY KEY REFERENCES public.profile_core(id) ON DELETE CASCADE,
    drink       text,                                        -- option_values group 'lifestyle'
    tobacco     text,                                        -- option_values group 'lifestyle'
    weed        text                                         -- option_values group 'lifestyle'
);


CREATE TABLE public.profile_preferences (
    profile_id       text PRIMARY KEY REFERENCES public.profile_core(id) ON DELETE CASCADE,
    pref_role        text,                                    -- option_values group 'pref_role'
    pref_gender      text,                                    -- option_values group 'pref_gender'
    pref_age         text,                                    -- option_values group 'pref_age'
    pref_budget      text,                                    -- option_values group 'budget'
    pref_move_in     text,                                    -- option_values group 'move_in'
    pref_smoking     text,                                    -- option_values group 'smoking_pref'
    pref_drinking    text,                                    -- option_values group 'drinking_pref'
    pref_occupation  text[],                                  -- option_values group 'occupation'
    pref_food        text[],                                  -- option_values group 'food_habit'
    pref_pets        text[],                                  -- option_values group 'pets_pref'
    pref_flat_type   text[],                                  -- option_values group 'flat_type'
    pref_areas       text[]
);

CREATE INDEX idx_profile_prefs_areas ON public.profile_preferences USING gin (pref_areas);


-- Client-facing compatibility view: same flat column shape the app has
-- always read/written. security_invoker = true so RLS on the underlying
-- tables is evaluated as the calling user, not the view owner.
CREATE VIEW public.profiles WITH (security_invoker = true) AS
    SELECT
      c.id, c.name, c.bio, c.pronouns, c.birthday, c.age, c.gender, c.user_type,
      c.city, c.zone, c.areas, c.lat, c.lng, c.coords_private,
      c.budget_min, c.budget_max, c.budget, c.move_in_date, c.flat_type,
      c.photos, c.prompts, c.job_company, c.job_title, c.education_school, c.education_level,
      l.drink, l.tobacco, l.weed,
      p.pref_role, p.pref_gender, p.pref_age, p.pref_budget, p.pref_move_in,
      p.pref_smoking, p.pref_drinking, p.pref_occupation, p.pref_food, p.pref_pets,
      p.pref_flat_type, p.pref_areas,
      c.onboarding_done, c.verified, c.paused, c.is_admin, c.last_active_at,
      c.created_at, c.updated_at
    FROM public.profile_core c
    LEFT JOIN public.profile_lifestyle l ON l.profile_id = c.id
    LEFT JOIN public.profile_preferences p ON p.profile_id = c.id;


-- ============================================================================
-- Social graph — history-preserving (`_log` tables) with active-only,
-- client-facing views (`likes` / `matches` / `blocks`).
-- ============================================================================

CREATE TABLE public.likes_log (
    id            uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    from_user_id  text NOT NULL REFERENCES public.profile_core(id) ON DELETE CASCADE,
    to_user_id    text NOT NULL REFERENCES public.profile_core(id) ON DELETE CASCADE,
    comment       text,
    created_at    timestamp with time zone NOT NULL DEFAULT now(),
    revoked_at    timestamp with time zone,
    CONSTRAINT chk_likes_not_self CHECK (from_user_id <> to_user_id)
);

CREATE UNIQUE INDEX uq_likes_active_pair ON public.likes_log USING btree (from_user_id, to_user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_likes_to_user_active ON public.likes_log USING btree (to_user_id, created_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX idx_likes_from_user ON public.likes_log USING btree (from_user_id, created_at DESC);

CREATE VIEW public.likes WITH (security_invoker = true) AS
    SELECT id, from_user_id, to_user_id, comment, created_at
    FROM public.likes_log
    WHERE revoked_at IS NULL;


CREATE TABLE public.matches_log (
    id             uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user1_id       text REFERENCES public.profile_core(id) ON DELETE CASCADE,
    user2_id       text REFERENCES public.profile_core(id) ON DELETE CASCADE,
    status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unmatched')),
    created_at     timestamp with time zone DEFAULT now(),
    unmatched_at   timestamp with time zone,
    unmatched_by   text REFERENCES public.profile_core(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_matches_active_pair ON public.matches_log USING btree (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id)) WHERE status = 'active';
CREATE INDEX idx_matches_user1 ON public.matches_log USING btree (user1_id);
CREATE INDEX idx_matches_user2 ON public.matches_log USING btree (user2_id);

CREATE VIEW public.matches WITH (security_invoker = true) AS
    SELECT id, user1_id, user2_id, created_at
    FROM public.matches_log
    WHERE status = 'active';


CREATE TABLE public.blocks_log (
    id           uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    blocker_id   text NOT NULL REFERENCES public.profile_core(id) ON DELETE CASCADE,
    blocked_id   text NOT NULL REFERENCES public.profile_core(id) ON DELETE CASCADE,
    created_at   timestamp with time zone NOT NULL DEFAULT now(),
    revoked_at   timestamp with time zone,
    CONSTRAINT chk_blocks_not_self CHECK (blocker_id <> blocked_id)
);

CREATE UNIQUE INDEX uq_blocks_active_pair ON public.blocks_log USING btree (blocker_id, blocked_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_blocks_blocker_active ON public.blocks_log USING btree (blocker_id) WHERE revoked_at IS NULL;

CREATE VIEW public.blocks WITH (security_invoker = true) AS
    SELECT id, blocker_id, blocked_id, created_at
    FROM public.blocks_log
    WHERE revoked_at IS NULL;


-- ============================================================================
-- Messaging / notifications / activity — high-volume, append-mostly tables.
-- ============================================================================

CREATE TABLE public.messages (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    match_id    uuid REFERENCES public.matches_log(id) ON DELETE CASCADE,
    sender_id   text REFERENCES public.profile_core(id) ON DELETE CASCADE,
    content     text NOT NULL,
    read        boolean NOT NULL DEFAULT false,
    created_at  timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_messages_match ON public.messages USING btree (match_id, created_at);
CREATE INDEX idx_messages_unread ON public.messages USING btree (match_id, read) WHERE (read = false);


CREATE TABLE public.notifications (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     text NOT NULL REFERENCES public.profile_core(id) ON DELETE CASCADE,
    type        text NOT NULL CHECK (type IN ('like', 'match', 'message')),
    actor_id    text REFERENCES public.profile_core(id) ON DELETE SET NULL,
    match_id    uuid REFERENCES public.matches_log(id) ON DELETE CASCADE,
    content     text,
    read        boolean NOT NULL DEFAULT false,
    created_at  timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, created_at DESC) WHERE (read = false);


CREATE TABLE public.profile_views (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    viewer_id   text NOT NULL REFERENCES public.profile_core(id) ON DELETE CASCADE,
    viewed_id   text NOT NULL REFERENCES public.profile_core(id) ON DELETE CASCADE,
    viewed_at   timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_profile_views_pair_day ON public.profile_views USING btree (viewer_id, viewed_id, ((timezone('utc'::text, viewed_at))::date));
CREATE INDEX idx_profile_views_viewer_date ON public.profile_views USING btree (viewer_id, viewed_at DESC);


CREATE TABLE public.reports (
    id                uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    reporter_id       text NOT NULL REFERENCES public.profile_core(id),
    reported_id       text NOT NULL REFERENCES public.profile_core(id),
    reason            text NOT NULL,
    details           text,
    status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
    moderator_notes   text,
    created_at        timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT chk_reports_not_self CHECK (reporter_id <> reported_id)
);

CREATE INDEX idx_reports_status ON public.reports USING btree (status, created_at DESC);


CREATE TABLE public.push_subscriptions (
    id          uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id     text NOT NULL REFERENCES public.profile_core(id) ON DELETE CASCADE,
    endpoint    text NOT NULL UNIQUE,
    p256dh      text NOT NULL,
    auth        text NOT NULL,
    created_at  timestamp with time zone NOT NULL DEFAULT now()
);


-- ============================================================================
-- waitlist — untouched
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.waitlist (
    email text NOT NULL PRIMARY KEY
);

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_unique ON public.waitlist USING btree (email);


-- ============================================================================
-- Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fires on likes_log (the real table) regardless of whether the insert came
-- in directly or via the `likes` view's INSTEAD OF trigger.
CREATE OR REPLACE FUNCTION public.create_match_on_mutual_like() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  m_id uuid;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.likes_log
    WHERE from_user_id = NEW.to_user_id
      AND to_user_id   = NEW.from_user_id
      AND revoked_at IS NULL
  ) THEN
    INSERT INTO public.matches_log (user1_id, user2_id)
    VALUES (LEAST(NEW.from_user_id, NEW.to_user_id), GREATEST(NEW.from_user_id, NEW.to_user_id))
    ON CONFLICT (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id)) WHERE status = 'active' DO NOTHING
    RETURNING id INTO m_id;

    IF m_id IS NULL THEN
      SELECT id INTO m_id FROM public.matches_log
        WHERE LEAST(user1_id, user2_id) = LEAST(NEW.from_user_id, NEW.to_user_id)
          AND GREATEST(user1_id, user2_id) = GREATEST(NEW.from_user_id, NEW.to_user_id)
          AND status = 'active';
    END IF;

    INSERT INTO public.notifications (user_id, type, actor_id, match_id)
    VALUES (NEW.to_user_id, 'match', NEW.from_user_id, m_id);
    INSERT INTO public.notifications (user_id, type, actor_id, match_id)
    VALUES (NEW.from_user_id, 'match', NEW.to_user_id, m_id);
  ELSE
    INSERT INTO public.notifications (user_id, type, actor_id)
    VALUES (NEW.to_user_id, 'like', NEW.from_user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  recipient text;
BEGIN
  SELECT CASE WHEN user1_id = NEW.sender_id THEN user2_id ELSE user1_id END
    INTO recipient
  FROM public.matches_log WHERE id = NEW.match_id;

  IF recipient IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, actor_id, match_id, content)
    VALUES (recipient, 'message', NEW.sender_id, NEW.match_id, NEW.content);
  END IF;
  RETURN NEW;
END;
$$;

-- Reads the push webhook secret from Supabase Vault instead of a literal in
-- the function body (the previous version had it hardcoded in source).
-- Create the secret once with:
--   select vault.create_secret('<value>', 'push_webhook_secret');
CREATE OR REPLACE FUNCTION public.notify_send_push() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'net', 'vault'
    AS $$
DECLARE
  webhook_secret text;
BEGIN
  SELECT decrypted_secret INTO webhook_secret
    FROM vault.decrypted_secrets WHERE name = 'push_webhook_secret';

  PERFORM net.http_post(
    url := 'https://iahnrlgeivjzmzzqloan.supabase.co/functions/v1/send-push',
    body := jsonb_build_object('type', 'INSERT', 'table', 'notifications', 'record', to_jsonb(NEW)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.dismiss_like(p_like_id uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.likes_log SET revoked_at = now()
    WHERE id = p_like_id AND to_user_id = (auth.jwt() ->> 'sub') AND revoked_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.get_blocked_pair_ids() RETURNS TABLE(user_id text)
    LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT blocked_id FROM public.blocks_log WHERE blocker_id = (auth.jwt() ->> 'sub') AND revoked_at IS NULL
  UNION
  SELECT blocker_id FROM public.blocks_log WHERE blocked_id = (auth.jwt() ->> 'sub') AND revoked_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.delete_account() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  DELETE FROM storage.objects
    WHERE bucket_id = 'photos'
      AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub');
  DELETE FROM public.profile_core WHERE id = (auth.jwt() ->> 'sub');
END;
$$;

-- Recreated with the correct signature (profiles.id is text, not uuid — the
-- previous version could never have matched a real row) and now actually
-- used, by the RLS policies below, to let trust & safety review a match's
-- messages after the pair has unmatched.
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profile_core WHERE id = p_user_id), false);
$$;

-- `profiles` view: INSTEAD OF INSERT/UPDATE/DELETE, fanning writes out across
-- profile_core / profile_lifestyle / profile_preferences. Only plain
-- insert/update/delete are ever used against 'profiles' by the client (see
-- design note #2 above) — no ON CONFLICT involved, so this is safe.
--
-- profile_core's SELECT policy is deliberately public (anyone can browse any
-- profile), while its INSERT/UPDATE/DELETE policies are owner-only. Because
-- the view's row-matching for UPDATE/DELETE goes through that public SELECT
-- policy, a non-owner's statement would still match the row and fire this
-- trigger — and since Postgres reports the INSTEAD OF trigger's invocation
-- count as the "rows affected" for the statement, the inner writes silently
-- no-op'ing under profile_core/profile_lifestyle/profile_preferences' own
-- RLS would otherwise look like a false success (row echoed back via
-- RETURNING as if the write landed). Each trigger below re-checks ownership
-- explicitly and raises instead of allowing that silent no-op — except for
-- roles with BYPASSRLS (service_role, the migration owner), which an admin
-- portal or backend job legitimately needs to write any profile.
CREATE OR REPLACE FUNCTION public.current_role_bypasses_rls() RETURNS boolean
    LANGUAGE sql STABLE AS $$
  SELECT COALESCE((SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user), false);
$$;

CREATE OR REPLACE FUNCTION public.profiles_view_insert() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
  IF NOT public.current_role_bypasses_rls() AND (auth.jwt() ->> 'sub') IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.profile_core (
    id, name, bio, pronouns, birthday, age, gender, user_type, city, zone, areas,
    lat, lng, coords_private, budget_min, budget_max, budget, move_in_date, flat_type,
    photos, prompts, job_company, job_title, education_school, education_level,
    onboarding_done, verified, paused, is_admin, last_active_at
  ) VALUES (
    NEW.id, NEW.name, NEW.bio, NEW.pronouns, NEW.birthday, NEW.age, NEW.gender, NEW.user_type,
    NEW.city, NEW.zone, NEW.areas, NEW.lat, NEW.lng, COALESCE(NEW.coords_private, true),
    NEW.budget_min, NEW.budget_max, NEW.budget, NEW.move_in_date, NEW.flat_type,
    NEW.photos, COALESCE(NEW.prompts, '[]'::jsonb), NEW.job_company, NEW.job_title,
    NEW.education_school, NEW.education_level,
    COALESCE(NEW.onboarding_done, false), COALESCE(NEW.verified, false),
    COALESCE(NEW.paused, false), COALESCE(NEW.is_admin, false), NEW.last_active_at
  )
  RETURNING id, created_at, updated_at INTO NEW.id, NEW.created_at, NEW.updated_at;

  INSERT INTO public.profile_lifestyle (profile_id, drink, tobacco, weed)
  VALUES (NEW.id, NEW.drink, NEW.tobacco, NEW.weed);

  INSERT INTO public.profile_preferences (
    profile_id, pref_role, pref_gender, pref_age, pref_budget, pref_move_in,
    pref_smoking, pref_drinking, pref_occupation, pref_food, pref_pets, pref_flat_type, pref_areas
  ) VALUES (
    NEW.id, NEW.pref_role, NEW.pref_gender, NEW.pref_age, NEW.pref_budget, NEW.pref_move_in,
    NEW.pref_smoking, NEW.pref_drinking, NEW.pref_occupation, NEW.pref_food, NEW.pref_pets,
    NEW.pref_flat_type, NEW.pref_areas
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.profiles_view_update() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
  IF NOT public.current_role_bypasses_rls() AND (auth.jwt() ->> 'sub') IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profile_core SET
    name = NEW.name, bio = NEW.bio, pronouns = NEW.pronouns, birthday = NEW.birthday, age = NEW.age,
    gender = NEW.gender, user_type = NEW.user_type, city = NEW.city, zone = NEW.zone, areas = NEW.areas,
    lat = NEW.lat, lng = NEW.lng, coords_private = NEW.coords_private,
    budget_min = NEW.budget_min, budget_max = NEW.budget_max, budget = NEW.budget,
    move_in_date = NEW.move_in_date, flat_type = NEW.flat_type, photos = NEW.photos, prompts = NEW.prompts,
    job_company = NEW.job_company, job_title = NEW.job_title,
    education_school = NEW.education_school, education_level = NEW.education_level,
    onboarding_done = NEW.onboarding_done, verified = NEW.verified, paused = NEW.paused,
    is_admin = NEW.is_admin, last_active_at = NEW.last_active_at
  WHERE id = OLD.id
  RETURNING updated_at INTO NEW.updated_at;

  UPDATE public.profile_lifestyle SET drink = NEW.drink, tobacco = NEW.tobacco, weed = NEW.weed
  WHERE profile_id = OLD.id;

  UPDATE public.profile_preferences SET
    pref_role = NEW.pref_role, pref_gender = NEW.pref_gender, pref_age = NEW.pref_age,
    pref_budget = NEW.pref_budget, pref_move_in = NEW.pref_move_in, pref_smoking = NEW.pref_smoking,
    pref_drinking = NEW.pref_drinking, pref_occupation = NEW.pref_occupation, pref_food = NEW.pref_food,
    pref_pets = NEW.pref_pets, pref_flat_type = NEW.pref_flat_type, pref_areas = NEW.pref_areas
  WHERE profile_id = OLD.id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.profiles_view_delete() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
  IF NOT public.current_role_bypasses_rls() AND (auth.jwt() ->> 'sub') IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.profile_core WHERE id = OLD.id; -- cascades to lifestyle/preferences and everything else
  RETURN OLD;
END;
$$;

-- `likes` view: INSTEAD OF INSERT/DELETE, so client insert/delete against
-- the view fan through to a real insert / soft-revoke on likes_log.
CREATE OR REPLACE FUNCTION public.likes_view_insert() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.likes_log (from_user_id, to_user_id, comment)
  VALUES (NEW.from_user_id, NEW.to_user_id, NEW.comment)
  RETURNING id, created_at INTO NEW.id, NEW.created_at;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.likes_view_delete() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.likes_log SET revoked_at = now() WHERE id = OLD.id AND revoked_at IS NULL;
  RETURN OLD;
END;
$$;

-- `matches` view: INSTEAD OF DELETE only — matches are only ever created by
-- create_match_on_mutual_like(), never inserted by the client.
CREATE OR REPLACE FUNCTION public.matches_view_delete() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.matches_log
    SET status = 'unmatched', unmatched_at = now(), unmatched_by = (auth.jwt() ->> 'sub')
    WHERE id = OLD.id AND status = 'active';
  RETURN OLD;
END;
$$;

-- `blocks` view: INSTEAD OF INSERT/DELETE, same pattern as likes.
CREATE OR REPLACE FUNCTION public.blocks_view_insert() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.blocks_log (blocker_id, blocked_id)
  VALUES (NEW.blocker_id, NEW.blocked_id)
  ON CONFLICT (blocker_id, blocked_id) WHERE revoked_at IS NULL DO NOTHING
  RETURNING id, created_at INTO NEW.id, NEW.created_at;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.blocks_view_delete() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.blocks_log SET revoked_at = now() WHERE id = OLD.id AND revoked_at IS NULL;
  RETURN OLD;
END;
$$;


-- ============================================================================
-- Triggers
-- ============================================================================

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profile_core
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_mutual_like AFTER INSERT ON public.likes_log
    FOR EACH ROW EXECUTE FUNCTION public.create_match_on_mutual_like();

CREATE TRIGGER trg_notify_message AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();

CREATE TRIGGER trg_notify_send_push AFTER INSERT ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.notify_send_push();

CREATE TRIGGER trg_profiles_view_insert INSTEAD OF INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.profiles_view_insert();
CREATE TRIGGER trg_profiles_view_update INSTEAD OF UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.profiles_view_update();
CREATE TRIGGER trg_profiles_view_delete INSTEAD OF DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.profiles_view_delete();

CREATE TRIGGER trg_likes_view_insert INSTEAD OF INSERT ON public.likes
    FOR EACH ROW EXECUTE FUNCTION public.likes_view_insert();
CREATE TRIGGER trg_likes_view_delete INSTEAD OF DELETE ON public.likes
    FOR EACH ROW EXECUTE FUNCTION public.likes_view_delete();

CREATE TRIGGER trg_matches_view_delete INSTEAD OF DELETE ON public.matches
    FOR EACH ROW EXECUTE FUNCTION public.matches_view_delete();

CREATE TRIGGER trg_blocks_view_insert INSTEAD OF INSERT ON public.blocks
    FOR EACH ROW EXECUTE FUNCTION public.blocks_view_insert();
CREATE TRIGGER trg_blocks_view_delete INSTEAD OF DELETE ON public.blocks
    FOR EACH ROW EXECUTE FUNCTION public.blocks_view_delete();


-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE public.option_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY option_groups_select ON public.option_groups FOR SELECT USING (true);

ALTER TABLE public.option_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY option_values_select ON public.option_values FOR SELECT USING (true);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY cities_select ON public.cities FOR SELECT USING (true);

ALTER TABLE public.profile_core ENABLE ROW LEVEL SECURITY;
CREATE POLICY profile_core_select ON public.profile_core FOR SELECT USING ((auth.jwt() ->> 'sub') IS NOT NULL);
CREATE POLICY profile_core_insert_own ON public.profile_core FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = id);
CREATE POLICY profile_core_update_own ON public.profile_core FOR UPDATE USING ((auth.jwt() ->> 'sub') = id) WITH CHECK ((auth.jwt() ->> 'sub') = id);
CREATE POLICY profile_core_delete_own ON public.profile_core FOR DELETE USING ((auth.jwt() ->> 'sub') = id);

ALTER TABLE public.profile_lifestyle ENABLE ROW LEVEL SECURITY;
CREATE POLICY profile_lifestyle_select ON public.profile_lifestyle FOR SELECT USING ((auth.jwt() ->> 'sub') IS NOT NULL);
CREATE POLICY profile_lifestyle_insert_own ON public.profile_lifestyle FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = profile_id);
CREATE POLICY profile_lifestyle_update_own ON public.profile_lifestyle FOR UPDATE USING ((auth.jwt() ->> 'sub') = profile_id) WITH CHECK ((auth.jwt() ->> 'sub') = profile_id);

ALTER TABLE public.profile_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY profile_preferences_select ON public.profile_preferences FOR SELECT USING ((auth.jwt() ->> 'sub') IS NOT NULL);
CREATE POLICY profile_preferences_insert_own ON public.profile_preferences FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = profile_id);
CREATE POLICY profile_preferences_update_own ON public.profile_preferences FOR UPDATE USING ((auth.jwt() ->> 'sub') = profile_id) WITH CHECK ((auth.jwt() ->> 'sub') = profile_id);

ALTER TABLE public.likes_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY likes_log_select ON public.likes_log FOR SELECT USING ((auth.jwt() ->> 'sub') = from_user_id OR (auth.jwt() ->> 'sub') = to_user_id);
CREATE POLICY likes_log_insert ON public.likes_log FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = from_user_id);
CREATE POLICY likes_log_update ON public.likes_log FOR UPDATE
    USING ((auth.jwt() ->> 'sub') = from_user_id OR (auth.jwt() ->> 'sub') = to_user_id)
    WITH CHECK ((auth.jwt() ->> 'sub') = from_user_id OR (auth.jwt() ->> 'sub') = to_user_id);

ALTER TABLE public.matches_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY matches_log_select ON public.matches_log FOR SELECT USING ((auth.jwt() ->> 'sub') = user1_id OR (auth.jwt() ->> 'sub') = user2_id);
CREATE POLICY matches_log_update ON public.matches_log FOR UPDATE
    USING ((auth.jwt() ->> 'sub') = user1_id OR (auth.jwt() ->> 'sub') = user2_id)
    WITH CHECK ((auth.jwt() ->> 'sub') = user1_id OR (auth.jwt() ->> 'sub') = user2_id);

ALTER TABLE public.blocks_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY blocks_log_select ON public.blocks_log FOR SELECT USING ((auth.jwt() ->> 'sub') = blocker_id);
CREATE POLICY blocks_log_insert ON public.blocks_log FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = blocker_id);
CREATE POLICY blocks_log_update ON public.blocks_log FOR UPDATE USING ((auth.jwt() ->> 'sub') = blocker_id) WITH CHECK ((auth.jwt() ->> 'sub') = blocker_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_select ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.matches_log m WHERE m.id = messages.match_id
    AND (m.user1_id = (auth.jwt() ->> 'sub') OR m.user2_id = (auth.jwt() ->> 'sub')) AND m.status = 'active')
  OR public.is_admin((auth.jwt() ->> 'sub'))
);
CREATE POLICY messages_insert ON public.messages FOR INSERT WITH CHECK (
  (auth.jwt() ->> 'sub') = sender_id
  AND EXISTS (SELECT 1 FROM public.matches_log m WHERE m.id = messages.match_id
    AND (m.user1_id = (auth.jwt() ->> 'sub') OR m.user2_id = (auth.jwt() ->> 'sub')) AND m.status = 'active')
  AND NOT EXISTS (
    SELECT 1 FROM public.matches_log m
    JOIN public.blocks_log b ON (b.blocker_id = m.user1_id AND b.blocked_id = m.user2_id)
                              OR (b.blocker_id = m.user2_id AND b.blocked_id = m.user1_id)
    WHERE m.id = messages.match_id AND b.revoked_at IS NULL
  )
);
CREATE POLICY messages_update_read ON public.messages FOR UPDATE
  USING (sender_id <> (auth.jwt() ->> 'sub') AND EXISTS (SELECT 1 FROM public.matches_log m WHERE m.id = messages.match_id
    AND (m.user1_id = (auth.jwt() ->> 'sub') OR m.user2_id = (auth.jwt() ->> 'sub'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.matches_log m WHERE m.id = messages.match_id
    AND (m.user1_id = (auth.jwt() ->> 'sub') OR m.user2_id = (auth.jwt() ->> 'sub'))));
CREATE POLICY messages_delete ON public.messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.matches_log m WHERE m.id = messages.match_id
    AND (m.user1_id = (auth.jwt() ->> 'sub') OR m.user2_id = (auth.jwt() ->> 'sub')))
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_select_own ON public.notifications FOR SELECT USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE USING ((auth.jwt() ->> 'sub') = user_id) WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY profile_views_insert ON public.profile_views FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = viewer_id);
CREATE POLICY profile_views_select_own ON public.profile_views FOR SELECT USING ((auth.jwt() ->> 'sub') = viewer_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY reports_insert ON public.reports FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = reporter_id);
CREATE POLICY reports_select_own ON public.reports FOR SELECT USING ((auth.jwt() ->> 'sub') = reporter_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY push_subscriptions_select_own ON public.push_subscriptions FOR SELECT USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY push_subscriptions_insert_own ON public.push_subscriptions FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY push_subscriptions_update_own ON public.push_subscriptions FOR UPDATE USING ((auth.jwt() ->> 'sub') = user_id) WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY push_subscriptions_delete_own ON public.push_subscriptions FOR DELETE USING ((auth.jwt() ->> 'sub') = user_id);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_insert_only ON public.waitlist FOR INSERT TO anon WITH CHECK (true);


-- ============================================================================
-- Storage policies (bucket: photos)
-- ============================================================================

CREATE POLICY "users upload own photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'photos' AND (auth.jwt() ->> 'sub') = (storage.foldername(name))[1]);
CREATE POLICY "photos are public" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "users can delete own photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'photos' AND (auth.jwt() ->> 'sub') = (storage.foldername(name))[1]);


-- ============================================================================
-- Realtime
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.likes_log;
ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.matches_log;


-- ============================================================================
-- Grants
-- ============================================================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON TABLE public.option_groups, public.option_values, public.cities TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profile_core, public.profile_lifestyle, public.profile_preferences TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.likes_log, public.matches_log, public.blocks_log TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.likes, public.matches, public.blocks TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.messages, public.notifications, public.profile_views, public.reports, public.push_subscriptions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.waitlist TO anon, authenticated, service_role;

GRANT ALL ON FUNCTION public.set_updated_at() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.create_match_on_mutual_like() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.notify_on_message() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.notify_send_push() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.dismiss_like(uuid) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_blocked_pair_ids() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.is_admin(text) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.current_role_bypasses_rls() TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.delete_account() FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_account() TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;


-- ============================================================================
-- Seed data — option_values (copied 1:1 from the previous ENUM types so
-- lib/enums.js needs no changes) and a starting city.
-- ============================================================================

INSERT INTO public.option_groups (key) VALUES
  ('gender'), ('user_type'), ('lifestyle'), ('pref_role'), ('pref_gender'), ('pref_age'),
  ('budget'), ('move_in'), ('flat_type'), ('occupation'), ('food_habit'),
  ('smoking_pref'), ('drinking_pref'), ('pets_pref'), ('notification_type');

INSERT INTO public.option_values (group_key, code, label, sort_order) VALUES
  ('gender', 'man', 'Man', 1),
  ('gender', 'woman', 'Woman', 2),
  ('gender', 'non_binary', 'Non-binary', 3),
  ('gender', 'prefer_not_to_say', 'Prefer not to say', 4),

  ('user_type', 'seeking', 'Seeking', 1),
  ('user_type', 'owner', 'Owner', 2),

  ('lifestyle', 'yes', 'Yes', 1),
  ('lifestyle', 'sometimes', 'Sometimes', 2),
  ('lifestyle', 'no', 'No', 3),
  ('lifestyle', 'prefer_not_to_say', 'Prefer not to say', 4),

  ('pref_role', 'seeking', 'Looking for a flat', 1),
  ('pref_role', 'owner', 'Have a flat / room', 2),

  ('pref_gender', 'women_only', 'Women only', 1),
  ('pref_gender', 'men_only', 'Men only', 2),
  ('pref_gender', 'any_gender', 'Any gender', 3),

  ('pref_age', '18_22', '18-22', 1),
  ('pref_age', '22_26', '22-26', 2),
  ('pref_age', '26_30', '26-30', 3),
  ('pref_age', '30_35', '30-35', 4),
  ('pref_age', '35_plus', '35+', 5),
  ('pref_age', 'flexible', 'Flexible', 6),

  ('budget', 'under_10k', 'Under 10k', 1),
  ('budget', '10k_20k', '10k-20k', 2),
  ('budget', '20k_35k', '20k-35k', 3),
  ('budget', '35k_50k', '35k-50k', 4),
  ('budget', '50k_plus', '50k+', 5),

  ('move_in', 'asap', 'ASAP', 1),
  ('move_in', 'jul_2026', 'Jul 2026', 2),
  ('move_in', 'aug_2026', 'Aug 2026', 3),
  ('move_in', 'sep_2026', 'Sep 2026', 4),
  ('move_in', 'oct_2026', 'Oct 2026', 5),
  ('move_in', 'flexible', 'Flexible', 6),

  ('flat_type', '1_bhk', '1 BHK', 1),
  ('flat_type', '2_bhk', '2 BHK', 2),
  ('flat_type', '3_bhk', '3 BHK', 3),
  ('flat_type', 'studio', 'Studio', 4),
  ('flat_type', 'private_room', 'Private room', 5),
  ('flat_type', 'shared_room', 'Shared room', 6),
  ('flat_type', 'pg', 'PG', 7),

  ('occupation', 'working_professional', 'Working professional', 1),
  ('occupation', 'student', 'Student', 2),
  ('occupation', 'freelancer', 'Freelancer', 3),
  ('occupation', 'entrepreneur', 'Entrepreneur', 4),

  ('food_habit', 'veg_only', 'Veg only', 1),
  ('food_habit', 'eggetarian_ok', 'Eggetarian ok', 2),
  ('food_habit', 'non_veg_ok', 'Non-veg ok', 3),
  ('food_habit', 'vegan_only', 'Vegan only', 4),

  ('smoking_pref', 'non_smoker', 'Non-smoker', 1),
  ('smoking_pref', 'smoker_ok', 'Smoker ok', 2),
  ('smoking_pref', 'outside_only', 'Outside only', 3),

  ('drinking_pref', 'teetotaller_only', 'Teetotaller only', 1),
  ('drinking_pref', 'social_drinker_ok', 'Social drinker ok', 2),
  ('drinking_pref', 'fine_with_drinking', 'Fine with drinking', 3),

  ('pets_pref', 'have_pet', 'I have a pet', 1),
  ('pets_pref', 'fine_with_pets', 'Fine with pets', 2),
  ('pets_pref', 'no_pets', 'No pets please', 3),
  ('pets_pref', 'allergic', 'Allergic', 4),

  ('notification_type', 'like', 'Like', 1),
  ('notification_type', 'match', 'Match', 2),
  ('notification_type', 'message', 'Message', 3);

INSERT INTO public.cities (name, slug) VALUES ('Bangalore', 'bangalore');
