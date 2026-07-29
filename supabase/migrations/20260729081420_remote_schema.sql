-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP EXTENSION pg_net;

ALTER TABLE public.messages
  DROP CONSTRAINT messages_match_id_fkey;

ALTER TABLE public.messages
  DROP CONSTRAINT messages_sender_id_fkey;

ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_actor_id_fkey;

ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_match_id_fkey;

ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_user_id_fkey;

ALTER TABLE public.profile_views
  DROP CONSTRAINT profile_views_viewed_id_fkey;

ALTER TABLE public.profile_views
  DROP CONSTRAINT profile_views_viewer_id_fkey;

ALTER TABLE public.push_subscriptions
  DROP CONSTRAINT push_subscriptions_user_id_fkey;

DROP POLICY messages_select ON public.messages;

CREATE EXTENSION pg_net WITH SCHEMA public;

CREATE TYPE public.enum_budget_archive AS ENUM (
  'under_10k',
  '10k_20k',
  '20k_35k',
  '35k_50k',
  '50k_plus'
);

CREATE TYPE public.enum_drinking_pref_archive AS ENUM (
  'teetotaller_only',
  'social_drinker_ok',
  'fine_with_drinking'
);

CREATE TYPE public.enum_flat_type_archive AS ENUM (
  '1_bhk',
  '2_bhk',
  '3_bhk',
  'studio',
  'private_room',
  'shared_room',
  'pg'
);

CREATE TYPE public.enum_food_habit_archive AS ENUM (
  'veg_only',
  'eggetarian_ok',
  'non_veg_ok',
  'vegan_only'
);

CREATE TYPE public.enum_gender_archive AS ENUM (
  'man',
  'woman',
  'non_binary',
  'prefer_not_to_say'
);

CREATE TYPE public.enum_lifestyle_archive AS ENUM (
  'yes',
  'sometimes',
  'no',
  'prefer_not_to_say'
);

CREATE TYPE public.enum_move_in_archive AS ENUM (
  'asap',
  'jul_2026',
  'aug_2026',
  'sep_2026',
  'oct_2026',
  'flexible'
);

CREATE TYPE public.enum_occupation_archive AS ENUM (
  'working_professional',
  'student',
  'freelancer',
  'entrepreneur'
);

CREATE TYPE public.enum_pets_pref_archive AS ENUM (
  'have_pet',
  'fine_with_pets',
  'no_pets',
  'allergic'
);

CREATE TYPE public.enum_pref_age_archive AS ENUM (
  '18_22',
  '22_26',
  '26_30',
  '30_35',
  '35_plus',
  'flexible'
);

CREATE TYPE public.enum_pref_gender_archive AS ENUM (
  'women_only',
  'men_only',
  'any_gender'
);

CREATE TYPE public.enum_pref_role_archive AS ENUM (
  'seeking',
  'owner'
);

CREATE TYPE public.enum_smoking_pref_archive AS ENUM (
  'non_smoker',
  'smoker_ok',
  'outside_only'
);

CREATE TYPE public.enum_user_type_archive AS ENUM (
  'seeking',
  'owner'
);

GRANT ALL ON FUNCTION public.blocks_view_delete() TO anon;

GRANT ALL ON FUNCTION public.blocks_view_delete() TO authenticated;

GRANT ALL ON FUNCTION public.blocks_view_delete() TO service_role;

GRANT ALL ON FUNCTION public.blocks_view_insert() TO anon;

GRANT ALL ON FUNCTION public.blocks_view_insert() TO authenticated;

GRANT ALL ON FUNCTION public.blocks_view_insert() TO service_role;

