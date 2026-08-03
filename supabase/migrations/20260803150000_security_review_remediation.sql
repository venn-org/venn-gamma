-- ============================================================================
-- Security review remediation.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- FIND-01 (High): profile_core exposes unmasked GPS + birthdate directly,
-- bypassing the `profiles` view's privacy masking.
--
-- 20260727001000_enforce_coords_private.sql masked lat/lng/birthday in the
-- `profiles` VIEW only. RLS can filter rows, never columns, so profile_core's
-- own policy (`profile_core_select ... USING (auth.jwt()->>'sub' IS NOT
-- NULL)` — true for every row, not row-scoped) combined with its table-wide
-- SELECT grant means any signed-in user can bypass the view entirely:
--   GET /rest/v1/profile_core?select=id,lat,lng,birthday
-- returns exact coordinates and full date of birth for every profile,
-- unmasked — defeating the exact feature that migration built.
--
-- FIX: lock profile_core's SELECT down for anon/authenticated entirely
-- (leaving only the columns its own INSTEAD OF triggers need for RETURNING),
-- and let `profiles` read as its owner instead of the invoker. This is
-- necessary, not optional: a security_invoker view requires the INVOKING
-- role to hold column privileges on every column it references, even ones
-- masked away by a CASE expression — so revoking lat/lng/birthday while
-- keeping security_invoker=true would break the view for everyone, including
-- reading your own birthday.
--
-- Turning off security_invoker also removes the one thing profile_core's RLS
-- was doing for this view: gating out fully-unauthenticated (`anon`) access.
-- The view's rebuilt WHERE clause below reproduces that explicitly, so this
-- migration does not widen access to `anon` — only removes the base-table
-- bypass of the masking.
--
-- CAVEAT — please verify before/after deploying: the admin panel's own
-- `profile_core_update_admin` policy (remote_schema.sql) suggests panel staff
-- write directly against profile_core, not through `profiles`. If the panel's
-- client code does an update-then-.select() against profile_core expecting
-- back columns other than id/created_at/updated_at, that will now fail with
-- a permission error — I have no visibility into that codebase to confirm
-- either way. Test the panel's profile-edit/verify flow after applying.
-- ----------------------------------------------------------------------------

REVOKE SELECT ON public.profile_core FROM anon, authenticated;

