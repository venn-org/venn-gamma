import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, AppState, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts, SpaceGrotesk_700Bold, SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import { HankenGrotesk_400Regular, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold } from '@expo-google-fonts/hanken-grotesk';
import * as SplashScreen from 'expo-splash-screen';
import { auth, supabase, getCurrentUserId, isOnboardingComplete, subscribeOnboardingComplete } from '../lib';
import MatchCelebration from '../components/MatchCelebration';

// Prevent auto-hiding the splash screen until fonts & auth are ready
SplashScreen.preventAutoHideAsync();

// Web alert polyfill
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.Alert = require('../lib/alert').Alert;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_700Bold,
    SpaceGrotesk_600SemiBold,
    SpaceMono_400Regular,
    HankenGrotesk_400Regular,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });

  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState(null);
  const [onboardingDone, setOnboardingDone] = useState(null); // null = unknown, true/false
  const [incomingMatch, setIncomingMatch] = useState(null); // { matchId, name, photo }

  const router = useRouter();
  const segments = useSegments();

  // Auth listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setSession(user);
      if (user) {
        // Need to force refresh token to ensure we have the 'authenticated' custom claim
        await user.getIdToken(true);
        const done = await isOnboardingComplete();
        setOnboardingDone(done);
      } else {
        setOnboardingDone(false);
      }
      setAuthReady(true);
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
    if (fontsLoaded && authReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authReady]);

  // Route guarding
  useEffect(() => {
    if (!fontsLoaded || !authReady) return;

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
  }, [session, onboardingDone, segments, authReady, fontsLoaded]);

  // Presence heartbeat (last_active_at)
  useEffect(() => {
    if (!session || !onboardingDone) return;

    const updatePresence = async () => {
      const uid = getCurrentUserId();
      if (!uid) return;
      await supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', uid);
    };

    updatePresence();
    const interval = setInterval(updatePresence, 60000); // every minute

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

    const channel = supabase
      .channel('public:matches')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, async (payload) => {
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

  if (!fontsLoaded || !authReady) {
    // Show splash screen manually while checking auth state if fonts are loaded but auth is slow
    return (
      <View style={s.splash}>
        <View style={s.logoWrap}>
          <View style={[s.circle, { backgroundColor: '#335CFF', left: 0 }]} />
          <View style={[s.circle, { backgroundColor: '#8A5BFF', right: 0, opacity: 0.9 }]} />
        </View>
        <Text style={s.text}>Venn</Text>
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
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
  splash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 14 },
  logoWrap: { width: 68, height: 44, position: 'relative' },
  circle: { position: 'absolute', top: 0, width: 44, height: 44, borderRadius: 22 },
  text: { fontSize: 26, fontWeight: '700', color: '#14161B', letterSpacing: -0.5 },
});
