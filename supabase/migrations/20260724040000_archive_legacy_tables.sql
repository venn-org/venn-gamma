-- ============================================================================
-- Archive the legacy (pre-redesign) tables instead of losing their data.
--
-- Run this BEFORE 20260724043406_full_schema_redesign.sql, against a
-- database that still has the ORIGINAL schema (the one with a single wide
-- `profiles` table and native ENUM types). It renames every table/type that
-- migration would otherwise DROP, using an `_archive` suffix, so:
--
--   - all the old rows are still sitting right there afterwards, just under
--     a new name (public.profiles_archive, public.likes_archive, etc.)
--   - the redesign migration's `DROP TABLE/TYPE IF EXISTS ...` statements
--     become harmless no-ops, because the original names no longer exist
--   - the new schema is free to (re)create `profiles`, `likes`, `matches`,
--     `messages`, `notifications`, `blocks`, `reports`, `profile_views`,
--     `push_subscriptions` fresh, with no name collisions
--
-- `public.waitlist` is never touched — it isn't part of this at all.
--
-- This also renames every index still attached to each archived table (not
-- just the table itself). Index names must be unique across the whole
-- schema in Postgres — renaming only the table would leave old indexes like
-- `profiles_pkey` or `idx_profiles_feed` sitting under their original
-- names, which would collide with the new schema trying to create indexes
-- of the same name on the new tables. Renaming the table without also
-- renaming its indexes is the most common way this kind of archive script
-- silently fails partway through.
--
-- Safe to run more than once — anything already renamed is simply skipped.
-- ============================================================================

DO $$
DECLARE
  tbl text;
  idx record;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles', 'likes', 'matches', 'messages', 'notifications',
    'blocks', 'reports', 'profile_views', 'push_subscriptions', 'preregistrations'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', tbl, tbl || '_archive');

      FOR idx IN
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = tbl || '_archive'
          AND indexname NOT LIKE '%\_archive' ESCAPE '\'
      LOOP
        EXECUTE format('ALTER INDEX public.%I RENAME TO %I', idx.indexname, idx.indexname || '_archive');
      END LOOP;

      RAISE NOTICE 'archived public.% -> public.%_archive', tbl, tbl;
    END IF;
  END LOOP;
END $$;

-- Enum types are still referenced by columns on the archived tables (e.g.
-- profiles_archive.gender is still `public.enum_gender`), so they can't be
-- dropped without losing those columns' data. Rename them out of the way
-- for the same reason as the indexes above.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'enum_budget', 'enum_drinking_pref', 'enum_flat_type', 'enum_food_habit',
    'enum_gender', 'enum_lifestyle', 'enum_move_in', 'enum_occupation',
    'enum_pets_pref', 'enum_pref_age', 'enum_pref_gender', 'enum_pref_role',
    'enum_smoking_pref', 'enum_user_type'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_type
      WHERE typname = t AND typnamespace = 'public'::regnamespace
    ) THEN
      EXECUTE format('ALTER TYPE public.%I RENAME TO %I', t, t || '_archive');
      RAISE NOTICE 'archived type public.% -> public.%_archive', t, t;
    END IF;
  END LOOP;
END $$;

-- Nothing to do for the old functions (create_match_on_mutual_like,
-- is_admin(uuid), handle_new_user, etc.) — they hold no data, and the
-- redesign migration's `DROP FUNCTION IF EXISTS ...` / `CREATE OR REPLACE
-- FUNCTION` calls handle them safely either way.
