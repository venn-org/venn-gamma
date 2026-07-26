-- ============================================================================
-- Security hardening. Addresses, in order:
--   1. Privilege escalation — is_admin/verified were self-writable through the
--      `profiles` view, and is_admin grants read access to every message.
--   2. Message tampering — messages_update_read was an unrestricted UPDATE, so
--      either party could rewrite the other's message text.
--   3. Message destruction after unmatch — messages_delete had no status check.
--   4. search_path regression on profiles_view_insert() (clobbered by
--      20260726120000's CREATE OR REPLACE).
--   5. coords_private was never enforced — exact GPS + birthday were readable
--      by any signed-in user.
--   6. reports FKs were NO ACTION, so delete_account() failed once a user was
--      party to a report; and nobody could read reports for review.
--   7. delete_account() left the auth.users row behind, so "permanently
--      delete" wasn't permanent.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Privilege escalation: is_admin / verified are moderation flags, not
--    profile fields. The view's INSTEAD OF triggers copied them straight from
--    NEW, and RLS on profile_core is row-scoped (not column-scoped), so
--    `update({ is_admin: true }).eq('id', myUid)` was a valid self-promotion —
--    and is_admin grants SELECT on every row of `messages`.
--
--    Two independent paths had to be closed, because profile_core is granted
--    to `authenticated` directly, not just through the view:
--
--      a) via the `profiles` view    -> the INSTEAD OF triggers below now
--                                       refuse to write either flag unless the
--                                       caller is a BYPASSRLS role.
--      b) via profile_core directly  -> column-level INSERT/UPDATE grants.
--
--    Column grants only take effect once the table-wide grant is removed (a
--    column-level REVOKE against a table-level GRANT is a no-op in Postgres),
--    hence the REVOKE-then-GRANT below. SELECT/DELETE are left table-wide.
--
--    Note the triggers are *not* SECURITY DEFINER — that's deliberate, it's
--    what makes profile_core's RLS evaluate as the calling user. Consequently
--    they run under these same column grants, so they must not name is_admin
--    or verified in an ordinary user's statement at all. Omitting a column
--    from an INSERT takes its DEFAULT (false); omitting it from an UPDATE
--    leaves it untouched — which is exactly the semantics we want.
-- ----------------------------------------------------------------------------

REVOKE INSERT, UPDATE ON public.profile_core FROM anon, authenticated;

GRANT INSERT (
  id, name, bio, location, pronouns, birthday, age, gender, user_type,
  city, zone, areas, lat, lng, coords_private, budget_min, budget_max, budget,
  move_in_date, flat_type, photos, prompts, job_company, job_title,
  education_school, education_level, onboarding_done, paused, last_active_at
) ON public.profile_core TO authenticated;

GRANT UPDATE (
  name, bio, location, pronouns, birthday, age, gender, user_type,
  city, zone, areas, lat, lng, coords_private, budget_min, budget_max, budget,
  move_in_date, flat_type, photos, prompts, job_company, job_title,
  education_school, education_level, onboarding_done, paused, last_active_at
) ON public.profile_core TO authenticated;

CREATE OR REPLACE FUNCTION public.profiles_view_insert() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = ''          -- re-applied; 20260726120000 dropped it
    AS $$
DECLARE
  v_created_at timestamptz;
  v_updated_at timestamptz;
  v_inserted   boolean;
  v_privileged boolean := public.current_role_bypasses_rls();
