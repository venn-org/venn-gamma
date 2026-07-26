-- The previous migration (20260726120000) added ON CONFLICT (id) /
-- ON CONFLICT (profile_id) to profiles_view_insert(), relying on
-- profile_core.id / profile_lifestyle.profile_id / profile_preferences.profile_id
-- being PRIMARY KEY as every migration file defines them. On a live database
-- this landed as 42P10 ("no unique or exclusion constraint matching the ON
-- CONFLICT specification"), meaning the actual deployed schema has drifted
-- from these files and at least one of those primary keys is missing.
-- Idempotent: no-ops on any table that already has its primary key.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.profile_core'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.profile_core ADD PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.profile_lifestyle'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.profile_lifestyle ADD PRIMARY KEY (profile_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.profile_preferences'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.profile_preferences ADD PRIMARY KEY (profile_id);
  END IF;
END $$;
