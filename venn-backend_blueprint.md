# Venn Alpha Backend & Functionality Blueprint

This document contains the exact source code for every backend configuration, database schema, and library function used in the Venn Alpha project. Use this as a 1-to-1 reference for rebuilding the backend logic.

## File: `supabase.sql`

```sql
CREATE TYPE public.enum_user_type AS ENUM ('seeking', 'owner');
CREATE TYPE public.enum_gender AS ENUM ('man', 'woman', 'non_binary', 'prefer_not_to_say');
CREATE TYPE public.enum_lifestyle AS ENUM ('yes', 'sometimes', 'no', 'prefer_not_to_say');
CREATE TYPE public.enum_pref_role AS ENUM ('seeking', 'owner');
CREATE TYPE public.enum_pref_gender AS ENUM ('women_only', 'men_only', 'any_gender');
CREATE TYPE public.enum_pref_age AS ENUM ('18_22', '22_26', '26_30', '30_35', '35_plus', 'flexible');
CREATE TYPE public.enum_budget AS ENUM ('under_10k', '10k_20k', '20k_35k', '35k_50k', '50k_plus');
CREATE TYPE public.enum_move_in AS ENUM ('asap', 'jul_2026', 'aug_2026', 'sep_2026', 'oct_2026', 'flexible');
CREATE TYPE public.enum_flat_type AS ENUM ('1_bhk', '2_bhk', '3_bhk', 'studio', 'private_room', 'shared_room', 'pg');
CREATE TYPE public.enum_occupation AS ENUM ('working_professional', 'student', 'freelancer', 'entrepreneur');
CREATE TYPE public.enum_food_habit AS ENUM ('veg_only', 'eggetarian_ok', 'non_veg_ok', 'vegan_only');
CREATE TYPE public.enum_smoking_pref AS ENUM ('non_smoker', 'smoker_ok', 'outside_only');
CREATE TYPE public.enum_drinking_pref AS ENUM ('teetotaller_only', 'social_drinker_ok', 'fine_with_drinking');
CREATE TYPE public.enum_pets_pref AS ENUM ('have_pet', 'fine_with_pets', 'no_pets', 'allergic');

CREATE TABLE public.waitlist (
  email text NOT NULL,
  CONSTRAINT waitlist_pkey PRIMARY KEY (email)
);
CREATE TABLE public.profiles (
  id text NOT NULL,
  name text,
  age integer,
  bio text,
  location text,
  budget_min integer,
  budget_max integer,
  move_in_date date,
  photos text[],
  created_at timestamp with time zone DEFAULT now(),
  pronouns text[],
  gender public.enum_gender,
  drink public.enum_lifestyle,
  tobacco public.enum_lifestyle,
  areas text[],
  budget public.enum_budget,
  onboarding_done boolean DEFAULT false,
  birthday date,
  weed public.enum_lifestyle,
  preferred_areas text[],
  user_type public.enum_user_type,
  pref_move_in public.enum_move_in,
  pref_gender public.enum_pref_gender,
  pref_age public.enum_pref_age,
  pref_occupation public.enum_occupation[],
  pref_food public.enum_food_habit[],
  pref_smoking public.enum_smoking_pref,
  pref_drinking public.enum_drinking_pref,
  pref_pets public.enum_pets_pref[],
  pref_role public.enum_pref_role,
  pref_areas text[],
  pref_budget public.enum_budget,
  pref_flat_type public.enum_flat_type[],
  job_company text,
  job_title text,
  education_school text,
  education_level text,
  prompts jsonb DEFAULT '[]'::jsonb,
  verified boolean NOT NULL DEFAULT false,
  last_active_at timestamp with time zone,
  flat_type public.enum_flat_type,
  paused boolean NOT NULL DEFAULT false,
  is_admin boolean NOT NULL DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user1_id text,
  user2_id text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT matches_pkey PRIMARY KEY (id),
  CONSTRAINT matches_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES public.profiles(id),
  CONSTRAINT matches_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES public.profiles(id),
  CONSTRAINT matches_user1_user2_unique UNIQUE (user1_id, user2_id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  match_id uuid,
  sender_id text,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  read boolean NOT NULL DEFAULT false,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_user_id text NOT NULL,
  to_user_id text NOT NULL,
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT likes_pkey PRIMARY KEY (id),
  CONSTRAINT likes_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.profiles(id),
  CONSTRAINT likes_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.profiles(id),
  CONSTRAINT likes_from_to_unique UNIQUE (from_user_id, to_user_id)
);
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id text NOT NULL,
  reported_id text NOT NULL,
  reason text NOT NULL,
  details text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'::text,
  moderator_notes text,
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id),
  CONSTRAINT reports_reported_id_fkey FOREIGN KEY (reported_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blocker_id text NOT NULL,
  blocked_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT blocks_pkey PRIMARY KEY (id),
  CONSTRAINT blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.profiles(id),
  CONSTRAINT blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type text NOT NULL,
  actor_id text,
  match_id uuid,
  content text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id)
);
CREATE TABLE public.preregistrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  first_name text,
  last_name text,
  email text UNIQUE,
  age text,
  role text,
  city text,
  budget text,
  move_in text,
  looking_for text,
  sleep_schedule text,
  cleanliness text,
  guests text,
  wfh text,
  CONSTRAINT preregistrations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Adapted for Firebase Auth (using auth.jwt()->>'sub')
-- ==========================================

-- 1. PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.jwt()->>'sub' IS NOT NULL);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.jwt()->>'sub' = id) WITH CHECK (auth.jwt()->>'sub' = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.jwt()->>'sub' = id);
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE USING (auth.jwt()->>'sub' = id);

-- 2. LIKES
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_select" ON public.likes
  FOR SELECT USING (auth.jwt()->>'sub' = from_user_id OR auth.jwt()->>'sub' = to_user_id);
CREATE POLICY "likes_insert" ON public.likes
  FOR INSERT WITH CHECK (auth.jwt()->>'sub' = from_user_id);
CREATE POLICY "likes_delete" ON public.likes
  FOR DELETE USING (auth.jwt()->>'sub' = from_user_id);

-- 3. MATCHES
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_select" ON public.matches
  FOR SELECT USING (auth.jwt()->>'sub' = user1_id OR auth.jwt()->>'sub' = user2_id);
CREATE POLICY "matches_delete" ON public.matches
  FOR DELETE USING (auth.jwt()->>'sub' = user1_id OR auth.jwt()->>'sub' = user2_id);

-- 4. MESSAGES
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = messages.match_id
        AND (user1_id = auth.jwt()->>'sub' OR user2_id = auth.jwt()->>'sub')
    )
  );
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (
    auth.jwt()->>'sub' = sender_id AND
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = messages.match_id
        AND (m.user1_id = auth.jwt()->>'sub' OR m.user2_id = auth.jwt()->>'sub')
    ) AND NOT EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.blocks b ON
        (b.blocker_id = m.user1_id AND b.blocked_id = m.user2_id) OR
        (b.blocker_id = m.user2_id AND b.blocked_id = m.user1_id)
      WHERE m.id = messages.match_id
    )
  );
CREATE POLICY "messages_update_read" ON public.messages
  FOR UPDATE USING (
    sender_id != auth.jwt()->>'sub' AND
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = messages.match_id
        AND (user1_id = auth.jwt()->>'sub' OR user2_id = auth.jwt()->>'sub')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = messages.match_id
        AND (user1_id = auth.jwt()->>'sub' OR user2_id = auth.jwt()->>'sub')
    )
  );
CREATE POLICY "messages_delete" ON public.messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = messages.match_id
        AND (user1_id = auth.jwt()->>'sub' OR user2_id = auth.jwt()->>'sub')
    )
  );

-- 5. NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.jwt()->>'sub' = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.jwt()->>'sub' = user_id) WITH CHECK (auth.jwt()->>'sub' = user_id);

-- 6. REPORTS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_select_own" ON public.reports
  FOR SELECT USING (auth.jwt()->>'sub' = reporter_id);
CREATE POLICY "reports_insert" ON public.reports
  FOR INSERT WITH CHECK (auth.jwt()->>'sub' = reporter_id);

-- 7. BLOCKS
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks_select" ON public.blocks
  FOR SELECT USING (auth.jwt()->>'sub' = blocker_id);
CREATE POLICY "blocks_insert" ON public.blocks
  FOR INSERT WITH CHECK (auth.jwt()->>'sub' = blocker_id);
CREATE POLICY "blocks_delete" ON public.blocks
  FOR DELETE USING (auth.jwt()->>'sub' = blocker_id);

-- 8. PUSH SUBSCRIPTIONS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_subscriptions_select_own" ON public.push_subscriptions
  FOR SELECT USING (auth.jwt()->>'sub' = user_id);
CREATE POLICY "push_subscriptions_insert_own" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.jwt()->>'sub' = user_id);
CREATE POLICY "push_subscriptions_update_own" ON public.push_subscriptions
  FOR UPDATE USING (auth.jwt()->>'sub' = user_id) WITH CHECK (auth.jwt()->>'sub' = user_id);
CREATE POLICY "push_subscriptions_delete_own" ON public.push_subscriptions
  FOR DELETE USING (auth.jwt()->>'sub' = user_id);

-- ==========================================
-- STORAGE POLICIES
-- ==========================================
-- Ensure you have a 'photos' bucket created in Supabase Storage.
CREATE POLICY "users upload own photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'photos' AND auth.jwt()->>'sub' = (storage.foldername(name))[1]
  );
CREATE POLICY "photos are public" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "users can delete own photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'photos' AND auth.jwt()->>'sub' = (storage.foldername(name))[1]
  );

-- ==========================================
-- UPDATED FUNCTIONS FOR FIREBASE AUTH
-- ==========================================

DROP FUNCTION IF EXISTS get_blocked_pair_ids();
CREATE OR REPLACE FUNCTION get_blocked_pair_ids()
RETURNS TABLE(user_id text) AS $$
  SELECT blocked_id FROM public.blocks WHERE blocker_id = auth.jwt()->>'sub'
  UNION
  SELECT blocker_id FROM public.blocks WHERE blocked_id = auth.jwt()->>'sub';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP FUNCTION IF EXISTS delete_account();
CREATE OR REPLACE FUNCTION delete_account()
RETURNS void AS $$
BEGIN
  DELETE FROM storage.objects
    WHERE bucket_id = 'photos'
      AND (storage.foldername(name))[1] = auth.jwt()->>'sub';
  DELETE FROM public.profiles WHERE id = auth.jwt()->>'sub';
  -- Firebase handles auth.users, so we only clean up Supabase storage and profiles
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION delete_account() FROM anon, public;
GRANT EXECUTE ON FUNCTION delete_account() TO authenticated;

-- ==========================================
-- AUTO-MATCH & NOTIFICATION TRIGGERS
-- ==========================================

CREATE OR REPLACE FUNCTION create_match_on_mutual_like()
RETURNS TRIGGER AS $$
DECLARE
  m_id uuid;
BEGIN
  -- Check if the person being liked has already liked back
  IF EXISTS (
    SELECT 1 FROM public.likes
    WHERE from_user_id = NEW.to_user_id
      AND to_user_id   = NEW.from_user_id
  ) THEN
    -- Insert a match (use least/greatest so (A,B) and (B,A) produce same row)
    INSERT INTO public.matches (user1_id, user2_id)
    VALUES (LEAST(NEW.from_user_id, NEW.to_user_id), GREATEST(NEW.from_user_id, NEW.to_user_id))
    ON CONFLICT (user1_id, user2_id) DO NOTHING
    RETURNING id INTO m_id;

    IF m_id IS NULL THEN
      SELECT id INTO m_id FROM public.matches
        WHERE user1_id = LEAST(NEW.from_user_id, NEW.to_user_id)
          AND user2_id = GREATEST(NEW.from_user_id, NEW.to_user_id);
    END IF;

    INSERT INTO public.notifications (user_id, type, actor_id, match_id)
    VALUES (NEW.to_user_id, 'match', NEW.from_user_id, m_id);
    INSERT INTO public.notifications (user_id, type, actor_id, match_id)
    VALUES (NEW.from_user_id, 'match', NEW.to_user_id, m_id);
  ELSE
    -- One-way like — notify the recipient only
    INSERT INTO public.notifications (user_id, type, actor_id)
    VALUES (NEW.to_user_id, 'like', NEW.from_user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_mutual_like ON public.likes;
CREATE TRIGGER trg_mutual_like
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION create_match_on_mutual_like();

CREATE OR REPLACE FUNCTION notify_on_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient text;
BEGIN
  SELECT CASE WHEN user1_id = NEW.sender_id THEN user2_id ELSE user1_id END
    INTO recipient
  FROM public.matches WHERE id = NEW.match_id;

  IF recipient IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, actor_id, match_id, content)
    VALUES (recipient, 'message', NEW.sender_id, NEW.match_id, NEW.content);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_message ON public.messages;
CREATE TRIGGER trg_notify_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_message();
```