BEGIN
  IF NOT v_privileged AND (auth.jwt() ->> 'sub') IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  -- verified / is_admin are deliberately absent from this column list: an
  -- ordinary caller has no INSERT grant on them, and their DEFAULT is false.
  -- A privileged caller sets them in the follow-up below.
  INSERT INTO public.profile_core (
    id, name, bio, location, pronouns, birthday, age, gender, user_type, city, zone, areas,
    lat, lng, coords_private, budget_min, budget_max, budget, move_in_date, flat_type,
    photos, prompts, job_company, job_title, education_school, education_level,
    onboarding_done, paused, last_active_at
  ) VALUES (
    NEW.id, NEW.name, NEW.bio, NEW.location, NEW.pronouns, NEW.birthday, NEW.age, NEW.gender, NEW.user_type,
    NEW.city, NEW.zone, NEW.areas, NEW.lat, NEW.lng, COALESCE(NEW.coords_private, true),
    NEW.budget_min, NEW.budget_max, NEW.budget, NEW.move_in_date, NEW.flat_type,
    NEW.photos, COALESCE(NEW.prompts, '[]'::jsonb), NEW.job_company, NEW.job_title,
    NEW.education_school, NEW.education_level,
    COALESCE(NEW.onboarding_done, false),
    COALESCE(NEW.paused, false), NEW.last_active_at
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING created_at, updated_at INTO v_created_at, v_updated_at;

  -- Latch FOUND before anything else can clobber it.
  v_inserted := FOUND;

  IF NOT v_privileged THEN
    -- Echo back what was actually stored, not what the caller asked for.
    NEW.verified := false;
    NEW.is_admin := false;
  ELSIF v_inserted THEN
    UPDATE public.profile_core
       SET verified = COALESCE(NEW.verified, false),
           is_admin = COALESCE(NEW.is_admin, false)
     WHERE id = NEW.id;
  END IF;

  IF NOT v_inserted THEN
    -- Row already exists from a concurrent insert — echo it back and skip
    -- the child inserts below (they'd already exist too).
    SELECT created_at, updated_at INTO v_created_at, v_updated_at
    FROM public.profile_core WHERE id = NEW.id;
    NEW.created_at := v_created_at;
    NEW.updated_at := v_updated_at;
    RETURN NEW;
  END IF;

  NEW.created_at := v_created_at;
  NEW.updated_at := v_updated_at;

  INSERT INTO public.profile_lifestyle (profile_id, drink, tobacco, weed)
  VALUES (NEW.id, NEW.drink, NEW.tobacco, NEW.weed)
  ON CONFLICT (profile_id) DO NOTHING;

  INSERT INTO public.profile_preferences (
    profile_id, pref_role, pref_gender, pref_age, pref_budget, pref_move_in,
    pref_smoking, pref_drinking, pref_occupation, pref_food, pref_pets, pref_flat_type, pref_areas
  ) VALUES (
    NEW.id, NEW.pref_role, NEW.pref_gender, NEW.pref_age, NEW.pref_budget, NEW.pref_move_in,
    NEW.pref_smoking, NEW.pref_drinking, NEW.pref_occupation, NEW.pref_food, NEW.pref_pets,
    NEW.pref_flat_type, NEW.pref_areas
  )
  ON CONFLICT (profile_id) DO NOTHING;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.profiles_view_update() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = ''
    AS $$
DECLARE
  v_privileged boolean := public.current_role_bypasses_rls();
BEGIN
  IF NOT v_privileged AND (auth.jwt() ->> 'sub') IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  -- Silently carry the moderation flags forward rather than raising: PostgREST
  -- sends the full row shape on a partial update, so a client that read the
  -- profile and wrote part of it back would otherwise fail on flags it never
  -- meant to touch. They are simply absent from the SET list below, which
  -- leaves the stored values untouched (and needs no column privilege).
  IF NOT v_privileged THEN
    NEW.is_admin := OLD.is_admin;
    NEW.verified := OLD.verified;
  END IF;

  UPDATE public.profile_core SET
    name = NEW.name, bio = NEW.bio, location = NEW.location, pronouns = NEW.pronouns, birthday = NEW.birthday, age = NEW.age,
    gender = NEW.gender, user_type = NEW.user_type, city = NEW.city, zone = NEW.zone, areas = NEW.areas,
    lat = NEW.lat, lng = NEW.lng, coords_private = NEW.coords_private,
    budget_min = NEW.budget_min, budget_max = NEW.budget_max, budget = NEW.budget,
    move_in_date = NEW.move_in_date, flat_type = NEW.flat_type, photos = NEW.photos, prompts = NEW.prompts,
    job_company = NEW.job_company, job_title = NEW.job_title,
    education_school = NEW.education_school, education_level = NEW.education_level,
    onboarding_done = NEW.onboarding_done, paused = NEW.paused,
    last_active_at = NEW.last_active_at
  WHERE id = OLD.id
  RETURNING updated_at INTO NEW.updated_at;

  -- Only an admin portal / backend job reaches this.
  IF v_privileged THEN
    UPDATE public.profile_core
       SET verified = NEW.verified, is_admin = NEW.is_admin
     WHERE id = OLD.id;
  END IF;

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


-- ----------------------------------------------------------------------------
-- 2 & 3. Messages.
--
-- messages_update_read is named for marking messages read, but it was a
-- column-unrestricted FOR UPDATE with `USING sender_id <> me` — so a user
-- could rewrite the *content* of messages their match had sent them. RLS
-- can't scope columns; column-level GRANTs can, so `read` becomes the only
-- updatable column for ordinary clients.
--
-- messages_delete had no status check, letting either party erase a
-- conversation after unmatching — which defeats the history-preserving
-- design of matches_log (soft `status='unmatched'`, messages retained for
-- trust & safety review).
-- ----------------------------------------------------------------------------

REVOKE UPDATE ON public.messages FROM anon, authenticated;
GRANT  UPDATE (read) ON public.messages TO authenticated;

DROP POLICY IF EXISTS messages_delete ON public.messages;
CREATE POLICY messages_delete ON public.messages FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.matches_log m
    WHERE m.id = messages.match_id
      AND (m.user1_id = (auth.jwt() ->> 'sub') OR m.user2_id = (auth.jwt() ->> 'sub'))
      AND m.status = 'active'
  )
);


