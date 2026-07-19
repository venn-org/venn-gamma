require('dotenv').config({path: '.env'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
supabase.from('profiles').select('*').limit(1).then(({data}) => console.log(JSON.stringify(data[0], null, 2))).catch(console.error);
