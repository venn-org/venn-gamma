require('dotenv').config({path: '.env'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testAreas() {
  const uid = 'test-uid-' + Date.now();
  // 'profiles' is now a view over profile_core/profile_lifestyle/profile_preferences;
  // Postgres can't run an upsert's ON CONFLICT against a view, so this is a plain
  // insert now (uid is always fresh here anyway).
  const { data, error } = await supabase.from('profiles').insert({ id: uid, pref_areas: ['South Delhi'] });
  console.log('Error:', JSON.stringify(error, null, 2));
}
testAreas();
