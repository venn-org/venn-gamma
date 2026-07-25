/**
 * Firebase Auth helpers + phone-OTP spam protection.
 *
 * Every auth operation goes through Firebase; the Supabase client then
 * passes the Firebase JWT via its `accessToken` callback so RLS works.
 */
import { Platform } from 'react-native';
import {
  signInWithEmailLink,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from './firebase';
import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Phone OTP spam protection
// ---------------------------------------------------------------------------

const PHONE_KEY = 'venn_phone_attempts';
const MAX_DAILY_ATTEMPTS = 5; // per phone number per day
const COOLDOWN_MS = 60_000; // 60s between requests

/** Read persisted phone attempt map from storage. */
function readAttempts() {
  try {
    const raw = typeof localStorage !== 'undefined'
      ? localStorage.getItem(PHONE_KEY)
      : null;
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

/** Persist phone attempt map to storage. */
function writeAttempts(map) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PHONE_KEY, JSON.stringify(map));
    }
  } catch { /* storage unavailable */ }
}

/**
 * Check whether we're allowed to send another OTP to `phone`.
 * Returns `{ allowed: true }` or `{ allowed: false, reason: string }`.
 */
export function canSendPhoneOtp(phone) {
  const map = readAttempts();
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const entry = map[phone];

  if (entry && entry.date === today) {
    if (entry.count >= MAX_DAILY_ATTEMPTS) {
      return { allowed: false, reason: `Too many attempts today. Try again tomorrow.` };
    }
    if (Date.now() - entry.lastTs < COOLDOWN_MS) {
      const secs = Math.ceil((COOLDOWN_MS - (Date.now() - entry.lastTs)) / 1000);
      return { allowed: false, reason: `Please wait ${secs}s before requesting another code.` };
    }
  }
  return { allowed: true };
}

/** Record that we just sent an OTP to `phone`. */
export function recordPhoneOtpSent(phone) {
  const map = readAttempts();
  const today = new Date().toISOString().slice(0, 10);
  const entry = map[phone];

  if (entry && entry.date === today) {
    entry.count += 1;
    entry.lastTs = Date.now();
  } else {
    map[phone] = { date: today, count: 1, lastTs: Date.now() };
  }
  writeAttempts(map);
}

/**
 * Validate an Indian mobile number (10 digits, starts with 6-9).
 */
export function isValidIndianPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone);
}

// ---------------------------------------------------------------------------
// Get current user ID (Firebase UID)
// ---------------------------------------------------------------------------

/**
 * Returns the Firebase UID of the currently signed-in user, or null.
 */
export function getCurrentUserId() {
  return auth.currentUser?.uid ?? null;
}

// ---------------------------------------------------------------------------
// Email link (magic link) sign-in
// ---------------------------------------------------------------------------

const EMAIL_KEY = 'venn_email_for_signin';

/**
 * Where Firebase sends the user back to after they click the link.
 *
 * It has to be a route that actually completes the sign-in, so it points at
 * `/email-otp` rather than the origin root — the root defers to the auth guard
 * in `app/_layout.jsx`, which would bounce an unauthenticated visitor straight
 * to /login and drop the `oobCode` on the floor.
 *
 * Whatever origin this resolves to must be listed under Firebase console →
 * Authentication → Settings → Authorized domains (localhost included; it is no
 * longer authorized by default).
 */
function actionCodeSettings() {
  const origin = Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : 'https://venn-21b15.firebaseapp.com';
  return {
    url: `${origin}/email-otp`,
    // Required for email-link sign-in: the operation always completes in-app.
    handleCodeInApp: true,
    // No iOS/android blocks here on purpose — those only did anything via
    // Firebase Dynamic Links, which shut down 2025-08-25. Handing the link back
    // to a native build needs `linkDomain` + App Links / Universal Links instead.
  };
}

/** Thrown by `completeEmailLink` when we can't tell whose link this is. */
export const EMAIL_REQUIRED = 'EMAIL_REQUIRED';

/**
 * Send a sign-in link to the user's email.
 * Store the email so we can complete sign-in when the link is opened.
 */
export async function sendEmailLink(email) {
  await sendSignInLinkToEmail(auth, email, actionCodeSettings());
  // Persist email for the verification step (the link opens in a new tab/app)
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(EMAIL_KEY, email);
  }
}

/** True if `url` is a Firebase email sign-in link. */
export function isPendingEmailLink(url) {
  if (!url) return false;
  try {
    return isSignInWithEmailLink(auth, url);
  } catch {
    return false;
  }
}