---

## File: `firebase/firebase.json`

```json
{
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log",
        "*.local"
      ]
    }
  ]
}

```

---

## File: `firebase/functions/index.js`

```javascript
const { beforeUserCreated, beforeUserSignedIn } = require("firebase-functions/v2/identity");

/**
 * Firebase blocking functions to add custom claims to the JWT.
 * 
 * Supabase requires the custom claim `role: 'authenticated'` to exist in the JWT.
 * If this claim is not present, Supabase will reject the token or apply the 'anon' role,
 * meaning Row Level Security (RLS) policies will fail.
 * 
 * NOTE: Blocking functions require upgrading to Firebase Authentication with Identity Platform.
 * You can do this in the Firebase Console under Authentication -> Settings.
 */

// Runs before a new user is saved to the Firebase database.
exports.beforecreated = beforeUserCreated((event) => {
  return {
    customClaims: {
      role: 'authenticated',
    },
  };
});

// Runs before a user successfully signs in.
// We apply it here too in case an existing user's claims need to be refreshed
// or if they were created before this function was deployed.
exports.beforesignedin = beforeUserSignedIn((event) => {
  return {
    customClaims: {
      role: 'authenticated',
    },
  };
});

```

---

## File: `firebase/functions/package.json`

```json
{
  "name": "venn-firebase-functions",
  "description": "Firebase Cloud Functions for Venn Authentication to set Supabase custom claims",
  "dependencies": {
    "firebase-admin": "^12.1.0",
    "firebase-functions": "^5.0.0"
  },
  "engines": {
    "node": "18"
  },
  "main": "index.js"
}

```