-- profiles_view_insert()/profiles_view_update() are NOT security definer —
-- they run as the calling `authenticated` role — and both use RETURNING on
-- id/created_at/updated_at (Postgres requires SELECT privilege on RETURNING
-- columns, same as if they'd been read directly). Nothing else on
-- profile_core needs reading by that role now that the view runs as owner.
GRANT SELECT (id, created_at, updated_at) ON public.profile_core TO authenticated;

-- Same leftover-privilege cleanup as FIND-02/FIND-05 below: TRUNCATE/
-- REFERENCES/TRIGGER were never used by anon/authenticated and aren't
-- RLS-checkable, so there's no reason either role keeps them. `anon` also has
-- no legitimate DELETE path (profile_core_delete_own requires a JWT sub anon
-- never has) — unlike `authenticated`, whose DELETE grant profiles_view_delete
-- (not security definer) genuinely needs to keep working.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.profile_core FROM anon, authenticated;
REVOKE DELETE ON public.profile_core FROM anon;

-- Same dynamic-rebuild technique as 20260727001000_enforce_coords_private.sql:
-- CREATE OR REPLACE VIEW requires an exact positional match on the existing
-- column list, and that migration already documented the live view's column
-- order drifting from what any single migration file declares. Reading the
-- catalog avoids hardcoding a guess that could break again here.
DO $mig$
DECLARE
  v_col   record;
  v_expr  text;
  v_src   text;
  v_parts text[] := '{}';
BEGIN
  FOR v_col IN
    SELECT a.attname::text AS name
    FROM pg_attribute a
    WHERE a.attrelid = 'public.profiles'::regclass
      AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY a.attnum
  LOOP
    IF v_col.name = 'birthday' THEN
      v_expr := 'CASE WHEN (auth.jwt() ->> ''sub'') = c.id'
             || ' OR public.current_role_bypasses_rls()'
             || ' THEN c.birthday END AS birthday';

    ELSIF v_col.name IN ('lat', 'lng') THEN
      v_expr := format(
        'CASE WHEN NOT c.coords_private'
        || ' OR (auth.jwt() ->> ''sub'') = c.id'
        || ' OR public.current_role_bypasses_rls()'
        || ' THEN c.%I END AS %I',
        v_col.name, v_col.name);

    ELSE
      IF EXISTS (
        SELECT 1 FROM pg_attribute
        WHERE attrelid = 'public.profile_core'::regclass
          AND attname = v_col.name AND attnum > 0 AND NOT attisdropped
      ) THEN
        v_src := 'c';
      ELSIF EXISTS (
        SELECT 1 FROM pg_attribute
        WHERE attrelid = 'public.profile_lifestyle'::regclass
          AND attname = v_col.name AND attnum > 0 AND NOT attisdropped
      ) THEN
        v_src := 'l';
      ELSIF EXISTS (
        SELECT 1 FROM pg_attribute
        WHERE attrelid = 'public.profile_preferences'::regclass
          AND attname = v_col.name AND attnum > 0 AND NOT attisdropped
      ) THEN
        v_src := 'p';
      ELSE
        RAISE EXCEPTION 'profiles view column "%" has no source in profile_core/profile_lifestyle/profile_preferences; this migration needs updating before it can rebuild the view', v_col.name;
      END IF;

      v_expr := format('%s.%I AS %I', v_src, v_col.name, v_col.name);
    END IF;

    v_parts := v_parts || v_expr;
  END LOOP;

  IF cardinality(v_parts) = 0 THEN
    RAISE EXCEPTION 'public.profiles has no columns — refusing to rebuild';
  END IF;

  -- security_invoker = false: see header. The WHERE clause is what now
  -- carries the "must be signed in" gate profile_core's RLS used to provide
  -- for this view — service_role/postgres still see everything via
  -- current_role_bypasses_rls(), matching pre-fix behaviour.
  EXECUTE format(
    'CREATE OR REPLACE VIEW public.profiles WITH (security_invoker = false) AS '
    || 'SELECT %s '
    || 'FROM public.profile_core c '
    || 'LEFT JOIN public.profile_lifestyle l ON l.profile_id = c.id '
    || 'LEFT JOIN public.profile_preferences p ON p.profile_id = c.id '
    || 'WHERE (auth.jwt() ->> ''sub'') IS NOT NULL OR public.current_role_bypasses_rls()',
    array_to_string(v_parts, ', ')
  );
END
$mig$;

-- Verify the lockdown actually landed, so a silent no-op can't pass for
-- success.
DO $check$
BEGIN
  IF has_table_privilege('authenticated', 'public.profile_core', 'SELECT') THEN
    RAISE EXCEPTION 'profile_core is still broadly SELECT-able by authenticated';
  END IF;
  IF has_column_privilege('authenticated', 'public.profile_core', 'lat', 'SELECT')
     OR has_column_privilege('authenticated', 'public.profile_core', 'lng', 'SELECT')
     OR has_column_privilege('authenticated', 'public.profile_core', 'birthday', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated can still read profile_core lat/lng/birthday directly';
  END IF;
END
$check$;


-- ----------------------------------------------------------------------------
-- FIND-02 (Medium): admins table granted every privilege in the ALL bundle —
-- INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER — to anon/authenticated,
-- not just the SELECT its one RLS policy (admins_select_self) actually uses.
-- Only SELECT for `authenticated` is real product behaviour; `anon` needs
-- nothing here (admins_select_self can never match an anon request — there is
-- no JWT to compare auth.email() against). TRUNCATE/REFERENCES/TRIGGER aren't
-- reachable through PostgREST today, but they're also not RLS-checkable, so
-- leaving them granted has no upside and is exactly the kind of leftover
-- privilege this review is trying to close.
-- ----------------------------------------------------------------------------

REVOKE ALL ON public.admins FROM anon, authenticated;
GRANT SELECT ON public.admins TO authenticated;


-- ----------------------------------------------------------------------------
-- FIND-03 (Medium, NOT auto-fixed): delete_user_by_admin() / is_admin(uuid)
-- are EXECUTE-granted to `authenticated`, which includes the mobile app's own
-- signed-in users, not just admin-panel staff. Safe today only because
-- auth.uid() errors/nulls on the app's Firebase-style, non-UUID `sub` claims —
-- an incidental protection, not a designed one. Left as documentation only:
-- narrowing the grant requires knowing what Postgres role the (separate)
-- admin panel actually connects as, which this repo has no visibility into.
-- Revoking EXECUTE from `authenticated` without confirming that first risks
-- breaking the panel's delete-user feature entirely.
-- ----------------------------------------------------------------------------

COMMENT ON FUNCTION public.delete_user_by_admin(text) IS
  'Admin-only account deletion, gated by is_admin(auth.uid()) against the admins table. EXECUTE is granted to `authenticated` broadly; safe today only because auth.uid() rejects the mobile app''s non-UUID JWT subs. Confirm the admin panel''s connection role before narrowing this grant.';


-- ----------------------------------------------------------------------------
-- FIND-04 (Low): two unrelated `is_admin` overloads. Documented, not renamed
-- — a rename would need coordinating with the admin panel codebase, which
-- calls these directly by name.
-- ----------------------------------------------------------------------------

COMMENT ON FUNCTION public.is_admin(text) IS
  'Checks profile_core.is_admin — a per-profile trust & safety flag on mobile-app users. NOT the same as is_admin(uuid) below.';
COMMENT ON FUNCTION public.is_admin(uuid) IS
  'Checks membership in the separate admins table via Supabase Auth email — gates the admin panel / delete_user_by_admin(). NOT the same as is_admin(text) above, which checks a per-profile flag.';


-- ----------------------------------------------------------------------------
-- FIND-05 (Low): legacy `_archive` tables (renamed away from their live names
-- in 20260724040000_archive_legacy_tables.sql) still carry the original
-- tables' anon/authenticated grants.
--
-- profiles_archive and push_subscriptions_archive have no live writer in this
-- app — the client only ever references `profiles`/`push_subscriptions`,
-- which now resolve to the current, non-archived tables (confirmed: no
-- `.from('profiles_archive'/'push_subscriptions_archive')` anywhere in this
-- repo) — so neither needs to stay reachable over the public API.
-- ----------------------------------------------------------------------------

REVOKE ALL ON public.profiles_archive FROM anon, authenticated;
REVOKE ALL ON public.push_subscriptions_archive FROM anon, authenticated;

-- preregistrations_archive keeps its anon INSERT untouched: unlike the two
-- tables above, a still-live external sign-up form (not in this repo) may
-- point at it rather than at the newer `waitlist` table — confirm before
-- revoking INSERT. Everything else in the ALL bundle
-- (SELECT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER) was never used by
-- anon/authenticated (only preregistrations_select_admin, gated on
-- is_panel_admin(), reads it), so all of that is safe to strip regardless —
-- then re-grant exactly the one INSERT policy needs.
REVOKE ALL ON public.preregistrations_archive FROM anon, authenticated;
GRANT INSERT ON public.preregistrations_archive TO anon;
