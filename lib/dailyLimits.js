import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { LIMITS } from '../config/flags';
import { warn, describeError } from './log';
import { getTodayString, localDayBounds } from './dates';

/**
 * Daily allowances.
 *
 * Authoritative enforcement lives in the database (see
 * supabase/migrations/20260729120000_like_profile_rpc.sql): the check and the
 * insert happen in one transaction there, which is the only way a cap can hold
 * against a double-tap or a modified client. Everything here is either the
 * display value for "N likes left" or the pre-migration fallback path.
 */

const DAILY_LIKES = LIMITS.dailyLikes;
const DAILY_VIEWS = LIMITS.dailyViews;
const BONUS_LIKES_GRANT = LIMITS.bonusLikesGrant;

/** PostgREST codes meaning the RPC is not on this database yet. */
const MISSING_RPC_CODES = new Set(['PGRST202', '42883']);

// Re-exported so existing importers of these helpers keep working.
export { getTodayString, localDayBounds };

export async function getTodayLikes(uid) {
  if (!uid) return 0;
  const { startIso, endIso } = localDayBounds();
  const { count, error } = await supabase
    .from('likes')
    .select('id', { count: 'exact', head: true })
    .eq('from_user_id', uid)
    .gte('created_at', startIso)
    .lt('created_at', endIso);

  if (error) {
    warn('getTodayLikes failed', describeError(error));
    return 0;
  }
  return count ?? 0;
}

function bonusKey(uid) {
  return `venn_like_bonus_${uid}_${getTodayString()}`;
}

/**
 * Locally cached bonus. Only consulted on the fallback path — the server owns
 * the real grant once the migration is applied.
 */
export async function getBonusLikes(uid) {
  if (!uid) return 0;
  try {
    return parseInt((await AsyncStorage.getItem(bonusKey(uid))) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

/**
 * Grant the "get more likes" allowance.
 *
 * Prefers the server RPC, which caps the daily total. The local write is kept
 * as a fallback so the button still works before the migration lands.
 */
export async function grantExtraLikes(uid, amount = BONUS_LIKES_GRANT) {
  if (!uid) return 0;

  const { data, error } = await supabase.rpc('grant_extra_likes');
  if (!error) return data ?? 0;

  if (!MISSING_RPC_CODES.has(error.code)) {
    warn('grant_extra_likes failed', describeError(error));
    return getBonusLikes(uid);
  }

  const next = (await getBonusLikes(uid)) + amount;
  try {
    await AsyncStorage.setItem(bonusKey(uid), String(next));
  } catch (e) {
    warn('grantExtraLikes failed to persist locally', describeError(e));
  }
  return next;
}

/**
 * Likes left today. Asks the server first so the number matches what
 * like_profile() will actually allow.
 */
export async function getRemainingLikes(uid) {
  const { data, error } = await supabase.rpc('remaining_likes_today');
  if (!error) return data ?? 0;

  if (!MISSING_RPC_CODES.has(error.code)) {
    warn('remaining_likes_today failed', describeError(error));
  }

  const [used, bonus] = await Promise.all([getTodayLikes(uid), getBonusLikes(uid)]);
  return Math.max(0, DAILY_LIKES + bonus - used);
}

/**
 * Advisory only — the server rejects an over-limit like regardless. Kept so
 * the UI can show the paywall sheet without waiting for a rejection.
 */
export async function canLikeToday(uid) {
  const remaining = await getRemainingLikes(uid);
  return remaining > 0;
}

export async function getTodayViews(uid) {
  if (!uid) return 0;
  const { startIso, endIso } = localDayBounds();
  const { count, error } = await supabase
    .from('profile_views')
    .select('id', { count: 'exact', head: true })
    .eq('viewer_id', uid)
    .gte('viewed_at', startIso)
    .lt('viewed_at', endIso);

  if (error) {
    warn('getTodayViews failed, using local fallback', describeError(error));
    return getTodayViewsFromStorage(uid);
  }
  return count ?? 0;
}

export async function getRemainingViews(uid) {
  const used = await getTodayViews(uid);
  return Math.max(0, DAILY_VIEWS - used);
}

function viewsKey(uid) {
  return `venn_views_${uid}_${getTodayString()}`;
}

export async function recordProfileView(uid, targetId) {
  if (!uid || !targetId) return;

  // supabase-js resolves with `{ error }` rather than throwing, so this has to
  // be checked explicitly — a try/catch around it never fires.
  const { error } = await supabase.from('profile_views').insert({
    viewer_id: uid,
    viewed_id: targetId,
    viewed_at: new Date().toISOString(),
  });

  // A repeat view of the same profile on the same day trips
  // uq_profile_views_pair_day. That's the constraint working, not a failure.
  if (!error || error.code === '23505') return;

  warn('recordProfileView failed, using local fallback', describeError(error));
  try {
    const key = viewsKey(uid);
    const current = JSON.parse((await AsyncStorage.getItem(key)) ?? '[]');
    if (!current.includes(targetId)) {
      current.push(targetId);
      await AsyncStorage.setItem(key, JSON.stringify(current));
    }
  } catch (e) {
    warn('local view fallback also failed', describeError(e));
  }
}

export async function getTodayViewsFromStorage(uid) {
  try {
    const views = JSON.parse((await AsyncStorage.getItem(viewsKey(uid))) ?? '[]');
    return views.length;
  } catch {
    return 0;
  }
}

export async function getTodayViewedProfileIds(uid) {
  if (!uid) return new Set();
  const { startIso, endIso } = localDayBounds();
  const { data, error } = await supabase
    .from('profile_views')
    .select('viewed_id')
    .eq('viewer_id', uid)
    .gte('viewed_at', startIso)
    .lt('viewed_at', endIso);

  if (!error) return new Set((data ?? []).map((r) => r.viewed_id));

  warn('getTodayViewedProfileIds failed, using local fallback', describeError(error));
  try {
    const views = JSON.parse((await AsyncStorage.getItem(viewsKey(uid))) ?? '[]');
    return new Set(views);
  } catch {
    return new Set();
  }
}