---

## File: `lib/age.js`

```javascript
export function calcAge(birthday) {
  if (!birthday) return null;
  const b = new Date(birthday);
  if (isNaN(b.getTime())) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - b.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - b.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < b.getUTCDate())) {
    age--;
  }
  return age;
}

```

---

## File: `lib/alert.js`

```javascript
import { Alert, Platform } from 'react-native';

// react-native-web ships Alert.alert as a literal no-op (`static alert() {}`),
// so on web every error message was invisible and multi-button confirms
// (unmatch/block in chat) could never fire their onPress. Patch the shared
// Alert singleton once at startup; every existing call site picks it up.
// Imported for its side effect from app/_layout.jsx.
if (Platform.OS === 'web') {
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    if (!buttons || buttons.length === 0) {
      window.alert(text);
      return;
    }
    if (buttons.length === 1) {
      window.alert(text);
      buttons[0]?.onPress?.();
      return;
    }
    // window.confirm can only offer OK/Cancel: OK maps to the first
    // non-cancel button, Cancel to the cancel-styled one (if any).
    const confirmBtn = buttons.find(b => b?.style !== 'cancel') ?? buttons[buttons.length - 1];
    const cancelBtn = buttons.find(b => b?.style === 'cancel');
    if (window.confirm(text)) confirmBtn?.onPress?.();
    else cancelBtn?.onPress?.();
  };
}

```

