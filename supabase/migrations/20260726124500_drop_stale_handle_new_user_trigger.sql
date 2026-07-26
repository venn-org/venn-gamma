-- public.handle_new_user(), fired by a live `on_auth_user_created` trigger on
-- auth.users, is not defined anywhere in this repo (see
-- 20260725202735_fix_security_lints.sql's notes) and was already targeted
-- for removal once before (20260724043406_full_schema_redesign.sql /
-- duplicate.sql both contain `DROP FUNCTION IF EXISTS
-- public.handle_new_user() CASCADE`) — it must have been recreated after
-- that, likely by a Supabase dashboard auth template.
--
-- It duplicates what lib/auth.js's ensureProfile() already does client-side
-- right after every sign-in, but still writes against the pre-redesign
-- schema, so on every new signup it now fails with 42P10 (no unique
-- constraint matching its ON CONFLICT target) inside the auth.users insert
-- transaction — surfacing to the client as 25P02 on whatever ran next.
-- ensureProfile() is the only supported profile-creation path; drop this.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
