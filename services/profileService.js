import { supabase } from '../lib/supabase';
import { MY_PROFILE_COLUMNS, PROFILE_CARD_COLUMNS, PROFILE_SUMMARY_COLUMNS } from './columns';
import { assertFilterSafeId } from './queryFilters';
import { warn, describeError } from '../lib/log';
import { traceJourney } from '../lib/monitoring';

/**
 * All reads and writes against the `profiles` view.
 *
 * Screens call these instead of holding queries inline, so a schema change is
 * one file to update rather than a grep through JSX — and so the column lists
 * in ./columns.js are the single place that decides what leaves the database.
 */

/** The signed-in user's own row. */
export async function fetchMyProfile(uid) {
  if (!uid) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select(MY_PROFILE_COLUMNS)
    .eq('id', uid)
    .single();

  if (error) {
    warn('fetchMyProfile failed', describeError(error));
    return null;
  }
  return data;
}

/** Another user's card-visible profile. */
export async function fetchProfileById(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_CARD_COLUMNS)
    .eq('id', userId)
    .single();

  if (error) {
    warn('fetchProfileById failed', describeError(error));
    return null;
  }
  return data;
}

/** Summary rows for a set of ids, keyed by id. */
export async function fetchProfileSummaries(userIds) {
  const ids = [...new Set((userIds ?? []).filter(Boolean))];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SUMMARY_COLUMNS)
    .in('id', ids);

  if (error) {
    warn('fetchProfileSummaries failed', describeError(error));
    return new Map();
  }
  return new Map((data ?? []).map((p) => [p.id, p]));
}

/**
 * Feed candidates: everyone but me, not paused, onboarded, most recently
 * active first.
 *
 * Both directions of the gender rule are pushed into the query rather than
 * applied after the fetch, so the row budget is spent on profiles that can
 * actually appear:
 *
 *   `genderFilter`     — MY preference about them. The only hard preference
 *                        (see lib/prefs.js#matchesPrefs).
 *   `acceptingPrefs`   — THEIR preference about me. Someone who accepts only
 *                        men will refuse a like from anyone else
 *                        (like_profile enforces it), so showing them is a dead
 *                        end: the user spends a swipe on a card whose like
 *                        button can only ever fail.
 *
 * `pref_gender IS NULL` counts as accepting — a user who never stated a
 * preference has not excluded anyone.
 */
export async function fetchFeedCandidates({
  uid,
  limit,
  genderFilter = null,
  acceptingPrefs = null,
}) {
  if (!uid) return { data: [], error: null };

  let query = supabase
    .from('profiles')
    .select(PROFILE_CARD_COLUMNS)
    .neq('id', uid)
    .eq('paused', false)
    .eq('onboarding_done', true)
    .order('last_active_at', { ascending: false })
    .limit(limit);

  if (genderFilter) query = query.eq('gender', genderFilter);

  if (acceptingPrefs?.length) {
    // Values are enum constants from lib/prefs.js, never user input, but they
    // are still spliced into a filter expression — keep them shaped like ids.
    acceptingPrefs.forEach((p) => assertFilterSafeId(p, 'pref_gender'));
    query = query.or(`pref_gender.is.null,pref_gender.in.(${acceptingPrefs.join(',')})`);
  }

  const { data, error } = await query;
  return { data: data ?? [], error };
}

/**
 * PostgREST reports a missing RPC as PGRST202 (schema cache) or 42883
 * (undefined_function) — either means 20260731000000_feed_ranking_rpc.sql has
 * not been applied here yet.
 */
const MISSING_RPC_CODES = new Set(['PGRST202', '42883']);

let feedRpcAvailable = null; // null = unknown, false = confirmed missing