---

## File: `lib/auth.js`

```javascript
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
  signInWithCredential,
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
 * Use this everywhere the app previously called `supabase.auth.getUser()`.
 */
export function getCurrentUserId() {
  return auth.currentUser?.uid ?? null;
}

// ---------------------------------------------------------------------------
// Email link (magic link) sign-in
// ---------------------------------------------------------------------------

const ACTION_CODE_SETTINGS = {
  // The URL the link will redirect to — must be whitelisted in Firebase console.
  url: Platform.OS === 'web'
    ? (typeof window !== 'undefined' ? window.location.origin : 'https://localhost:8081')
    : 'https://venn-21b15.firebaseapp.com',
  handleCodeInApp: true,
};

/**
 * Send a sign-in link to the user's email.
 * Store the email so we can complete sign-in when the link is opened.
 */
export async function sendEmailLink(email) {
  await sendSignInLinkToEmail(auth, email, ACTION_CODE_SETTINGS);
  // Persist email for the verification step (the link opens in a new tab/app)
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('venn_email_for_signin', email);
  }
}

/**
 * Complete sign-in from an email link (called when the app opens with a link).
 * Returns the Firebase UserCredential on success.
 */
export async function completeEmailLink(url) {
  if (!isSignInWithEmailLink(auth, url)) return null;
  let email = typeof localStorage !== 'undefined'
    ? localStorage.getItem('venn_email_for_signin')
    : null;
  if (!email) {
    // Prompt the user for their email if storage was cleared
    email = prompt('Please provide your email for confirmation');
  }
  if (!email) throw new Error('Email is required to complete sign-in.');
  const cred = await signInWithEmailLink(auth, email, url);
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('venn_email_for_signin');
  }
  return cred;
}

// ---------------------------------------------------------------------------
// Phone OTP sign-in (web only — native needs @react-native-firebase/auth)
// ---------------------------------------------------------------------------

let recaptchaVerifier = null;

/**
 * Set up the invisible reCAPTCHA verifier (web only).
 * Call this once when the phone screen mounts, passing the ID of the
 * sign-in button element.
 */
export function setupRecaptcha(buttonId) {
  if (Platform.OS !== 'web') return;
  if (recaptchaVerifier) return; // already set up
  recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
    size: 'invisible',
    callback: () => { /* reCAPTCHA solved */ },
  });
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

```

---

## File: `lib/blocks.js`

