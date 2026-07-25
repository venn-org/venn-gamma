import { supabase } from './supabase';

export async function fetchFlatDetails(uid) {
  const { data, error } = await supabase
    .from('flat_details')
    .select('*')
    .eq('profile_id', uid)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertFlatDetails(uid, updates) {
  const { data, error } = await supabase
    .from('flat_details')
    .upsert({ profile_id: uid, ...updates }, { onConflict: 'profile_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
