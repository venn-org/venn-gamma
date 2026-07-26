-- ensureProfile() (lib/auth.js) can legitimately be called twice concurrently
-- for the same uid (once from the app/_layout.jsx auth listener, once from
-- the sign-in screen right after verifying the OTP). The client already
-- swallows the resulting 23505 on 'profiles', but the INSTEAD OF trigger's
-- plain INSERT still races two ways: the second profile_core insert can hit
-- "duplicate key value violates unique constraint profile_core_pkey", or
-- (if profile_core's insert wins the race but a later insert into
-- profile_lifestyle/profile_preferences loses it) the same duplicate-key
-- error surfaces from those tables instead. Make each insert idempotent so a
-- losing concurrent call is a no-op rather than an error.
CREATE OR REPLACE FUNCTION public.profiles_view_insert() RETURNS trigger
    LANGUAGE plpgsql AS $$
DECLARE
  v_created_at timestamptz;
  v_updated_at timestamptz;
BEGIN
  IF NOT public.current_role_bypasses_rls() AND (auth.jwt() ->> 'sub') IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.profile_core (
    id, name, bio, location, pronouns, birthday, age, gender, user_type, city, zone, areas,
    lat, lng, coords_private, budget_min, budget_max, budget, move_in_date, flat_type,
    photos, prompts, job_company, job_title, education_school, education_level,
    onboarding_done, verified, paused, is_admin, last_active_at
  ) VALUES (
    NEW.id, NEW.name, NEW.bio, NEW.location, NEW.pronouns, NEW.birthday, NEW.age, NEW.gender, NEW.user_type,
    NEW.city, NEW.zone, NEW.areas, NEW.lat, NEW.lng, COALESCE(NEW.coords_private, true),
    NEW.budget_min, NEW.budget_max, NEW.budget, NEW.move_in_date, NEW.flat_type,
    NEW.photos, COALESCE(NEW.prompts, '[]'::jsonb), NEW.job_company, NEW.job_title,
    NEW.education_school, NEW.education_level,
    COALESCE(NEW.onboarding_done, false), COALESCE(NEW.verified, false),
    COALESCE(NEW.paused, false), COALESCE(NEW.is_admin, false), NEW.last_active_at
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING created_at, updated_at INTO v_created_at, v_updated_at;

  IF NOT FOUND THEN
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
