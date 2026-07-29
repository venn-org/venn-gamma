/**
 * Local-calendar date helpers.
 *
 * Kept separate from lib/dailyLimits.js — which pulls in AsyncStorage and the
 * Supabase client — so the day-boundary logic can be unit-tested as the pure
 * arithmetic it is, with no native module mocks in the way.
 */

/**
 * Local calendar date as YYYY-MM-DD.
 *
 * `toISOString().slice(0, 10)` — what the daily-limit code used to use — is
 * the UTC date. In the app's market (IST, UTC+5:30) that made every "daily"
 * allowance reset at 05:30 in the morning rather than at midnight, and made
 * the AsyncStorage bonus key roll over at a different instant than the like
 * count it modified.
 */
export function getTodayString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Start (inclusive) and end (exclusive) of the local day, as ISO instants for
 * comparison against timestamptz columns.
 *
 * Half-open on purpose: the previous `lte '<day>T23:59:59Z'` bound silently
 * dropped anything in the final second of the day.
 */
export function localDayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}
