import { supabase } from '../lib/supabase';
import { PROFILE_CARD_COLUMNS } from './columns';
import { matchPairFilter } from './queryFilters';
import { warn, describeError } from '../lib/log';

/** PostgreSQL unique_violation — a duplicate like is a no-op, not a failure. */
const UNIQUE_VIOLATION = '23505';

/**
 * PostgREST reports a missing RPC as PGRST202 (schema cache) or 42883
 * (undefined_function). Either means `like_profile` has not been applied to
 * this database yet, so the client falls back to the legacy insert path.
 */
const MISSING_RPC_CODES = new Set(['PGRST202', '42883']);

let rpcAvailable = null; // null = unknown, false = confirmed missing

/**
 * Send a like.
 *
 * Prefers the `like_profile` RPC (see
 * supabase/migrations/20260729120000_like_profile_rpc.sql), which checks the
 * daily allowance and inserts inside a single transaction. Enforcing the limit
 * on the client can't work: the check and the insert are separate round-trips,
 * so a fast double-tap slips past, and the bonus allowance lives in
 * AsyncStorage where anyone can grant themselves more.
 *
 * Falls back to the plain insert when the migration has not been applied, so
 * pulling this code does not require a database push to keep liking working.
 *
 * `reason` distinguishes refusals the user can do something about from ones
 * they cannot:
 *   - 'limit_reached' — out of likes today; offering more likes helps.
 *   - 'not_accepted'  — the recipient's gender preference excludes this
 *                       profile; no amount of likes will change that.
 *   - 'blocked'       — one of the two has blocked the other.
 *
 * @returns {{ ok: boolean, reason?: string, remaining: number|null, matched: boolean, matchId?: string, error?: object }}
 */
export async function sendLike(uid, targetId) {
  if (!uid || !targetId) {
    return { ok: false, remaining: null, matched: false, error: new Error('Missing user') };
  }

  if (rpcAvailable !== false) {
    const { data, error } = await supabase.rpc('like_profile', { p_target_id: targetId });

    if (!error) {
      rpcAvailable = true;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        ok: !!row?.ok,
        // `reason` is only present once 20260730090000 is applied; before that
        // the only refusal the RPC could produce was the daily limit.
        reason: row?.ok ? undefined : (row?.reason ?? 'limit_reached'),
        remaining: row?.remaining ?? null,
        matched: !!row?.matched,
        matchId: row?.match_id ?? undefined,
      };
    }

    if (!MISSING_RPC_CODES.has(error.code)) {
      return { ok: false, remaining: null, matched: false, error };
    }

    rpcAvailable = false;
    warn('like_profile RPC unavailable — falling back to client-side limit', describeError(error));
  }

  return sendLikeLegacy(uid, targetId);
}

/** PostgreSQL insufficient_privilege — the likes trigger's refusal code. */
const INSUFFICIENT_PRIVILEGE = '42501';

/** Pre-RPC path: insert, then look up whether that completed a match. */
async function sendLikeLegacy(uid, targetId) {
  const { error } = await supabase
    .from('likes')
    .insert({ from_user_id: uid, to_user_id: targetId });

  // The gender rule is enforced by the likes INSTEAD OF INSERT trigger too, so
  // it applies on this path as well — it surfaces as a raise, not a row count.
  if (error?.code === INSUFFICIENT_PRIVILEGE) {
    return { ok: false, reason: 'not_accepted', remaining: null, matched: false };
  }

  if (error && error.code !== UNIQUE_VIOLATION) {
    return { ok: false, remaining: null, matched: false, error };
  }

  const matchId = await findMatchId(uid, targetId);
  return { ok: true, remaining: null, matched: !!matchId, matchId };
}

/**
 * The match between two users, if one exists.
 *
 * The mutual-like trigger (create_match_on_mutual_like) runs as part of the
 * like insert, so a match completed by that like is already visible here.
 * Checking this way rather than subscribing to all match events keeps the
 * celebration tied to the user's own action.
 */
export async function findMatchId(uid, targetId) {
  const { data, error } = await supabase
    .from('matches')
    .select('id')
    .or(matchPairFilter(uid, targetId))
    .maybeSingle();

  if (error) {
    warn('findMatchId failed', describeError(error));
    return null;
  }
  return data?.id ?? null;
}

/** Everyone who has liked this user, newest first, with their profile. */
export async function fetchIncomingLikes(uid) {
  if (!uid) return { data: [], error: null };
  const { data, error } = await supabase
    .from('likes')
    .select(`id, created_at, from_user_id, profiles!from_user_id(${PROFILE_CARD_COLUMNS})`)
    .eq('to_user_id', uid)
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}

/** Ids of everyone currently in this user's likes queue. */
export async function fetchLikerIds(uid) {
  if (!uid) return [];
  const { data, error } = await supabase.from('likes').select('from_user_id').eq('to_user_id', uid);

  if (error) {
    warn('fetchLikerIds failed', describeError(error));
    return [];
  }
  return (data ?? []).map((l) => l.from_user_id);
}

/**
 * Dismiss a like received by this user.
 *
 * The likes RLS policy only lets the *sender* delete, so the recipient goes
 * through a SECURITY DEFINER RPC — a direct delete silently no-ops.
 */
export async function dismissLike(likeId) {
  const { error } = await supabase.rpc('dismiss_like', { p_like_id: likeId });
  return { error };
}