/** The email we stashed when the link was requested, or null on another device. */
export function getStoredEmailForSignIn() {
  try {
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem(EMAIL_KEY)
      : null;
  } catch { return null; }
}

/**
 * Complete sign-in from an email link.
 *
 * `email` may be passed explicitly for the cross-device case (link opened on a
 * different device than the one that requested it, so nothing is in storage).
 * Firebase requires the address either way — without it a leaked link could be
 * used to sign in as someone else.
 *
 * Returns the Firebase UserCredential, or null if `url` isn't a sign-in link.
 * Throws an error with `code === EMAIL_REQUIRED` when the address is unknown.
 */
export async function completeEmailLink(url, email) {
  if (!isPendingEmailLink(url)) return null;

  const address = email || getStoredEmailForSignIn();
  if (!address) {
    const err = new Error('Email is required to complete sign-in.');
    err.code = EMAIL_REQUIRED;
    throw err;
  }

  const cred = await signInWithEmailLink(auth, address, url);
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(EMAIL_KEY);
  } catch { /* storage unavailable */ }
  return cred;
}

// ---------------------------------------------------------------------------
// Phone OTP sign-in (web only — native needs @react-native-firebase/auth)
// ---------------------------------------------------------------------------

let recaptchaVerifier = null;

/**
 * Set up the invisible reCAPTCHA verifier (web only).
 * Call this on mount, passing the ID of the container element.
 *
 * Always tears down any prior verifier first — reusing a stale instance
 * whose DOM node was unmounted (e.g. screen remount, HMR) throws
 * "reCAPTCHA client element has been removed" from signInWithPhoneNumber.
 */
export function setupRecaptcha(buttonId) {
  if (Platform.OS !== 'web') return;
  clearRecaptcha();
  recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
    size: 'invisible',
    callback: () => { /* reCAPTCHA solved */ },
  });
}

/**
 * Tear down the reCAPTCHA verifier. Call on unmount so a future remount
 * doesn't reuse a widget bound to a since-removed DOM node.
 */
export function clearRecaptcha() {
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear(); } catch (e) { /* already gone */ }
    recaptchaVerifier = null;
  }
}

/**
 * Send a phone OTP. Returns a ConfirmationResult which is used to verify
 * the code later (pass it to `verifyPhoneOtp`).
 *
 * Includes spam protection checks before sending.
 */
export async function sendPhoneOtp(phone) {
  const fullPhone = `+91${phone}`;

  // Spam protection checks
  const check = canSendPhoneOtp(phone);
  if (!check.allowed) throw new Error(check.reason);

  if (!isValidIndianPhone(phone)) {
    throw new Error('Please enter a valid 10-digit Indian mobile number.');
  }

  if (Platform.OS !== 'web') {
    throw new Error('Phone auth on native requires a development build with @react-native-firebase/auth. Use email or Google sign-in instead.');
  }

  if (!recaptchaVerifier) {
    throw new Error('reCAPTCHA not initialized. Please try again.');
  }

  const confirmationResult = await signInWithPhoneNumber(auth, fullPhone, recaptchaVerifier);
  recordPhoneOtpSent(phone);
  return confirmationResult;
}

/**
 * Verify the phone OTP code.
 */
export async function verifyPhoneOtp(confirmationResult, code) {
  return await confirmationResult.confirm(code);
}

// ---------------------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------------------

const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google (web: popup, native: placeholder for expo-auth-session).
 */
export async function signInWithGoogle() {
  if (Platform.OS === 'web') {
    return await signInWithPopup(auth, googleProvider);
  }
  // Native Google sign-in requires expo-auth-session or
  // @react-native-google-signin — left as a TODO for dev-build phase.
  throw new Error('Google sign-in on native requires additional setup. Use email or phone instead.');
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

export async function signOutUser() {
  await firebaseSignOut(auth);
}

// ---------------------------------------------------------------------------
// Profile upsert — call after any successful sign-in
// ---------------------------------------------------------------------------

/**
 * Ensure a profiles row exists for the current Firebase user.
 * Firebase JWT must be fresh (call getIdToken(true) first if just signed up).
 */
export async function ensureProfile() {
  const uid = getCurrentUserId();
  if (!uid) return;

  // Force a fresh token so Supabase sees the latest custom claims
  await auth.currentUser.getIdToken(/* forceRefresh */ true);

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


