-- Patches a live DB that was manually seeded from the schema-redesign
-- migration before the `location` column was restored to profile_core (it
-- was mistakenly dropped as "dead" then found to be a live field used by
-- edit-profile.jsx / ProfileViewSheet.jsx / profileUtils.js). Purely
-- additive — safe against a database that already has real rows.

ALTER TABLE public.profile_core ADD COLUMN IF NOT EXISTS location text;

-- CREATE OR REPLACE VIEW can only append trailing columns, not insert one
-- into the existing positional order — so `location` goes at the end here,
-- even though it's grouped with the other identity fields in schema.sql.
CREATE OR REPLACE VIEW public.profiles WITH (security_invoker = true) AS
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
      c.created_at, c.updated_at, c.location
    FROM public.profile_core c
    LEFT JOIN public.profile_lifestyle l ON l.profile_id = c.id
    LEFT JOIN public.profile_preferences p ON p.profile_id = c.id;

CREATE OR REPLACE FUNCTION public.profiles_view_insert() RETURNS trigger
    LANGUAGE plpgsql AS $$
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
    name = NEW.name, bio = NEW.bio, location = NEW.location, pronouns = NEW.pronouns, birthday = NEW.birthday, age = NEW.age,
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
