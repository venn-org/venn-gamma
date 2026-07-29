/**
 * Data access layer.
 *
 * Every Supabase query in the app lives under services/. Screens import from
 * here (or from a specific module) and never touch the client directly — an
 * ESLint rule enforces that for app/ and components/. The point is that a
 * schema change is a change to this directory, not a grep through JSX, and
 * that what leaves the database is decided in ./columns.js rather than
 * incidentally by whichever screen wrote `select('*')` first.
 *
 * Deliberately NOT a re-export of everything: importing one helper should not
 * drag the whole query surface (and the Supabase client with it) into a
 * module's dependency graph. Import the specific service where it matters.
 */
export * from './queryFilters';
export * from './columns';
