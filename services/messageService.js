import { supabase } from '../lib/supabase';
import { MESSAGE_COLUMNS } from './columns';
import { LIMITS } from '../config/flags';
import { warn, describeError } from '../lib/log';

/**
 * Chat reads and writes.
 *
 * The important change over the inline queries these replace is that nothing
 * here refetches an entire conversation. The old fallback poll ran
 * `select('*')` with no limit every 10 seconds for as long as a chat stayed
 * open, so a 2,000-message thread moved 2,000 rows six times a minute.
 */

/**
 * The newest page of a conversation, returned oldest-first for rendering.
 *
 * Fetching descending and reversing is what makes the limit meaningful — an
 * ascending limit would return the *oldest* messages.
 */
export async function fetchRecentMessages(matchId, limit = LIMITS.chatInitialMessages) {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .eq('match_id', matchId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    warn('fetchRecentMessages failed', describeError(error));
    return { data: [], error };
  }
  return { data: (data ?? []).slice().reverse(), error: null };
}

/** One page older than `beforeIso`, for scroll-back pagination. */
export async function fetchMessagesBefore(matchId, beforeIso, limit = LIMITS.chatInitialMessages) {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .eq('match_id', matchId)
    .lt('created_at', beforeIso)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    warn('fetchMessagesBefore failed', describeError(error));
    return { data: [], error };
  }
  return { data: (data ?? []).slice().reverse(), error: null };
}

/**
 * Everything in this conversation newer than `sinceIso` — the incremental
 * fallback for realtime delivery that was delayed or dropped.
 *
 * `gte` rather than `gt`, because two messages can share a timestamp; callers
 * de-duplicate by id, which is cheaper than risking a dropped message.
 */
export async function fetchMessagesSince(matchId, sinceIso) {
  let query = supabase
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });

  if (sinceIso) query = query.gte('created_at', sinceIso);
  else query = query.limit(LIMITS.chatInitialMessages);

  const { data, error } = await query;
  if (error) {
    warn('fetchMessagesSince failed', describeError(error));
    return { data: [], error };
  }
  return { data: data ?? [], error: null };
}

/** Send a message and return the persisted row. */
export async function sendMessage(matchId, senderId, content) {
  const text = String(content ?? '')
    .trim()
    .slice(0, LIMITS.maxMessageLength);

  if (!text) return { data: null, error: new Error('Empty message') };

  const { data, error } = await supabase
    .from('messages')
    .insert({ match_id: matchId, sender_id: senderId, content: text, read: false })
    .select(MESSAGE_COLUMNS)
    .single();

  return { data, error };
}

/** Mark the other participant's unread messages in this match as read. */
export async function markMessagesRead(matchId, uid) {
  if (!matchId || !uid) return;
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('match_id', matchId)
    .neq('sender_id', uid)
    .eq('read', false);

  if (error) warn('markMessagesRead failed', describeError(error));
}

/** Count of unread messages addressed to this user across the given matches. */
export async function fetchUnreadMessageCount(matchIds, uid) {
  if (!matchIds?.length || !uid) return 0;
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('match_id', matchIds)
    .eq('read', false)
    .neq('sender_id', uid);

  if (error) {
    warn('fetchUnreadMessageCount failed', describeError(error));
    return 0;
  }
  return count ?? 0;
}

/**
 * Subscribe to one conversation.
 *
 * Returns an unsubscribe function; the channel object is passed to
 * `onReady` so the caller can broadcast on it (typing indicators).
 */
export function subscribeToMatch(matchId, { onInsert, onUpdate, onTyping, onReady }) {
  const channel = supabase
    .channel(`room:${matchId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
      (payload) => onInsert?.(payload.new),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
      (payload) => onUpdate?.(payload.new),
    )
    .on('broadcast', { event: 'typing' }, ({ payload }) => onTyping?.(payload))
    .subscribe();

  onReady?.(channel);

  return () => {
    supabase.removeChannel(channel);
  };
}

/** Broadcast a typing ping on an already-subscribed channel. */
export function broadcastTyping(channel, senderId) {
  channel?.send({ type: 'broadcast', event: 'typing', payload: { senderId } });
}