```javascript
import { supabase } from './supabase';

// Ids of everyone the current user has blocked, plus everyone who has
// blocked the current user — for filtering both directions out of feeds.
// Relies on the get_blocked_pair_ids() RPC (see SUPABASE_SQL.md) since RLS
// only lets a user read blocks where they are the blocker.
export async function getBlockedIds(uid) {
  if (!uid) return new Set();
  try {
    const { data, error } = await supabase.rpc('get_blocked_pair_ids');
    if (error) throw error;
    return new Set((data ?? []).map(r => r.user_id));
  } catch (e) {
    // Fail-open so a transient RPC error doesn't blank the whole feed, but
    // log it — otherwise blocked users silently reappearing is undiagnosable.
    console.warn('getBlockedIds failed:', e?.message ?? e);
    return new Set();
  }
}

export async function blockUser(uid, targetId) {
  if (!uid || !targetId) return { error: new Error('Missing user') };
  const u1 = uid < targetId ? uid : targetId;
  const u2 = uid < targetId ? targetId : uid;
  const [{ error }] = await Promise.all([
    supabase.from('blocks').insert({ blocker_id: uid, blocked_id: targetId }),
    // Blocking should actually cut off the conversation, not just hide the
    // pair from list views — delete any existing match, which cascades to
    // its messages/notifications (see SUPABASE_SQL.md #13).
    supabase.from('matches').delete().eq('user1_id', u1).eq('user2_id', u2),
  ]);
  // Already blocked (unique constraint) — treat as success, not an error.
  if (error?.code === '23505') return { error: null };
  return { error };
}

export function unblockUser(uid, targetId) {
  if (!uid || !targetId) return Promise.resolve({ error: new Error('Missing user') });
  return supabase.from('blocks').delete().eq('blocker_id', uid).eq('blocked_id', targetId);
}

// Profiles the current user has explicitly blocked (for the Block List screen).
export async function getBlockedProfiles(uid) {
  if (!uid) return [];
  const { data: blockRows } = await supabase
    .from('blocks')
    .select('blocked_id, created_at')
    .eq('blocker_id', uid)
    .order('created_at', { ascending: false });
  if (!blockRows || blockRows.length === 0) return [];

  const ids = blockRows.map(r => r.blocked_id);
  const { data: profileRows } = await supabase
    .from('profiles').select('id, name, photos').in('id', ids);
  const profileMap = {};
  profileRows?.forEach(p => { profileMap[p.id] = p; });

  return blockRows.map(r => ({
    id: r.blocked_id,
    name: profileMap[r.blocked_id]?.name ?? 'Unknown',
    photo: Array.isArray(profileMap[r.blocked_id]?.photos) ? profileMap[r.blocked_id].photos[0] ?? null : null,
  }));
}

```

---

## File: `lib/enums.js`

