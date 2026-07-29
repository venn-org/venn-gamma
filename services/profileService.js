import { supabase } from '../lib/supabase';
import { MY_PROFILE_COLUMNS, PROFILE_CARD_COLUMNS, PROFILE_SUMMARY_COLUMNS } from './columns';
import { warn, describeError } from '../lib/log';

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
 * `genderFilter` is pushed into the query rather than applied after the fetch.
 * It is the only hard preference (see lib/prefs.js#matchesPrefs), so filtering
 * it server-side means the row budget is spent on profiles that can actually
 * appear — previously a "women only" preference could have most of the fetched
 * page discarded on the client, leaving a short deck for no visible reason.
 */
export async function fetchFeedCandidates({ uid, limit, genderFilter = null }) {
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

  const { data, error } = await query;
  return { data: data ?? [], error };
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
