import { supabase } from './supabase';

// Reasons offered in the report sheet. The stored value is the `code` — keep
// these stable, the safety team filters on them; `label` is free to reword.
export const REPORT_REASONS = [
  { code: 'fake_profile',      label: 'Fake profile or scam' },
  { code: 'inappropriate',     label: 'Inappropriate photos or bio' },
  { code: 'harassment',        label: 'Harassment or hate speech' },
  { code: 'solicitation',      label: 'Asking for money or spam' },
  { code: 'underage',          label: 'User appears to be under 18' },
  { code: 'other',             label: 'Something else' },
];

/**
 * File a report against another user. Reports are insert-only for the
 * reporter (see the reports RLS policies) and are retained for review even if
 * the reported account is later deleted.
 */
export async function reportUser(uid, targetId, reason, details = null) {
  if (!uid || !targetId) return { error: new Error('Missing user') };
  if (!reason) return { error: new Error('Missing reason') };

  const { error } = await supabase.from('reports').insert({
    reporter_id: uid,
    reported_id: targetId,
    reason,
    details: details?.trim() || null,
  });
  return { error };
}
