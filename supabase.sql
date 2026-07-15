-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.waitlist (
  email text NOT NULL,
  CONSTRAINT waitlist_pkey PRIMARY KEY (email)
);
CREATE TABLE public.profiles (
  id text NOT NULL,
  name text,
  age integer,
  bio text,
  location text,
  budget_min integer,
  budget_max integer,
  move_in_date date,
  photos text[],
  created_at timestamp with time zone DEFAULT now(),
  pronouns text[],
  gender text,
  drink text,
  tobacco text,
  areas text[],
  budget text,
  onboarding_done boolean DEFAULT false,
  birthday date,
  weed text,
  preferred_areas text[],
  user_type text,
  pref_move_in text,
  pref_gender text,
  pref_age text,
  pref_occupation text[],
  pref_food text[],
  pref_smoking text,
  pref_drinking text,
  pref_pets text[],
  pref_role text,
  pref_areas text[],
  pref_budget text,
  pref_flat_type text[],
  job_company text,
  job_title text,
  education_school text,
  education_level text,
  prompts jsonb DEFAULT '[]'::jsonb,
  verified boolean NOT NULL DEFAULT false,
  last_active_at timestamp with time zone,
  flat_type text,
  paused boolean NOT NULL DEFAULT false,
  is_admin boolean NOT NULL DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user1_id text,
  user2_id text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT matches_pkey PRIMARY KEY (id),
  CONSTRAINT matches_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES public.profiles(id),
  CONSTRAINT matches_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES public.profiles(id),
  CONSTRAINT matches_user1_user2_unique UNIQUE (user1_id, user2_id)
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
  CONSTRAINT likes_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.profiles(id),
  CONSTRAINT likes_from_to_unique UNIQUE (from_user_id, to_user_id)
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