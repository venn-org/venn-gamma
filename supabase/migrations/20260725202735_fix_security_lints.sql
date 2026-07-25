-- ============================================================================
-- Address the Supabase database-linter WARN findings (supabase_errors.csv).
--
-- Not touched, and why:
--   * rls_policy_always_true (waitlist.public_insert_only,
--     preregistrations_archive."Allow public insert") — both are public
--     sign-up forms with no matching SELECT/UPDATE/DELETE policy for anon,
--     so an open INSERT is the intended design, not a bug.
--   * auth_leaked_password_protection — an Auth dashboard/project setting,
--     not schema; not fixable via `db push`.
--   * public.is_panel_admin() — not defined anywhere in this repo (applied
--     directly against the DB, outside these migrations, presumably by the
--     admin panel). Narrowed its public exposure below since that's a safe,
--     narrowly-scoped change either way, but flagging it: verify the admin
--     panel doesn't call it as `anon`/`authenticated` before relying on this.
--   * public.handle_new_user() — schema.sql's design notes claim this is
--     dead (no trigger wired to it), but it is NOT: `auth.users` has a live
--     `on_auth_user_created` trigger calling it on every signup (discovered
--     when `DROP FUNCTION` refused with a dependency error — good thing it
--     did). Its body isn't in this repo, so its search_path/grants are left
--     untouched rather than risk breaking signup on an unverified guess.
--     Needs a manual look in the dashboard before touching it.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0011 function_search_path_mutable — every flagged function gets a fixed,
-- empty search_path. Safe because every reference in these bodies is already
-- schema-qualified (public.foo, auth.jwt(), etc.).
-- ----------------------------------------------------------------------------

ALTER FUNCTION public.profiles_view_update() SET search_path = '';
ALTER FUNCTION public.profiles_view_insert() SET search_path = '';
ALTER FUNCTION public.profiles_view_delete() SET search_path = '';
ALTER FUNCTION public.likes_view_insert() SET search_path = '';
ALTER FUNCTION public.likes_view_delete() SET search_path = '';
ALTER FUNCTION public.matches_view_delete() SET search_path = '';
ALTER FUNCTION public.blocks_view_insert() SET search_path = '';
ALTER FUNCTION public.blocks_view_delete() SET search_path = '';
ALTER FUNCTION public.set_updated_at() SET search_path = '';
ALTER FUNCTION public.create_match_on_mutual_like() SET search_path = '';
ALTER FUNCTION public.notify_on_message() SET search_path = '';
ALTER FUNCTION public.dismiss_like(uuid) SET search_path = '';
ALTER FUNCTION public.get_blocked_pair_ids() SET search_path = '';
ALTER FUNCTION public.is_admin(text) SET search_path = '';
ALTER FUNCTION public.current_role_bypasses_rls() SET search_path = '';

-- notify_send_push() and delete_account() already declare their own
-- search_path (needed for the `net`/`vault` schemas, and to keep working
-- unqualified inside a plpgsql body, respectively) — left as-is.


-- ----------------------------------------------------------------------------
-- is_admin(uuid): confirmed dead — profile_core.id is text, so this overload
-- (the pre-redesign signature) could never have matched a real row.
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.is_admin(uuid);


-- ----------------------------------------------------------------------------
-- 0028/0029 SECURITY DEFINER functions exposed to anon/authenticated with no
-- reason to be. Trigger-only functions (fired internally, never called via
-- client RPC) get their PUBLIC/anon/authenticated EXECUTE revoked entirely —
-- firing a trigger never requires an EXECUTE grant, so this only removes the
-- ability to invoke them directly over `/rest/v1/rpc/...`.
-- dismiss_like / get_blocked_pair_ids / is_admin ARE called (via RPC, or from
-- inside an RLS policy) by signed-in users — narrowed to `authenticated`
-- only, mirroring the REVOKE/GRANT pattern schema.sql already uses for
-- delete_account().
-- ----------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_match_on_mutual_like() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_send_push() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.dismiss_like(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_like(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_blocked_pair_ids() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_blocked_pair_ids() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_admin(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(text) TO authenticated, service_role;

-- Narrow only, not defined in this repo — see note at the top of this file.
REVOKE ALL ON FUNCTION public.is_panel_admin() FROM PUBLIC, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 0014 extension_in_public — NOT applied. `ALTER EXTENSION pg_net SET SCHEMA`
-- was rejected: pg_net's extension control file marks it non-relocatable
-- (SQLSTATE 0A000). The only way to move it is DROP EXTENSION + CREATE
-- EXTENSION WITH SCHEMA extensions, which would tear down and recreate its
-- `net` schema functions — notify_send_push() calls net.http_post() from a
-- live AFTER INSERT trigger on notifications, so that's a real risk of
-- breaking push notifications mid-migration for no functional gain (this
-- lint is cosmetic: it flags where the extension is *registered*, not an
-- actual permission issue). Leaving this as a manual, deliberate change for
-- a maintenance window rather than doing it blind here.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- 0025 public_bucket_allows_listing — `photos` is a public bucket (object
-- URLs are served regardless of RLS on storage.objects — confirmed live:
-- GET .../storage/v1/object/public/photos/<anything> resolves to "Object not
-- found" rather than a permissions/bucket error), and the app only ever
-- reads via getPublicUrl() (lib/photos.js), never lists. Two SELECT policies
-- allowed anyone to list the entire bucket's contents; neither is needed for
-- the app to keep working.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
DROP POLICY IF EXISTS "photos are public" ON storage.objects;
