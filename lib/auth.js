/**
 * Supabase Auth helpers.
 *
 * Two methods are supported: email OTP (a 6-digit code, not a magic link) and
 * Google OAuth. RLS reads `auth.jwt() ->> 'sub'` — the user's UUID as text —
 * which is what lands in the text `profile_core.id` column.
 */
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Cached session
//
// Callers all over the app read the current user id synchronously
// (`getCurrentUserId()`), but every Supabase auth read is async. Keep the last
// known session in module scope and let the auth listener keep it honest.
// ---------------------------------------------------------------------------

let cachedSession = null;

/** Called by the root layout's auth listener; also primed by `loadSession`. */
export function setCachedSession(session) {
  cachedSession = session ?? null;
}

/**
 * Read the session from storage (and, on web, from an OAuth redirect in the
 * URL — supabase-js resolves that before `getSession()` returns). Primes the
 * cache so `getCurrentUserId()` works from the first render onwards.
 */
export async function loadSession() {
  const { data } = await supabase.auth.getSession();
  setCachedSession(data.session);
  return data.session;
}

/** Subscribe to auth changes. Returns an unsubscribe function. */
export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    setCachedSession(session);
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}

/**
 * Returns the UUID of the currently signed-in user, or null.
 */
export function getCurrentUserId() {
  return cachedSession?.user?.id ?? null;
}

/** The signed-in user's email, or null. */
export function getCurrentUserEmail() {
  return cachedSession?.user?.email ?? null;
}

// ---------------------------------------------------------------------------
// Email OTP resend throttling
//
// Supabase enforces its own server-side rate limit; this only exists so the
// UI can show a sensible cooldown instead of surfacing a 429.
// ---------------------------------------------------------------------------

const OTP_KEY = 'venn_email_otp_attempts';
const MAX_DAILY_ATTEMPTS = 5; // per address per day
const COOLDOWN_MS = 60_000; // 60s between requests

/**
 * Read persisted attempt map from storage.
 *
 * AsyncStorage rather than localStorage: React Native defines a global
 * `window` but no `localStorage`, so the old `typeof localStorage !==
 * 'undefined'` guard was permanently false on native — the throttle silently
 * did nothing there and every resend fell through to Supabase's 429.
 */
async function readAttempts() {
  try {
    const raw = await AsyncStorage.getItem(OTP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

/** Persist attempt map to storage. */
async function writeAttempts(map) {
  try {
    await AsyncStorage.setItem(OTP_KEY, JSON.stringify(map));
  } catch { /* storage unavailable */ }
}

/**
 * Check whether we're allowed to send another code to `email`.
 * Returns `{ allowed: true }` or `{ allowed: false, reason: string }`.
 */
export async function canSendEmailOtp(email) {
  const key = String(email).toLowerCase();
  const map = await readAttempts();
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const entry = map[key];

  if (entry && entry.date === today) {
    if (entry.count >= MAX_DAILY_ATTEMPTS) {
      return { allowed: false, reason: 'Too many attempts today. Try again tomorrow.' };
    }
    if (Date.now() - entry.lastTs < COOLDOWN_MS) {
      const secs = Math.ceil((COOLDOWN_MS - (Date.now() - entry.lastTs)) / 1000);
      return { allowed: false, reason: `Please wait ${secs}s before requesting another code.` };
    }
  }
  return { allowed: true };
}

/** Record that we just sent a code to `email`. */
async function recordEmailOtpSent(email) {
  const key = String(email).toLowerCase();
  const map = await readAttempts();
  const today = new Date().toISOString().slice(0, 10);
  const entry = map[key];

  if (entry && entry.date === today) {
    entry.count += 1;
    entry.lastTs = Date.now();
  } else {
    map[key] = { date: today, count: 1, lastTs: Date.now() };
  }
  await writeAttempts(map);
}

// ---------------------------------------------------------------------------
// Pending sign-in address
//
// The OTP screen needs to know which address the code went to. It used to be
// passed as a route param, which put the user's email address in the web
// build's URL bar, its browser history, and any referrer header. Hold it in
// module scope instead — both screens live in the same session, and losing it
// on a hard reload just bounces the user back one step to re-enter it.
// ---------------------------------------------------------------------------

let pendingEmail = null;

export function setPendingEmail(email) {
  pendingEmail = email ? String(email).trim().toLowerCase() : null;
}

export function getPendingEmail() {
  return pendingEmail;
}

/** Basic shape check — the real validation is the code actually arriving. */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

// ---------------------------------------------------------------------------
// Email OTP
// ---------------------------------------------------------------------------

/**
 * Send a 6-digit sign-in code.
 *
 * `mode` gives us the signin/signup distinction Firebase's email link couldn't:
 * with `shouldCreateUser: false` Supabase refuses to mint a new user, so
 * "Sign in" with an unknown address fails instead of silently registering.
 *
 * NOTE: this only sends a code if the "Magic Link" email template in the
 * Supabase dashboard renders `{{ .Token }}`. The stock template renders
 * `{{ .ConfirmationURL }}`, which sends a link instead.
 */
export async function sendEmailOtp(email, mode = 'signup') {
  const address = String(email).trim().toLowerCase();

  if (!isValidEmail(address)) {
    throw new Error('Please enter a valid email address.');
  }

  const check = await canSendEmailOtp(address);
  if (!check.allowed) throw new Error(check.reason);

  const { error } = await supabase.auth.signInWithOtp({
    email: address,
    options: { shouldCreateUser: mode !== 'signin' },
  });
  if (error) throw error;

  await recordEmailOtpSent(address);
}

/**
 * Verify a 6-digit email code. On success the session is stored and the auth
 * listener picks it up.
 */
export async function verifyEmailOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: String(email).trim().toLowerCase(),
    token: String(token).trim(),
    type: 'email',
  });
  if (error) throw error;
  setCachedSession(data.session);
  return data.session;
}

