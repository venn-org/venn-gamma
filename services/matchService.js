import { supabase } from '../lib/supabase';
import { matchMembershipFilter } from './queryFilters';
import { warn, describeError } from '../lib/log';

/** Every active match this user is part of. */
export async function fetchMyMatches(uid) {
  if (!uid) return { data: [], error: null };
  const { data, error } = await supabase
    .from('matches')
    .select('id, user1_id, user2_id')
    .or(matchMembershipFilter(uid));

  return { data: data ?? [], error };
}

/** Ids of everyone this user is already matched with. */
export async function fetchMatchedUserIds(uid) {
  const { data, error } = await fetchMyMatches(uid);
  if (error) {
    warn('fetchMatchedUserIds failed', describeError(error));
    return new Set();
  }
  return new Set(data.map((m) => (m.user1_id === uid ? m.user2_id : m.user1_id)));
}

/**
 * Matches with only their newest message embedded.
 *
 * The `limit(1, { referencedTable })` matters: an unbounded embed pulls every
 * conversation's entire history on each load just to read its last row.
 */
export async function fetchMatchesWithLatestMessage(uid) {
  if (!uid) return { data: [], error: null };
  const { data, error } = await supabase
    .from('matches')
    .select(
      `
        id, user1_id, user2_id,
        messages(id, content, sender_id, read, created_at)
      `,
    )
    .or(matchMembershipFilter(uid))
    .order('created_at', { referencedTable: 'messages', ascending: false })
    .limit(1, { referencedTable: 'messages' });

  return { data: data ?? [], error };
}

/** The two participants of a match. */
export async function fetchMatchParticipants(matchId) {
  if (!matchId) return null;
  const { data, error } = await supabase
    .from('matches')
    .select('user1_id, user2_id')
    .eq('id', matchId)
    .single();

  if (error) {
    warn('fetchMatchParticipants failed', describeError(error));
    return null;
  }
  return data;
}

/** The other participant in a match, from this user's perspective. */
export async function fetchOtherParticipantId(matchId, uid) {
  const data = await fetchMatchParticipants(matchId);
  if (!data) return null;
  return data.user1_id === uid ? data.user2_id : data.user1_id;
}