/**
 * One ranked page of the feed.
 *
 * The ranking is the database's (see
 * supabase/migrations/20260731000000_feed_ranking_rpc.sql). That is the whole
 * point: fetchFeedCandidates above can only order by `last_active_at` and hand
 * the client a page to sort, so the "best match" was always the best of an
 * arbitrary 200 — the scoring never saw the rest of the pool. The RPC scores
 * everyone eligible, then pages.
 *
 * It also returns things the client cannot compute at all:
 *   `reciprocal_score` — how well I fit THEIR stated preferences, which needs
 *                        every candidate's preference row.
 *   `distance_km`      — real PostGIS distance; the coordinates it comes from
 *                        stay masked (see enforce_coords_private).
 *   and an exposure term that damps profiles already flooded with likes, which
 *   depends on what every OTHER user is doing.
 *
 * Blocks, prior likes, incomplete profiles and both halves of the gender rule
 * are applied in SQL, so `data` needs no post-filtering — unlike the legacy
 * path, whose callers must still do all of it.
 *
 * Returns `{ data, error, ranked }`. `ranked: false` means the fallback ran and
 * the caller still owns filtering and ordering.
 */
export async function fetchFeedPage(options = {}) {
  // Named span, on top of the automatic fetch instrumentation: this is the
  // query docs/PERFORMANCE.md identifies as the app's architectural hot spot
  // (whole-pool reciprocal scoring, ~135ms of inherent eligibility cost at
  // 50k profiles), so it is worth being able to watch its real p95 rather
  // than inferring it from an anonymous RPC POST among hundreds.
  return traceJourney('feed.load', () => fetchFeedPageInner(options));
}

async function fetchFeedPageInner({
  limit = 40,
  offset = 0,
  maxDistanceKm = null,
  excludeViewed = false,
} = {}) {
  if (feedRpcAvailable !== false) {
    const { data, error } = await supabase.rpc('feed_candidates', {
      p_limit: limit,
      p_offset: offset,
      p_max_distance_km: maxDistanceKm,
      p_exclude_viewed: excludeViewed,
    });

    if (!error) {
      feedRpcAvailable = true;
      return { data: data ?? [], error: null, ranked: true };
    }

    if (!MISSING_RPC_CODES.has(error.code)) {
      warn('feed_candidates failed', describeError(error));
      return { data: [], error, ranked: true };
    }

    feedRpcAvailable = false;
    warn('feed_candidates RPC unavailable — falling back to client ranking', describeError(error));
  }

  return { data: [], error: null, ranked: false };
}

/**
 * Permanently delete the signed-in user's account.
 *
 * A SECURITY DEFINER RPC, because the cascade spans tables the client has no
 * direct delete rights on.
 */
export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_account');
  if (error) warn('deleteAccount failed', describeError(error));
  return { error };
}

/** Partial update of the current user's profile. */
export async function updateMyProfile(uid, updates) {
  if (!uid) return { error: new Error('Not signed in') };
  const { error } = await supabase.from('profiles').update(updates).eq('id', uid);
  if (error) warn('updateMyProfile failed', describeError(error));
  return { error };
}

/**
 * Attaches each owner's flat photos/description to the given profiles.
 *
 * `flat_details` is a separate table and is not embeddable through the
 * `profiles` view, so it needs its own query — one `in(...)` for the whole
 * page rather than a lookup per card.
 *
 * Returns new objects: mutating the fetched rows in place (which is what the
 * screens used to do) writes through to every other reference to the same row,
 * and would corrupt any cache placed in front of this.
 */
export async function attachFlatDetails(profiles) {
  const list = profiles ?? [];
  const ownerIds = list.filter((p) => p.user_type === 'owner').map((p) => p.id);
  if (ownerIds.length === 0) {
    return list.map((p) => ({ ...p, flat_photos: [], flat_description: null }));
  }

  const { data: flatRows, error } = await supabase
    .from('flat_details')
    .select('profile_id, photos, description')
    .in('profile_id', ownerIds);

  if (error) warn('attachFlatDetails failed', describeError(error));

  const byProfile = new Map((flatRows ?? []).map((r) => [r.profile_id, r]));
  return list.map((p) => {
    const flat = byProfile.get(p.id);
    return { ...p, flat_photos: flat?.photos ?? [], flat_description: flat?.description ?? null };
  });
}
