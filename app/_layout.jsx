import * as Sentry from '@sentry/react-native';
import { useEffect, useState } from 'react';
import { View, StyleSheet, Text, AppState, LogBox } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import {
  useFonts,
  SpaceGrotesk_700Bold,
  SpaceGrotesk_600SemiBold,
} from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import {
  getCurrentUserId,
  ensureProfile,
  isOnboardingComplete,
  subscribeOnboardingComplete,
  loadSession,
  onAuthChange,
} from '../lib';
import { loadLocations } from '../lib/locations';
import { ThemeProvider, useTheme } from '../lib/ThemeContext';
import AppErrorBoundary from '../components/ErrorBoundary';
import { touchPresence } from '../services/presenceService';
import { INTERVALS } from '../config/flags';
import { error as logError, describeError } from '../lib/log';
import { initMonitoring, identifyUser } from '../lib/monitoring';

LogBox.ignoreLogs([
  '"shadow*" style props are deprecated',
  'Animated: `useNativeDriver` is not supported',
]);

// Prevent auto-hiding the splash screen until fonts & auth are ready
SplashScreen.preventAutoHideAsync();

// At module scope, not in an effect: a crash during the first render is
// exactly the kind this needs to catch, and an effect runs too late for that.
// No-ops when the DSN is unset or in development — see lib/monitoring.js.
initMonitoring();

// expo-router renders a route's exported ErrorBoundary in place of the screen
// when it throws. Exporting it from the root layout covers the whole tree.
export { default as ErrorBoundary } from '../components/ErrorBoundary';

// Sentry.wrap adds the routing/performance instrumentation that turns
// expo-router navigations into traced transactions. It is a pass-through when
// Sentry.init() was never called, so a development build is unaffected.
export default Sentry.wrap(function RootLayout() {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <RootLayoutInner />
      </ThemeProvider>
    </AppErrorBoundary>
  );
});

function RootLayoutInner() {
  const { colors, isDark } = useTheme();
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_700Bold,
    SpaceGrotesk_600SemiBold,
    SpaceMono_400Regular,
    HankenGrotesk_400Regular,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    ...Ionicons.font,
  });

  const [authReady, setAuthReady] = useState(false);
  const [locationsReady, setLocationsReady] = useState(false);
  const [session, setSession] = useState(null);
  const [onboardingDone, setOnboardingDone] = useState(null); // null = unknown, true/false

  const router = useRouter();
  const segments = useSegments();

  // Cities/zones now live in the DB (see supabase/migrations — `cities` /
  // `zones`) instead of lib/locations.json, so fetch them once up front,
  // the same way fonts/auth gate the splash screen — city.jsx, location.jsx,
  // preferences.jsx, and edit-profile.jsx all read CITIES/ZONES_BY_CITY
  // synchronously and would otherwise render against an empty list.
  useEffect(() => {
    loadLocations()
      .catch((e) => logError('loadLocations failed', describeError(e)))
      .finally(() => setLocationsReady(true));
  }, []);

  // Auth listener
  useEffect(() => {
    let unsubscribe = () => {};
    // onAuthStateChange replays INITIAL_SESSION on subscribe, and fires again
    // on every token refresh — none of which change who is signed in. Track the
    // last id so the profile/onboarding round-trip only runs on a real change.
    let lastUserId;

    const applySession = async (session) => {
      const uid = session?.user?.id ?? null;
      if (uid === lastUserId) {
        setAuthReady(true);
        return;
      }
      lastUserId = uid;
      setSession(session);
      // Opaque id only — enough to tell one user crashing ten times from ten
      // users crashing once, without putting anything identifying in Sentry.
      identifyUser(uid);

      if (session) {
        // Every sign-in method funnels through here, so this is the one place
        // that's guaranteed to run regardless of which one was used (email OTP,
        // Google, ...) — ensureProfile() tolerates being called again for an
        // existing row (23505), so this is safe on every login.
        await ensureProfile();
        const done = await isOnboardingComplete();
        setOnboardingDone(done);
      } else {
        setOnboardingDone(false);
      }
      setAuthReady(true);
    };

    // Resolve the stored session — and, on web, any OAuth code sitting in the
    // URL — before subscribing, so the route guard never sees a spurious
    // signed-out state and bounces a returning user to /login.
    loadSession()
      .then(applySession)
      .catch((e) => {
        logError('loadSession failed', describeError(e));
        setAuthReady(true);
      })
      .finally(() => {
        unsubscribe = onAuthChange(applySession);
      });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    return subscribeOnboardingComplete(() => {
      setOnboardingDone(true);
    });
  }, []);

  // Hide splash when ready
  useEffect(() => {
    if (fontsLoaded && authReady && locationsReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authReady, locationsReady]);

  // Route guarding
  useEffect(() => {
    if (!fontsLoaded || !authReady || !locationsReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!session) {
      // Not logged in -> go to login if not already in auth group
      if (!inAuthGroup) {
        router.replace('/login');
      }
    } else if (session && !onboardingDone) {
      // Logged in but onboarding not done -> go to onboarding if not already there
      if (!inOnboardingGroup) {
        router.replace('/name');
      }
    } else if (session && onboardingDone) {
      // Fully set up -> go to tabs if stuck in auth/onboarding or root
      if (inAuthGroup || inOnboardingGroup || segments.length === 0) {
        router.replace('/feed');
      }
    }
  }, [session, onboardingDone, segments, authReady, fontsLoaded, locationsReady]);

  // Presence heartbeat (last_active_at).
  //
  // Each beat is a write through the `profiles` view's INSTEAD OF triggers, so
  // it is the app's highest-volume write by a wide margin. The timer now stops
  // while the app is backgrounded and restarts (with an immediate beat) on
  // foreground: a suspended app has no one looking at its "Active now" badge,
  // and on web the timer would otherwise keep firing in a hidden tab forever.
  useEffect(() => {
    if (!session || !onboardingDone) return;

    let interval = null;

    const beat = () => touchPresence(getCurrentUserId());

    const start = () => {
      if (interval) return;
      beat();
      interval = setInterval(beat, INTERVALS.presenceHeartbeatMs);
    };

    const stop = () => {
      if (!interval) return;
      clearInterval(interval);
      interval = null;
    };

    start();

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') start();
      else stop();
    });

    return () => {
      stop();
      appStateSub.remove();
    };
  }, [session, onboardingDone]);

  if (!fontsLoaded || !authReady || !locationsReady) {
    // Show splash screen manually while checking auth state if fonts are loaded but auth is slow
    return (
      <View style={[s.splash, { backgroundColor: colors.paper }]}>
        <View style={s.logoWrap}>
          <View style={[s.circle, { backgroundColor: '#335CFF', left: 0 }]} />
          <View style={[s.circle, { backgroundColor: '#8A5BFF', right: 0, opacity: 0.9 }]} />
        </View>
        <Text style={[s.text, { color: colors.ink }]}>Venn</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      </Stack>
    </>
  );
}

const s = StyleSheet.create({
  splash: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  logoWrap: { width: 68, height: 44, position: 'relative' },
  circle: { position: 'absolute', top: 0, width: 44, height: 44, borderRadius: 22 },
  text: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
});