```javascript
export const ENUMS = {
  user_type: {
    dbToUI: { 'seeking': 'seeking', 'owner': 'owner' },
    uiToDb: { 'seeking': 'seeking', 'owner': 'owner' }
  },
  gender: {
    dbToUI: { 'man': 'Man', 'woman': 'Woman', 'non_binary': 'Non-binary', 'prefer_not_to_say': 'Prefer not to say' },
    uiToDb: { 'Man': 'man', 'Woman': 'woman', 'Non-binary': 'non_binary', 'Prefer not to say': 'prefer_not_to_say' }
  },
  lifestyle: {
    dbToUI: { 'yes': 'Yes', 'sometimes': 'Sometimes', 'no': 'No', 'prefer_not_to_say': 'Prefer not to say' },
    uiToDb: { 'Yes': 'yes', 'Sometimes': 'sometimes', 'No': 'no', 'Prefer not to say': 'prefer_not_to_say' }
  },
  pref_role: {
    dbToUI: { 'seeking': '🔍 Looking for a flat', 'owner': '🏠 Have a flat / room' },
    uiToDb: { '🔍 Looking for a flat': 'seeking', '🏠 Have a flat / room': 'owner' }
  },
  pref_gender: {
    dbToUI: { 'women_only': '👩 Women only', 'men_only': '👨 Men only', 'any_gender': '🌈 Any gender' },
    uiToDb: { '👩 Women only': 'women_only', '👨 Men only': 'men_only', '🌈 Any gender': 'any_gender' }
  },
  pref_age: {
    dbToUI: { '18_22': '18–22', '22_26': '22–26', '26_30': '26–30', '30_35': '30–35', '35_plus': '35+', 'flexible': 'Flexible' },
    uiToDb: { '18–22': '18_22', '22–26': '22_26', '26–30': '26_30', '30–35': '30_35', '35+': '35_plus', 'Flexible': 'flexible' }
  },
  pref_budget: {
    dbToUI: { 'under_10k': 'Under ₹10k', '10k_20k': '₹10k–20k', '20k_35k': '₹20k–35k', '35k_50k': '₹35k–50k', '50k_plus': '₹50k+' },
    uiToDb: { 'Under ₹10k': 'under_10k', '₹10k–20k': '10k_20k', '₹20k–35k': '20k_35k', '₹35k–50k': '35k_50k', '₹50k+': '50k_plus' }
  },
  pref_move_in: {
    dbToUI: { 'asap': 'ASAP', 'jul_2026': 'Jul 2026', 'aug_2026': 'Aug 2026', 'sep_2026': 'Sep 2026', 'oct_2026': 'Oct 2026', 'flexible': 'Flexible' },
    uiToDb: { 'ASAP': 'asap', 'Jul 2026': 'jul_2026', 'Aug 2026': 'aug_2026', 'Sep 2026': 'sep_2026', 'Oct 2026': 'oct_2026', 'Flexible': 'flexible' }
  },
  flat_type: {
    dbToUI: { '1_bhk': '1 BHK', '2_bhk': '2 BHK', '3_bhk': '3 BHK', 'studio': 'Studio', 'private_room': 'Private room', 'shared_room': 'Shared room', 'pg': 'PG' },
    uiToDb: { '1 BHK': '1_bhk', '2 BHK': '2_bhk', '3 BHK': '3_bhk', 'Studio': 'studio', 'Private room': 'private_room', 'Shared room': 'shared_room', 'PG': 'pg' }
  },
  occupation: {
    dbToUI: { 'working_professional': '💼 Working professional', 'student': '🎓 Student', 'freelancer': '💻 Freelancer', 'entrepreneur': '🚀 Entrepreneur' },
    uiToDb: { '💼 Working professional': 'working_professional', '🎓 Student': 'student', '💻 Freelancer': 'freelancer', '🚀 Entrepreneur': 'entrepreneur' }
  },
  food_habit: {
    dbToUI: { 'veg_only': '🥦 Veg only', 'eggetarian_ok': '🍳 Eggetarian ok', 'non_veg_ok': '🍗 Non-veg ok', 'vegan_only': '🌱 Vegan only' },
    uiToDb: { '🥦 Veg only': 'veg_only', '🍳 Eggetarian ok': 'eggetarian_ok', '🍗 Non-veg ok': 'non_veg_ok', '🌱 Vegan only': 'vegan_only' }
  },
  smoking_pref: {
    dbToUI: { 'non_smoker': '🚭 Non-smoker', 'smoker_ok': '🚬 Smoker ok', 'outside_only': '🏠 Outside only' },
    uiToDb: { '🚭 Non-smoker': 'non_smoker', '🚬 Smoker ok': 'smoker_ok', '🏠 Outside only': 'outside_only' }
  },
  drinking_pref: {
    dbToUI: { 'teetotaller_only': '🚫 Teetotaller only', 'social_drinker_ok': '🍷 Social drinker ok', 'fine_with_drinking': '🍺 Fine with drinking' },
    uiToDb: { '🚫 Teetotaller only': 'teetotaller_only', '🍷 Social drinker ok': 'social_drinker_ok', '🍺 Fine with drinking': 'fine_with_drinking' }
  },
  pets_pref: {
    dbToUI: { 'have_pet': '🐶 I have a pet', 'fine_with_pets': '✅ Fine with pets', 'no_pets': '🚫 No pets please', 'allergic': '🤧 Allergic' },
    uiToDb: { '🐶 I have a pet': 'have_pet', '✅ Fine with pets': 'fine_with_pets', '🚫 No pets please': 'no_pets', '🤧 Allergic': 'allergic' }
  }
};

export function toDb(category, uiStr) {
  if (!uiStr) return uiStr;
  return ENUMS[category]?.uiToDb[uiStr] ?? uiStr;
}

export function toUI(category, dbStr) {
  if (!dbStr) return dbStr;
  return ENUMS[category]?.dbToUI[dbStr] ?? dbStr;
}

export function toDbArray(category, uiArr) {
  if (!Array.isArray(uiArr)) return uiArr;
  return uiArr.map(val => toDb(category, val)).filter(Boolean);
}

export function toUIArray(category, dbArr) {
  if (!Array.isArray(dbArr)) return dbArr;
  return dbArr.map(val => toUI(category, val)).filter(Boolean);
}

/** Parses DB row pref columns into UI mapped object */
export function mapDbPrefsToUI(me) {
  if (!me) return null;
  
  // Fallbacks for existing users who completed onboarding before we synced these.
  const fallbackRole = me.user_type === 'owner' ? 'seeking' : 'owner';
  const fallbackAreas = me.preferred_areas ?? [];
  const fallbackFlatType = me.flat_type ? [me.flat_type] : [];
  const fallbackBudget = me.budget ?? null;

  return {
    role:       toUI('pref_role', me.pref_role ?? fallbackRole),
    areas:      me.pref_areas && me.pref_areas.length > 0 ? me.pref_areas : fallbackAreas,
    flatType:   toUIArray('flat_type', me.pref_flat_type && me.pref_flat_type.length > 0 ? me.pref_flat_type : fallbackFlatType),
    budget:     toUI('pref_budget', me.pref_budget ?? fallbackBudget),
    moveIn:     toUI('pref_move_in', me.pref_move_in),
    gender:     toUI('pref_gender', me.pref_gender),
    age:        toUI('pref_age', me.pref_age),
    occupation: toUIArray('occupation', me.pref_occupation),
    food:       toUIArray('food_habit', me.pref_food),
    smoking:    toUI('smoking_pref', me.pref_smoking),
    drinking:   toUI('drinking_pref', me.pref_drinking),
    pets:       toUIArray('pets_pref', me.pref_pets),
  };
}

/** Prepares UI mapped object for saving to DB row */
export function mapUIPrefsToDb(p) {
  if (!p) return {};
  return {
    pref_role:       toDb('pref_role', p.role),
    pref_areas:      p.areas?.length ? p.areas : null,
    pref_flat_type:  toDbArray('flat_type', p.flatType)?.length ? toDbArray('flat_type', p.flatType) : null,
    pref_budget:     toDb('pref_budget', p.budget),
    pref_move_in:    toDb('pref_move_in', p.moveIn),
    pref_gender:     toDb('pref_gender', p.gender),
    pref_age:        toDb('pref_age', p.age),
    pref_occupation: toDbArray('occupation', p.occupation)?.length ? toDbArray('occupation', p.occupation) : null,
    pref_food:       toDbArray('food_habit', p.food)?.length ? toDbArray('food_habit', p.food) : null,
    pref_smoking:    toDb('smoking_pref', p.smoking),
    pref_drinking:   toDb('drinking_pref', p.drinking),
    pref_pets:       toDbArray('pets_pref', p.pets)?.length ? toDbArray('pets_pref', p.pets) : null,
  };
}

```