CREATE FUNCTION public.delete_user_by_admin (
  target_user_id text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only administrators can perform this action';
  end if;

  delete from storage.objects
    where bucket_id = 'photos'
      and (storage.foldername(name))[1] = target_user_id;

  delete from public.profile_core where id = target_user_id;
  -- App users authenticate via Firebase, not Supabase's native auth, so
  -- this normally matches nothing; kept (with a safe cast) in case a
  -- shadow auth.users row exists for this id.
  delete from auth.users where id::text = target_user_id;
end;
$function$;

GRANT ALL ON FUNCTION public.delete_user_by_admin(text) TO authenticated;

GRANT ALL ON FUNCTION public.delete_user_by_admin(text) TO service_role;

CREATE FUNCTION public.is_admin (
  user_id uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  return exists (
    select 1
    from public.admins a
    join auth.users u on u.email = a.email
    where u.id = user_id
  );
end;
$function$;

GRANT ALL ON FUNCTION public.is_admin(uuid) TO authenticated;

GRANT ALL ON FUNCTION public.is_admin(uuid) TO service_role;

CREATE FUNCTION public.is_panel_admin()
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_sub text := auth.jwt() ->> 'sub';
  v_uuid uuid;
begin
  begin
    v_uuid := v_sub::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  return exists (
    select 1
    from public.admins a
    join auth.users u on u.email = a.email
    where u.id = v_uuid
  );
end;
$function$;

GRANT ALL ON FUNCTION public.is_panel_admin() TO authenticated;

GRANT ALL ON FUNCTION public.is_panel_admin() TO service_role;

GRANT ALL ON FUNCTION public.likes_view_delete() TO anon;

GRANT ALL ON FUNCTION public.likes_view_delete() TO authenticated;

GRANT ALL ON FUNCTION public.likes_view_delete() TO service_role;

GRANT ALL ON FUNCTION public.likes_view_insert() TO anon;

GRANT ALL ON FUNCTION public.likes_view_insert() TO authenticated;

GRANT ALL ON FUNCTION public.likes_view_insert() TO service_role;

GRANT ALL ON FUNCTION public.matches_view_delete() TO anon;

GRANT ALL ON FUNCTION public.matches_view_delete() TO authenticated;

GRANT ALL ON FUNCTION public.matches_view_delete() TO service_role;

GRANT ALL ON FUNCTION public.profiles_view_delete() TO anon;

GRANT ALL ON FUNCTION public.profiles_view_delete() TO authenticated;

GRANT ALL ON FUNCTION public.profiles_view_delete() TO service_role;

GRANT ALL ON FUNCTION public.profiles_view_insert() TO anon;

GRANT ALL ON FUNCTION public.profiles_view_insert() TO authenticated;

GRANT ALL ON FUNCTION public.profiles_view_insert() TO service_role;

GRANT ALL ON FUNCTION public.profiles_view_update() TO anon;

GRANT ALL ON FUNCTION public.profiles_view_update() TO authenticated;

GRANT ALL ON FUNCTION public.profiles_view_update() TO service_role;

CREATE TABLE public.admins (
  id         uuid                     DEFAULT gen_random_uuid() NOT NULL,
  email      text                     NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.admins
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.admins
  ADD CONSTRAINT admins_email_key UNIQUE (email);

ALTER TABLE public.admins
  ADD CONSTRAINT admins_pkey PRIMARY KEY (id);

GRANT ALL ON public.admins TO anon;

GRANT ALL ON public.admins TO authenticated;

GRANT ALL ON public.admins TO service_role;

CREATE POLICY admins_select_self ON public.admins
  FOR SELECT
  USING ((email = auth.email()));

CREATE POLICY blocks_log_select_admin ON public.blocks_log
  FOR SELECT
  USING (public.is_panel_admin());

CREATE POLICY cities_admin_write ON public.cities
  USING (public.is_panel_admin())
  WITH CHECK (public.is_panel_admin());

CREATE POLICY matches_log_select_admin ON public.matches_log
  FOR SELECT
  USING (public.is_panel_admin());

ALTER TABLE public.messages
  ADD CONSTRAINT messages_match_id_fkey1 FOREIGN KEY (match_id) REFERENCES public.matches_log(id) ON DELETE CASCADE;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_fkey1 FOREIGN KEY (sender_id) REFERENCES public.profile_core(id) ON DELETE CASCADE;

CREATE POLICY messages_select ON public.messages
  FOR SELECT
  USING (((EXISTS ( SELECT 1
   FROM public.matches_log m
  WHERE ((m.id = messages.match_id) AND ((m.user1_id = (auth.jwt() ->> 'sub'::text)) OR (m.user2_id = (auth.jwt() ->> 'sub'::text))) AND (m.status = 'active'::text)))) OR
    public.is_admin((auth.jwt() ->> 'sub'::text)) OR public.is_panel_admin()));

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_actor_id_fkey1 FOREIGN KEY (actor_id) REFERENCES public.profile_core(id) ON DELETE SET NULL;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_match_id_fkey1 FOREIGN KEY (match_id) REFERENCES public.matches_log(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey1 FOREIGN KEY (user_id) REFERENCES public.profile_core(id) ON DELETE CASCADE;

CREATE POLICY notifications_insert_admin ON public.notifications
  FOR INSERT
  WITH CHECK (public.is_panel_admin());

CREATE POLICY notifications_select_admin ON public.notifications
  FOR SELECT
  USING (public.is_panel_admin());

CREATE POLICY option_groups_admin_write ON public.option_groups
  USING (public.is_panel_admin())
  WITH CHECK (public.is_panel_admin());

CREATE POLICY option_values_admin_write ON public.option_values
  USING (public.is_panel_admin())
  WITH CHECK (public.is_panel_admin());

CREATE TABLE public.preregistrations_archive (
  id             uuid                     DEFAULT gen_random_uuid() NOT NULL,
  created_at     timestamp with time zone DEFAULT now(),
  first_name     text,
  last_name      text,
  email          text,
  age            text,
  role           text,
  city           text,
  budget         text,
  move_in        text,
  looking_for    text,
  sleep_schedule text,
  cleanliness    text,
  guests         text,
  wfh            text
);

ALTER TABLE public.preregistrations_archive
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.preregistrations_archive
  ADD CONSTRAINT preregistrations_email_key_archive UNIQUE (email);

ALTER TABLE public.preregistrations_archive
  ADD CONSTRAINT preregistrations_pkey_archive PRIMARY KEY (id);

GRANT ALL ON public.preregistrations_archive TO anon;

GRANT ALL ON public.preregistrations_archive TO authenticated;

GRANT ALL ON public.preregistrations_archive TO service_role;

CREATE POLICY "Allow public insert" ON public.preregistrations_archive
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY preregistrations_select_admin ON public.preregistrations_archive
  FOR SELECT
  USING (public.is_panel_admin());

CREATE POLICY profile_core_update_admin ON public.profile_core
  FOR UPDATE
  USING (public.is_panel_admin());

CREATE POLICY profile_lifestyle_update_admin ON public.profile_lifestyle
  FOR UPDATE
  USING (public.is_panel_admin());

CREATE POLICY profile_preferences_update_admin ON public.profile_preferences
  FOR UPDATE
  USING (public.is_panel_admin());

ALTER TABLE public.profile_views
  ADD CONSTRAINT profile_views_viewed_id_fkey1 FOREIGN KEY (viewed_id) REFERENCES public.profile_core(id) ON DELETE CASCADE;

ALTER TABLE public.profile_views
  ADD CONSTRAINT profile_views_viewer_id_fkey1 FOREIGN KEY (viewer_id) REFERENCES public.profile_core(id) ON DELETE CASCADE;

CREATE TABLE public.profiles_archive (
  id               text                              NOT NULL,
  name             text,
  age              integer,
  bio              text,
  location         text,
  budget_min       integer,
  budget_max       integer,
  move_in_date     date,
  photos           text[],
  created_at       timestamp with time zone          DEFAULT now(),
  pronouns         text[],
  gender           public.enum_gender_archive,
  drink            public.enum_lifestyle_archive,
  tobacco          public.enum_lifestyle_archive,
  areas            text[],
  budget           public.enum_budget_archive,
  onboarding_done  boolean                           DEFAULT false,
  birthday         date,
  weed             public.enum_lifestyle_archive,
  preferred_areas  text[],
  user_type        public.enum_user_type_archive,
  pref_move_in     public.enum_move_in_archive,
  pref_gender      public.enum_pref_gender_archive,
  pref_age         public.enum_pref_age_archive,
  pref_occupation  public.enum_occupation_archive[],
  pref_food        public.enum_food_habit_archive[],
  pref_smoking     public.enum_smoking_pref_archive,
  pref_drinking    public.enum_drinking_pref_archive,
  pref_pets        public.enum_pets_pref_archive[],
  pref_role        public.enum_pref_role_archive,
  pref_areas       text[],
  pref_budget      public.enum_budget_archive,
  pref_flat_type   public.enum_flat_type_archive[],
  job_company      text,
  job_title        text,
  education_school text,
  education_level  text,
  prompts          jsonb                             DEFAULT '[]'::jsonb,
  verified         boolean                           DEFAULT false NOT NULL,
  last_active_at   timestamp with time zone,
  flat_type        public.enum_flat_type_archive,
  paused           boolean                           DEFAULT false NOT NULL,
  is_admin         boolean                           DEFAULT false NOT NULL,
  city             text,
  zone             text,
  lat              double precision,
  lng              double precision,
  coords_private   boolean                           DEFAULT true NOT NULL,
  updated_at       timestamp with time zone          DEFAULT now()
);

ALTER TABLE public.profiles_archive
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles_archive
  ADD CONSTRAINT chk_age_range CHECK (age IS NULL OR age >= 18 AND age <= 100);

ALTER TABLE public.profiles_archive
  ADD CONSTRAINT chk_budget_range CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max);

ALTER TABLE public.profiles_archive
  ADD CONSTRAINT profiles_pkey_archive PRIMARY KEY (id);

GRANT ALL ON public.profiles_archive TO anon;

GRANT ALL ON public.profiles_archive TO authenticated;

GRANT ALL ON public.profiles_archive TO service_role;

CREATE INDEX idx_profiles_feed_archive ON public.profiles_archive (user_type, paused, onboarding_done, last_active_at DESC)
  WHERE paused = false AND onboarding_done = true;

CREATE INDEX idx_profiles_areas_archive ON public.profiles_archive USING gin (areas);

CREATE INDEX idx_profiles_pref_areas_archive ON public.profiles_archive USING gin (pref_areas);

CREATE INDEX idx_profiles_city_zone_archive ON public.profiles_archive (city, zone);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles_archive
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY profiles_delete_own ON public.profiles_archive
  FOR DELETE
  USING (((auth.jwt() ->> 'sub'::text) = id));

CREATE POLICY profiles_insert_own ON public.profiles_archive
  FOR INSERT
  WITH CHECK (((auth.jwt() ->> 'sub'::text) = id));

CREATE POLICY profiles_select ON public.profiles_archive
  FOR SELECT
  USING (((auth.jwt() ->> 'sub'::text) IS NOT NULL));

CREATE POLICY profiles_update_own ON public.profiles_archive
  FOR UPDATE
  USING (((auth.jwt() ->> 'sub'::text) = id))
  WITH CHECK (((auth.jwt() ->> 'sub'::text) = id));

ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_user_id_fkey1 FOREIGN KEY (user_id) REFERENCES public.profile_core(id) ON DELETE CASCADE;

CREATE TABLE public.push_subscriptions_archive (
  id         uuid                     DEFAULT gen_random_uuid() NOT NULL,
  user_id    text                     NOT NULL,
  endpoint   text                     NOT NULL,
  p256dh     text                     NOT NULL,
  auth       text                     NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.push_subscriptions_archive
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.push_subscriptions_archive
  ADD CONSTRAINT push_subscriptions_endpoint_key_archive UNIQUE (endpoint);

ALTER TABLE public.push_subscriptions_archive
  ADD CONSTRAINT push_subscriptions_pkey_archive PRIMARY KEY (id);

ALTER TABLE public.push_subscriptions_archive
  ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles_archive(id) ON DELETE CASCADE;

GRANT ALL ON public.push_subscriptions_archive TO anon;

GRANT ALL ON public.push_subscriptions_archive TO authenticated;

GRANT ALL ON public.push_subscriptions_archive TO service_role;

CREATE POLICY push_subscriptions_delete_own ON public.push_subscriptions_archive
  FOR DELETE
  USING (((auth.jwt() ->> 'sub'::text) = user_id));

CREATE POLICY push_subscriptions_insert_own ON public.push_subscriptions_archive
  FOR INSERT
  WITH CHECK (((auth.jwt() ->> 'sub'::text) = user_id));

CREATE POLICY push_subscriptions_select_own ON public.push_subscriptions_archive
  FOR SELECT
  USING (((auth.jwt() ->> 'sub'::text) = user_id));

CREATE POLICY push_subscriptions_update_own ON public.push_subscriptions_archive
  FOR UPDATE
  USING (((auth.jwt() ->> 'sub'::text) = user_id))
  WITH CHECK (((auth.jwt() ->> 'sub'::text) = user_id));

ALTER TABLE public.reports
  ADD CONSTRAINT reports_reported_id_fkey1 FOREIGN KEY (reported_id) REFERENCES public.profile_core(id);

ALTER TABLE public.reports
  ADD CONSTRAINT reports_reporter_id_fkey1 FOREIGN KEY (reporter_id) REFERENCES public.profile_core(id);

CREATE POLICY waitlist_select_admin ON public.waitlist
  FOR SELECT
  USING (public.is_panel_admin());

CREATE POLICY zones_admin_write ON public.zones
  USING (public.is_panel_admin())
  WITH CHECK (public.is_panel_admin());

CREATE OR REPLACE VIEW public.profiles WITH (security_invoker=true) AS SELECT c.id,
    c.name,
    c.bio,
    c.pronouns,
        CASE
            WHEN (((auth.jwt() ->> 'sub'::text) = c.id) OR public.current_role_bypasses_rls()) THEN c.birthday
            ELSE NULL::date
        END AS birthday,
    c.age,
    c.gender,
    c.user_type,
    c.city,
    c.zone,
    c.areas,
        CASE
            WHEN ((NOT c.coords_private) OR ((auth.jwt() ->> 'sub'::text) = c.id) OR public.current_role_bypasses_rls()) THEN c.lat
            ELSE NULL::double precision
        END AS lat,
        CASE
            WHEN ((NOT c.coords_private) OR ((auth.jwt() ->> 'sub'::text) = c.id) OR public.current_role_bypasses_rls()) THEN c.lng
            ELSE NULL::double precision
        END AS lng,
    c.coords_private,
    c.budget_min,
    c.budget_max,
    c.budget,
    c.move_in_date,
    c.flat_type,
    c.photos,
    c.prompts,
    c.job_company,
    c.job_title,
    c.education_school,
    c.education_level,
    l.drink,
    l.tobacco,
    l.weed,
    p.pref_role,
    p.pref_gender,
    p.pref_age,
    p.pref_budget,
    p.pref_move_in,
    p.pref_smoking,
    p.pref_drinking,
    p.pref_occupation,
    p.pref_food,
    p.pref_pets,
    p.pref_flat_type,
    p.pref_areas,
    c.onboarding_done,
    c.verified,
    c.paused,
    c.is_admin,
    c.last_active_at,
    c.created_at,
    c.updated_at,
    c.location
   FROM ((public.profile_core c
     LEFT JOIN public.profile_lifestyle l ON ((l.profile_id = c.id)))
     LEFT JOIN public.profile_preferences p ON ((p.profile_id = c.id)));
