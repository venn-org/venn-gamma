-- ============================================================================
-- Enforce coords_private (and hide date of birth) on the `profiles` view.
--
-- profile_core's SELECT policy is "any signed-in user sees every column", and
-- the view exposed lat/lng and birthday verbatim — so exact GPS coordinates
-- and full date of birth were readable by anyone with an account. The
-- coords_private column has existed since the redesign, defaulting to true,
-- but nothing ever read it.
--
-- `age` is the derived value the UI actually renders, and no screen reads
-- another user's lat/lng (zone/area matching is name-based, see lib/prefs.js),
-- so masking these three costs the client nothing.
--
-- WHY THIS IS BUILT DYNAMICALLY
--
-- Masking has to happen in the view's SELECT list, which means CREATE OR
-- REPLACE VIEW — and that requires the new column list to match the existing
-- one by name, type AND position. A literal DDL statement here failed on the
-- live database with:
--
--   42P16: cannot change name of view column "pronouns" to "location"
--
-- i.e. the deployed view's column order has drifted from the order every
-- migration file in this repo declares (the same class of drift
-- 20260726123000_ensure_profile_pk_constraints.sql documents for the profile
-- primary keys). Rather than hardcode a guess at the live order — which would
-- break again on the next environment — this reads the view's actual column
-- order from the catalog and rebuilds it in place, substituting the masked
-- expressions for lat/lng/birthday and resolving every other column to
-- whichever base table actually owns it.
--
-- Using CREATE OR REPLACE (not DROP + CREATE) keeps the three INSTEAD OF
-- triggers, the grants and the RLS behaviour on the view untouched.
-- ============================================================================

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
      -- Date of birth is self-only; other users get `age`.
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
      -- Resolve the column to its owning table. profile_core wins ties; the
      -- child tables only contribute their own lifestyle/preference columns.
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
        -- Fail loudly rather than silently dropping a column the live view
        -- exposes from somewhere this migration doesn't know about.
        RAISE EXCEPTION 'profiles view column "%" has no source in profile_core/profile_lifestyle/profile_preferences; this migration needs updating before it can rebuild the view', v_col.name;
      END IF;

      v_expr := format('%s.%I AS %I', v_src, v_col.name, v_col.name);
    END IF;

    v_parts := v_parts || v_expr;
  END LOOP;

  IF cardinality(v_parts) = 0 THEN
    RAISE EXCEPTION 'public.profiles has no columns — refusing to rebuild';
  END IF;

  EXECUTE format(
    'CREATE OR REPLACE VIEW public.profiles WITH (security_invoker = true) AS '
    || 'SELECT %s '
    || 'FROM public.profile_core c '
    || 'LEFT JOIN public.profile_lifestyle l ON l.profile_id = c.id '
    || 'LEFT JOIN public.profile_preferences p ON p.profile_id = c.id',
    array_to_string(v_parts, ', ')
  );
END
$mig$;


-- Verify the masking actually landed, so a silent no-op can't pass for success.
-- Only assert for columns the view actually exposes.
DO $check$
DECLARE
  v_def text := pg_get_viewdef('public.profiles'::regclass, true);
  v_col text;
BEGIN
  FOREACH v_col IN ARRAY ARRAY['lat', 'lng', 'birthday'] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_attribute
      WHERE attrelid = 'public.profiles'::regclass
        AND attname = v_col AND attnum > 0 AND NOT attisdropped
    -- A masked column renders as "... END AS <col>"; an unmasked one as
    -- "c.<col> AS <col>", so this can't be satisfied by another column's CASE.
    ) AND v_def NOT LIKE ('%END AS ' || v_col || '%') THEN
      RAISE EXCEPTION 'profiles view rebuilt but "%" is not masked', v_col;
    END IF;
  END LOOP;
END
$check$;
