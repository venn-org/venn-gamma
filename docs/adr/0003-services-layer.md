# ADR 0003 — All database access goes through `services/`

**Status:** accepted
**Date:** 2026-07-29

## Context

Nine screens imported the Supabase client and wrote queries inline. The
consequences were concrete, not stylistic:

- A column rename meant grepping JSX.
- `select('*')` on the `profiles` view appeared in five places. Because `*`
  follows the view, every new column shipped to every client automatically —
  which is how exact GPS coordinates and full dates of birth became readable by
  any signed-in user until migration `20260727001000` masked them.
- The same "attach flat_details to these profiles" logic was reimplemented in
  the feed, the likes grid and the chat sheet, each mutating the fetched rows in
  place.
- Filter strings were built by interpolating ids into `.or(...)` in four files.

## Decision

Every Supabase read and write lives in `services/`. Screens call a service
function; an ESLint `no-restricted-imports` rule warns when a file under `app/`
or `components/` imports the client directly.

Supporting pieces:

- `services/columns.js` — explicit column lists. What leaves the database is
  decided here, once.
- `services/queryFilters.js` — validated filter-string construction. Ids are
  rejected if they contain PostgREST metacharacters, which makes filter
  injection impossible by construction rather than by luck.
- `services/index.js` deliberately re-exports only the pure helpers. Barrel-
  exporting every service would drag the Supabase client into any module that
  wanted one utility.

## Consequences

- Screens become testable: mock a service, not a query builder chain.
- This is the seam a server-state library (TanStack Query) would sit on. That
  is the intended next step — the hand-rolled fetch/loading/refresh/poll
  machinery in each screen is the largest remaining source of accidental
  complexity.
- Services currently return `{ data, error }` or a plain value inconsistently,
  mirroring how each call site already handled failure. Worth unifying when the
  query layer lands.
