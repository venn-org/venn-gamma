import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Validated at import (see config/env.js): missing or malformed config throws
// with the variable name, instead of constructing a client with `undefined`
// credentials that only fails on the first query.
import { env } from '../config/env';

const supabaseUrl = env.supabaseUrl;
const supabaseAnonKey = env.supabaseAnonKey;

// Auth is Supabase's own now, so the client attaches the session token itself —
// no fetch shim. RLS reads `auth.jwt() ->> 'sub'`, which is the user's UUID as
// text, matching the text `profile_core.id` the policies already compare against.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Web already persists to localStorage by default; native needs to be told.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // Only the web build is ever redirected back with the auth code in the URL.
    // On native the OAuth deep link is handed to exchangeCodeForSession()
    // explicitly, and leaving this on would have supabase-js reach for
    // window.location, which doesn't exist there.
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});

// A backgrounded app's timers don't fire, so a token can expire while suspended.
// Drive the refresh loop off foreground/background instead. Web tabs keep their
// timers, so this is native-only.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