---

## File: `lib/firebase.js`

```javascript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Avoid re-initialising on hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// On web, getAuth() uses browser persistence by default (indexedDB).
// On native, we use getAuth() which falls back to in-memory persistence;
// a future dev-build can switch to @react-native-firebase/auth for full
// native persistence.
export const auth = getAuth(app);

```

---

## File: `lib/matches.js`

```javascript
import { supabase } from './supabase';

// Deleting the match cascades to its messages and notifications (see
// SUPABASE_SQL.md #13). Also clear both directions of the mutual like that
// formed the match, so the pair can like each other again later instead of
// hitting the likes unique-constraint on re-like.
export async function unmatchUser(matchId, uid, otherId) {
  if (!matchId) return { error: new Error('Missing match') };
  const deletes = [supabase.from('matches').delete().eq('id', matchId)];
  if (uid && otherId) {
    deletes.push(supabase.from('likes').delete().eq('from_user_id', uid).eq('to_user_id', otherId));
    deletes.push(supabase.from('likes').delete().eq('from_user_id', otherId).eq('to_user_id', uid));
  }
  const [{ error }] = await Promise.all(deletes);
  return { error };
}

// Deletes every message in a match's history but leaves the match itself
// intact (see SUPABASE_SQL.md #20) — shared between both participants,
// there's no per-user "cleared" state.
export async function clearChat(matchId) {
  if (!matchId) return { error: new Error('Missing match') };
  const { error } = await supabase.from('messages').delete().eq('match_id', matchId);
  return { error };
}

```

---

## File: `lib/notifications.js`

```javascript
import { supabase } from './supabase';
import { getBlockedIds } from './blocks';

export async function getNotifications(uid) {
  if (!uid) return [];
  const [{ data, error }, blockedIds] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, type, content, read, created_at, actor_id, match_id, profiles!actor_id(name, photos)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50),
    getBlockedIds(uid),
  ]);
  if (error || !data) return [];
  return data
    .filter(n => !n.actor_id || !blockedIds.has(n.actor_id))
    .map(n => ({
      id: n.id,
      type: n.type,
      read: n.read,
      createdAt: n.created_at,
      matchId: n.match_id,
      actorName: n.profiles?.name ?? 'Someone',
      actorPhoto: Array.isArray(n.profiles?.photos) ? n.profiles.photos[0] ?? null : null,
      content: n.content,
    }));
}

export async function markRead(uid, id) {
  if (!uid || !id) return;
  await supabase.from('notifications').update({ read: true }).eq('user_id', uid).eq('id', id);
}

export async function markAllRead(uid) {
  if (!uid) return;
  await supabase.from('notifications').update({ read: true }).eq('user_id', uid).eq('read', false);
}

export async function getUnreadCount(uid) {
  if (!uid) return 0;
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid)
    .eq('read', false);
  return count ?? 0;
}

```