// ---------------------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------------------

/**
 * Sign in with Google.
 *
 * Web: hand off to Supabase's redirect and let `detectSessionInUrl` swap the
 * returned `?code=` for a session when we land back on the origin.
 *
 * Native: we can't be redirected to, so open the consent screen in an auth
 * session, catch the `venn://` deep link, and exchange the code ourselves.
 */
export async function signInWithGoogle() {
  const redirectTo = Platform.OS === 'web'
    ? (typeof window !== 'undefined' ? window.location.origin : undefined)
    : Linking.createURL('/');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      // Native drives the browser itself; without this supabase-js would try
      // to navigate a window that isn't there.
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });
  if (error) throw error;

  // Web: the browser is already navigating away.
  if (Platform.OS === 'web') return;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') {
    // User dismissed the sheet — not an error worth surfacing.
    const err = new Error('Sign-in cancelled.');
    err.code = 'oauth-cancelled';
    throw err;
  }

  const code = new URL(result.url).searchParams.get('code');
  if (!code) throw new Error('Google sign-in did not return an authorization code.');

  const { data: exchanged, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;

  setCachedSession(exchanged.session);
  return exchanged.session;
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

export async function signOutUser() {
  await supabase.auth.signOut();
  setCachedSession(null);
}

/**
 * Abandon a signup in progress: delete the (still-empty) profile row
 * ensureProfile() created and sign out. Without the sign-out, the root
 * layout's route guard would see an active session with onboarding
 * incomplete and immediately bounce the user right back into onboarding.
 */
export async function deleteAccountAndSignOut() {
  const uid = getCurrentUserId();
  if (uid) {
    const { error } = await supabase.from('profiles').delete().eq('id', uid);
    if (error) console.error('Failed to delete incomplete profile:', error);
  }
  await signOutUser();
}

// ---------------------------------------------------------------------------
// Profile upsert — call after any successful sign-in
// ---------------------------------------------------------------------------

/**
 * Ensure a profiles row exists for the current user.
 */
export async function ensureProfile() {
  const uid = getCurrentUserId();
  if (!uid) return;

  const { error } = await supabase
    .from('profiles')
    .insert({ id: uid });

  if (error && error.code !== '23505') { // 23505 is PostgreSQL unique_violation
    console.error('Profile upsert failed:', error);
    if (typeof alert !== 'undefined') {
      alert(`Failed to initialize user profile: ${error.message}`);
    }
  }
}

/**
 * Check if onboarding is complete for the current user.
 */
export async function isOnboardingComplete() {
  const uid = getCurrentUserId();
  if (!uid) return false;
  const { data } = await supabase
    .from('profiles')
    .select('onboarding_done')
    .eq('id', uid)
    .single();
  return !!data?.onboarding_done;
}

const onboardingListeners = new Set();
export function subscribeOnboardingComplete(cb) {
  onboardingListeners.add(cb);
  return () => onboardingListeners.delete(cb);
}
export function notifyOnboardingComplete() {
  onboardingListeners.forEach(cb => cb());
}
