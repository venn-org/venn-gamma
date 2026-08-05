/**
 * Validated environment access.
 *
 * Every `process.env.EXPO_PUBLIC_*` reference has to be written out literally —
 * Expo inlines these at build time by substituting the exact text, so a
 * computed lookup like `process.env[name]` resolves to undefined in a release
 * bundle even when the variable is set.
 *
 * Missing config used to surface as `createClient(undefined, undefined)` and
 * then as an unreadable network error on the first query. Failing here instead
 * names the variable and the file to put it in.
 */

const RAW = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  vapidPublicKey: process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY,
  // Deliberately not in REQUIRED: monitoring must never be the reason the app
  // fails to boot. Absent DSN just means lib/monitoring.js stays inert.
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
};

const REQUIRED = ['supabaseUrl', 'supabaseAnonKey'];

const ENV_VAR_NAMES = {
  supabaseUrl: 'EXPO_PUBLIC_SUPABASE_URL',
  supabaseAnonKey: 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  vapidPublicKey: 'EXPO_PUBLIC_VAPID_PUBLIC_KEY',
  sentryDsn: 'EXPO_PUBLIC_SENTRY_DSN',
};

function validate(raw) {
  const missing = REQUIRED.filter((key) => !raw[key]);
  if (missing.length > 0) {
    const names = missing.map((k) => ENV_VAR_NAMES[k]).join(', ');
    throw new Error(
      `Missing required environment variable(s): ${names}.\n` +
        'Copy .env.example to .env and fill them in (see README → Setup), ' +
        'then restart the dev server — Expo only reads .env at startup.',
    );
  }

  if (raw.supabaseUrl && !/^https?:\/\//.test(raw.supabaseUrl)) {
    throw new Error(
      `EXPO_PUBLIC_SUPABASE_URL must be a full URL including the scheme, got "${raw.supabaseUrl}".`,
    );
  }

  // A service_role key here would grant every user of the app full,
  // RLS-bypassing database access. It is distinguishable from the anon key by
  // its payload, so the mistake is worth catching at startup rather than in a
  // breach report.
  if (raw.supabaseAnonKey && looksLikeServiceRoleKey(raw.supabaseAnonKey)) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_ANON_KEY looks like a service_role key. ' +
        'That key bypasses RLS and must never ship in a client bundle — ' +
        'use the anon/public key from the same dashboard page.',
    );
  }

  return raw;
}

function looksLikeServiceRoleKey(key) {
  try {
    const payload = key.split('.')[1];
    if (!payload) return false;
    // atob exists on web and in Hermes; guard anyway so validation can never
    // be the thing that crashes startup.
    const decoded = typeof atob === 'function' ? atob(payload) : '';
    return decoded.includes('service_role');
  } catch {
    return false;
  }
}

export const env = validate(RAW);

/** True on a local/dev bundle. Kept here so callers don't sprinkle `__DEV__`. */
export const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