---

## File: `lib/paused.js`

```javascript
import { supabase } from './supabase';

// Ids of users who paused their profile — hidden from feed/standouts, but
// their existing matches and chats stay intact. Fails open (empty set) so
// discovery keeps working before the `paused` column exists
// (see SUPABASE_SQL.md #17) or on a transient error.
export async function getPausedIds() {
  try {
    const { data, error } = await supabase.from('profiles').select('id').eq('paused', true);
    if (error) throw error;
    return new Set((data ?? []).map(r => r.id));
  } catch (e) {
    console.warn('getPausedIds failed:', e?.message ?? e);
    return new Set();
  }
}

```

---

## File: `lib/presence.js`

```javascript
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export function isOnline(lastActiveAt) {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() < ONLINE_WINDOW_MS;
}

export function activeStatusText(lastActiveAt) {
  if (!lastActiveAt) return 'Offline';
  const diffMs = Date.now() - new Date(lastActiveAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 2) return 'Active now';
  if (mins < 60) return `Active ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Active ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `Active ${days}d ago`;
}

```

---

## File: `lib/push.js`

```javascript
import { Platform } from 'react-native';
import { supabase } from './supabase';

// applicationServerKey must be a Uint8Array, but env vars only give us a
// base64url string — this is the standard conversion for it.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function supported() {
  return Platform.OS === 'web' && typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function registerServiceWorker() {
  if (!supported()) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (e) {
    console.warn('Service worker registration failed:', e?.message ?? e);
    return null;
  }
}

// Requests notification permission and creates a browser push subscription,
// then upserts it so the send-push edge function can find it later. Callers
// should treat this as best-effort — a denied permission or missing browser
// support is not an error worth blocking the UI over.
export async function subscribeToPush(uid) {
  if (!uid || !supported()) return { error: null };

  const vapidKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return { error: new Error('Missing EXPO_PUBLIC_VAPID_PUBLIC_KEY') };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { error: null };

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    const json = subscription.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: uid,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    }, { onConflict: 'endpoint' });

    return { error: error ?? null };
  } catch (e) {
    return { error: e };
  }
}

export async function unsubscribeFromPush() {
  if (!supported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  } catch (e) {
    console.warn('unsubscribeFromPush failed:', e?.message ?? e);
  }
}

```

---

## File: `lib/supabase.js`

```javascript
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { auth } from './firebase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: async (url, options = {}) => {
      const user = auth.currentUser;
      const urlStr = typeof url === 'string' ? url : (url && url.url) ? url.url : '';
      const isSupabase = urlStr.startsWith(supabaseUrl);

      if (user && isSupabase) {
        try {
          const token = await user.getIdToken();
          const headersObj = {};

          if (options.headers) {
            if (typeof Headers !== 'undefined' && options.headers instanceof Headers) {
              options.headers.forEach((value, key) => {
                headersObj[key.toLowerCase()] = value;
              });
            } else if (Array.isArray(options.headers)) {
              options.headers.forEach(([key, value]) => {
                headersObj[key.toLowerCase()] = value;
              });
            } else {
              for (const key of Object.keys(options.headers)) {
                headersObj[key.toLowerCase()] = options.headers[key];
              }
            }
          }

          headersObj['authorization'] = `Bearer ${token}`;
          headersObj['apikey'] = supabaseAnonKey;
          options.headers = headersObj;
        } catch (e) {
          console.warn('Failed to inject Firebase auth token:', e);
        }
      }
      return fetch(url, options);
    },
  },
});

```

---

## File: `lib/theme.js`

```javascript
import { Platform } from 'react-native';

export const colors = {
  blue: '#335CFF',
  violet: '#8A5BFF',
  indigo: '#3A2FD6',
  ink: '#14161B',
  slate: '#5A6072',
  mist: '#E6E8EE',
  paper: '#FCFCFD',
  canvas: '#F2F3F7',
  inputBg: '#F2F3F7',
  placeholder: '#9AA0B2',
  error: '#E03E3E',
  red: '#FF4D6A',
  success: '#22C55E',
};

export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_600SemiBold',
  body: 'System',
  mono: Platform.select({ ios: 'SpaceMono_400Regular', android: 'SpaceMono_400Regular' }),
};

export const gradientBlue = ['#335CFF', '#8A5BFF'];
export const gradientDark = ['#0a081e', '#1a1040', '#2d1b69'];

```

---

