import { supabase } from '../lib/supabase';
import { fetchMyMatches } from './matchService';
import { fetchLikerIds } from './likeService';
import { fetchUnreadMessageCount } from './messageService';
import { warn, describeError } from '../lib/log';

/**
 * Tab badge counts.
 *
 * Three queries per refresh, fired by a poll *and* by every realtime message
 * event app-wide. Consolidating them here makes that cost visible in one
 * place, and is the natural seam for replacing all three with a single
 * `unread_counts()` RPC — the right end state, but a schema change, so the
 * shape is prepared here first.
 */
export async function fetchBadgeCounts(uid) {
  if (!uid) return { likes: 0, messages: 0 };

  try {
    const [{ data: matches }, likerIds] = await Promise.all([
      fetchMyMatches(uid),
      fetchLikerIds(uid),
    ]);

    const matchIds = matches.map((m) => m.id);
    const matchedUserIds = new Set(
      matches.map((m) => (m.user1_id === uid ? m.user2_id : m.user1_id)),
    );

    // A mutual like already turned into a match is never cleaned up from
    // `likes` server-side, so exclude anyone already matched — otherwise the
    // badge over-counts against what the Likes tab actually shows.
    const likes = likerIds.filter((id) => !matchedUserIds.has(id)).length;
    const messages = await fetchUnreadMessageCount(matchIds, uid);

    return { likes, messages };
  } catch (e) {
    warn('fetchBadgeCounts failed', describeError(e));
    return null; // null = "keep whatever is on screen", not "zero".
  }
}

/**
 * Realtime triggers for the badges.
 *
 * `likes`/`matches` are client-facing views over `*_log` tables, and Postgres
 * logical replication (which realtime is built on) only fires on real tables —
 * so this must subscribe to `likes_log`, not the `likes` view. Dismissing a
 * like soft-revokes (UPDATE revoked_at) rather than deleting, hence UPDATE
 * rather than DELETE.
 *
 * `messages` cannot be filtered server-side to "rows in my matches" — a
 * realtime filter takes a single column and match membership needs a join —
 * so every message insert app-wide reaches this client (RLS still decides what
 * is delivered). The caller debounces accordingly.
 */
export function subscribeToBadgeEvents(uid, onChange) {
  const channel = supabase
    .channel('tab-badges')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'likes_log', filter: `to_user_id=eq.${uid}` },
      onChange,
    )
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'likes_log' }, onChange)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, onChange)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
