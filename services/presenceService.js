import { supabase } from '../lib/supabase';
import { warn, describeError } from '../lib/log';

/**
 * Presence writes.
 *
 * `profiles` is a view with INSTEAD OF triggers fanning each write across
 * three tables, and this is the app's most frequent write — so it is worth
 * keeping in one place where the cost is visible.
 */

/** Stamp the current user as active now. */
export async function touchPresence(uid) {
  if (!uid) return;
  const { error } = await supabase
    .from('profiles')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', uid);

  // Non-fatal: a missed heartbeat just shows the user as idle a beat longer.
  if (error) warn('Presence heartbeat failed', describeError(error));
}

/** Another user's last_active_at, for the "Active now" line. */
export async function fetchLastActiveAt(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('last_active_at')
    .eq('id', userId)
    .single();

  if (error) {
    warn('Presence lookup failed', describeError(error));
    return null;
  }
  return data?.last_active_at ?? null;
}