-- ----------------------------------------------------------------------------
-- 5. coords_private enforcement -- moved to 20260727001000.
--
-- Rebuilding the `profiles` view needs CREATE OR REPLACE, which demands an
-- exact positional match on the existing column list -- and the live view has
-- drifted from the order every migration file here declares (the same drift
-- 20260726123000 documents for the profile primary keys). That needs a
-- self-adapting rebuild, so it lives in its own file. Nothing else below
-- depends on the view's shape.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- 6. reports — deletable subjects, and reviewable by the safety team.
--
-- Both FKs were plain REFERENCES (NO ACTION), so delete_account() threw a
-- foreign-key violation for anyone who had ever filed or been named in a
-- report. The Privacy Policy commits to retaining reports "even if the
-- reported account is later deleted", so SET NULL (not CASCADE) is the
-- correct behaviour — the report survives, de-identified.
-- ----------------------------------------------------------------------------

ALTER TABLE public.reports ALTER COLUMN reporter_id DROP NOT NULL;
ALTER TABLE public.reports ALTER COLUMN reported_id DROP NOT NULL;

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reported_id_fkey;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id)
      REFERENCES public.profile_core(id) ON DELETE SET NULL;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_reported_id_fkey FOREIGN KEY (reported_id)
      REFERENCES public.profile_core(id) ON DELETE SET NULL;

-- Reports were insert-only with a reporter-scoped SELECT, so no moderator
-- could ever read one through the API. is_admin is no longer self-settable
-- (section 1), so gating on it is now meaningful.
DROP POLICY IF EXISTS reports_select_admin ON public.reports;
CREATE POLICY reports_select_admin ON public.reports FOR SELECT
  USING (public.is_admin((auth.jwt() ->> 'sub')));

DROP POLICY IF EXISTS reports_update_admin ON public.reports;
CREATE POLICY reports_update_admin ON public.reports FOR UPDATE
  USING (public.is_admin((auth.jwt() ->> 'sub')))
  WITH CHECK (public.is_admin((auth.jwt() ->> 'sub')));

-- A reporter may file and read their own reports, but not edit status or
-- moderator_notes after the fact.
REVOKE UPDATE ON public.reports FROM anon, authenticated;
GRANT  UPDATE (status, moderator_notes) ON public.reports TO authenticated;


-- ----------------------------------------------------------------------------
-- 7. delete_account() — actually delete the account.
--
-- It removed the profile row and the user's photos but left auth.users
-- intact, so the credential still worked and the next sign-in silently
-- rebuilt a profile via ensureProfile(). Deleting the auth row last means a
-- failure partway through rolls the whole thing back.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_account() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid text := auth.jwt() ->> 'sub';
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  DELETE FROM storage.objects
    WHERE bucket_id = 'photos'
      AND (storage.foldername(name))[1] = v_uid;

  -- Cascades to lifestyle/preferences/flat_details/likes/matches/messages;
  -- reports fall back to SET NULL (section 6) so they survive review.
  DELETE FROM public.profile_core WHERE id = v_uid;

  DELETE FROM auth.users WHERE id::text = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_account() TO authenticated, service_role;
