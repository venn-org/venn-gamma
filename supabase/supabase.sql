-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.waitlist (
  email text NOT NULL,
  CONSTRAINT waitlist_pkey PRIMARY KEY (email)
);
CREATE TABLE public.profiles (
  id text NOT NULL,
  name text,
  age integer CHECK (age IS NULL OR age >= 18 AND age <= 100),
  bio text,
  location text,
  budget_min integer,
  budget_max integer,
  move_in_date date,
  photos ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  pronouns ARRAY,
  gender USER-DEFINED,
  drink USER-DEFINED,
  tobacco USER-DEFINED,
  areas ARRAY,
  budget USER-DEFINED,
  onboarding_done boolean DEFAULT false,
  birthday date,
  weed USER-DEFINED,
  preferred_areas ARRAY,
  user_type USER-DEFINED,
  pref_move_in USER-DEFINED,
  pref_gender USER-DEFINED,
  pref_age USER-DEFINED,
  pref_occupation ARRAY,
  pref_food ARRAY,
  pref_smoking USER-DEFINED,
  pref_drinking USER-DEFINED,
  pref_pets ARRAY,
  pref_role USER-DEFINED,
  pref_areas ARRAY,
  pref_budget USER-DEFINED,
  pref_flat_type ARRAY,
  job_company text,
  job_title text,
  education_school text,
  education_level text,
  prompts jsonb DEFAULT '[]'::jsonb,
  verified boolean NOT NULL DEFAULT false,
  last_active_at timestamp with time zone,
  flat_type USER-DEFINED,
  paused boolean NOT NULL DEFAULT false,
  is_admin boolean NOT NULL DEFAULT false,
  city text,
  zone text,
  lat double precision,
  lng double precision,
  coords_private boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user1_id text,
  user2_id text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT matches_pkey PRIMARY KEY (id),
  CONSTRAINT matches_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES public.profiles(id),
  CONSTRAINT matches_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  match_id uuid,
  sender_id text,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  read boolean NOT NULL DEFAULT false,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id),
  CONSTRAINT messages_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id)
);
CREATE TABLE public.likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_user_id text NOT NULL,
  to_user_id text NOT NULL,
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT likes_pkey PRIMARY KEY (id),
  CONSTRAINT likes_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.profiles(id),
  CONSTRAINT likes_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id text NOT NULL,
  reported_id text NOT NULL,
  reason text NOT NULL,
  details text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'::text,
  moderator_notes text,
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id),
  CONSTRAINT reports_reported_id_fkey FOREIGN KEY (reported_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blocker_id text NOT NULL,
  blocked_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT blocks_pkey PRIMARY KEY (id),
  CONSTRAINT blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.profiles(id),
  CONSTRAINT blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type text NOT NULL,
  actor_id text,
  match_id uuid,
  content text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id)
);
CREATE TABLE public.preregistrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  first_name text,
  last_name text,
  email text UNIQUE,
  age text,
  role text,
  city text,
  budget text,
  move_in text,
  looking_for text,
  sleep_schedule text,
  cleanliness text,
  guests text,
  wfh text,
  CONSTRAINT preregistrations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profile_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  viewer_id text NOT NULL,
  viewed_id text NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_views_pkey PRIMARY KEY (id),
  CONSTRAINT profile_views_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES public.profiles(id),
  CONSTRAINT profile_views_viewed_id_fkey FOREIGN KEY (viewed_id) REFERENCES public.profiles(id)
);