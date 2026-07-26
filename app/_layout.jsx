import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, AppState, Platform, LogBox } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts, SpaceGrotesk_700Bold, SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import { HankenGrotesk_400Regular, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold } from '@expo-google-fonts/hanken-grotesk';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { supabase, getCurrentUserId, ensureProfile, isOnboardingComplete, subscribeOnboardingComplete, loadSession, onAuthChange } from '../lib';
import { loadLocations } from '../lib/locations';
import { ThemeProvider, useTheme } from '../lib/ThemeContext';
import MatchCelebration from '../components/MatchCelebration';

LogBox.ignoreLogs([
  '"shadow*" style props are deprecated',
  'Animated: `useNativeDriver` is not supported'
]);

// Prevent auto-hiding the splash screen until fonts & auth are ready
SplashScreen.preventAutoHideAsync();

// Web alert polyfill
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.Alert = require('../lib/alert').Alert;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}

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
  const [incomingMatch, setIncomingMatch] = useState(null); // { matchId, name, photo }

  const router = useRouter();
  const segments = useSegments();

  // Cities/zones now live in the DB (see supabase/migrations — `cities` /
  // `zones`) instead of lib/locations.json, so fetch them once up front,
  // the same way fonts/auth gate the splash screen — city.jsx, location.jsx,
  // preferences.jsx, and edit-profile.jsx all read CITIES/ZONES_BY_CITY
  // synchronously and would otherwise render against an empty list.
  useEffect(() => {
    loadLocations()
      .catch((e) => console.error('loadLocations failed:', e))
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
        console.error('loadSession failed:', e);
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

  // Presence heartbeat (last_active_at)
  useEffect(() => {
    if (!session || !onboardingDone) return;

    const updatePresence = async () => {
      const uid = getCurrentUserId();
      if (!uid) return;
      await supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', uid);
    };

    updatePresence();
    const interval = setInterval(updatePresence, 30000); // every 30s

    const appStateSub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') updatePresence();
    });

    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [session, onboardingDone]);

  // Realtime matches listener
  useEffect(() => {
    if (!session || !onboardingDone) return;

    const uid = getCurrentUserId();
    if (!uid) return;

    // `matches` is a client-facing view (active matches only); realtime
    // (Postgres logical replication) only fires on real tables, so this has
    // to subscribe to `matches_log`, the table matches are actually created on.
    const channel = supabase
      .channel('public:matches')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches_log' }, async (payload) => {
        const { user1_id, user2_id, id } = payload.new;
        if (user1_id === uid || user2_id === uid) {
          const otherId = user1_id === uid ? user2_id : user1_id;
          const { data } = await supabase.from('profiles').select('name, photos').eq('id', otherId).single();
          if (data) {
            setIncomingMatch({
              matchId: id,
              name: data.name,
              photo: data.photos?.[0] ?? null,
            });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      
      {/* Global match celebration modal */}
      <MatchCelebration
        visible={incomingMatch !== null}
        matchedName={incomingMatch?.name}
        matchedPhoto={incomingMatch?.photo}
        onChat={() => {
          const d = incomingMatch;
          setIncomingMatch(null);
          router.push(`/chat?matchId=${d.matchId}`);
        }}
        onDismiss={() => setIncomingMatch(null)}
      />
    </>
  );
}

const s = StyleSheet.create({
  splash: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 14 },
  logoWrap: { width: 68, height: 44, position: 'relative' },
  circle: { position: 'absolute', top: 0, width: 44, height: 44, borderRadius: 22 },
  text: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
});
