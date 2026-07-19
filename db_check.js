require('dotenv').config({path: '.env'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testAreas() {
  const uid = 'test-uid-' + Date.now();
  const { data, error } = await supabase.from('profiles').upsert({ id: uid, pref_areas: ['South Delhi'] });
  console.log('Error:', JSON.stringify(error, null, 2));
}
testAreas();
