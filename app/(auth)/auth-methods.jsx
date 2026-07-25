import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Animated, Dimensions, ImageBackground, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { signInWithGoogle } from '../../lib/auth';
import { colors } from '../../lib/theme';
import GoogleLogo from '../../assets/images/signin-google-logo.svg';

const { height: SCREEN_H } = Dimensions.get('window');

export default function AuthMethodsScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams(); // 'signup' or 'signin'
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  // On sign-up we interrupt phone/email with a nudge towards Google first.
  // Holds 'phone' | 'email' while that sheet is open, null otherwise.
  const [nudge, setNudge] = useState(null);

  const slideY = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Manual backdrop-fade + sheet-slide, same as login.jsx's legal sheet —
  // Modal's own animationType="slide" drags the backdrop along with the sheet.
  const nudgeBackdropOpacity = useRef(new Animated.Value(0)).current;
  const nudgeSheetY = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true })
    ]).start();
  }, []);

  useEffect(() => {
    if (nudge) {
      Animated.parallel([
        Animated.timing(nudgeBackdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(nudgeSheetY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      nudgeBackdropOpacity.setValue(0);
      nudgeSheetY.setValue(SCREEN_H);
    }
  }, [nudge]);

  const isSignup = mode === 'signup';
  const title = isSignup ? 'Get started' : 'Welcome back';
  const subtitle = isSignup ? "Choose how you'd like to create your account." : "Choose how you'd like to continue.";

  // Google is only wired up on web, so there's nothing to recommend on native —
  // send those users straight through instead of showing a dead-end sheet.
  const canRecommendGoogle = isSignup && Platform.OS === 'web';

  const goTo = (method) => router.push(`/(auth)/${method}?mode=${mode}`);

  const handleMethodPress = (method) => {
    if (canRecommendGoogle) {
      setNudge(method);
      return;
    }
    goTo(method);
  };

  const handleGoogleSignIn = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Not available', 'Google sign-in on native requires a dev-build. Use phone or email instead.');
      return;
    }
    setNudge(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      // Auth listener routes automatically
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        console.error('signInWithGoogle failed:', e);
        Alert.alert('Sign in failed', 'Please try again.');
      }
      setLoading(false);
    }
  };

  const nudgeLabel = nudge === 'phone' ? 'phone number' : 'email';

  return (
    <View style={styles.frame}>
      <ImageBackground source={require('../../assets/images/hero.jpeg')} style={styles.bg} imageStyle={styles.bgImage} resizeMode="cover">
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.92)']} style={styles.overlay} />

        <TouchableOpacity style={[styles.back, { top: insets.top + 12 }]} onPress={() => router.canGoBack() ? router.back() : router.replace('/login')}>
          <View style={styles.backCircle}>
            <Text style={styles.backArrow}>‹</Text>
          </View>
        </TouchableOpacity>

        <Animated.View style={[styles.content, { paddingBottom: insets.bottom + 40 }, { opacity, transform: [{ translateY: slideY }] }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoWrap}>
              <View style={[styles.circle, { backgroundColor: colors.blue, left: 0 }]} />
              <View style={[styles.circle, { backgroundColor: colors.violet, right: 0, opacity: 0.9 }]} />
            </View>
            <Text style={styles.appName}>Venn</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <TouchableOpacity style={styles.phoneBtn} onPress={() => handleMethodPress('phone')} activeOpacity={0.9}>
            <Text style={styles.phoneBtnIcon}>📞</Text>
            <Text style={styles.phoneBtnText}>Continue with phone</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.emailBtn} onPress={() => handleMethodPress('email')} activeOpacity={0.85}>
            <Text style={styles.emailBtnIcon}>✉</Text>
            <Text style={styles.emailBtnText}>Continue with email</Text>
          </TouchableOpacity>

          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.googleBtn, loading && styles.btnDisabled]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              {!loading && (
                <View style={styles.googleLogoBg}>
                  <GoogleLogo width={16} height={16} />
                </View>
              )}
              <Text style={styles.googleBtnText}>{loading ? 'Signing in…' : 'Continue with Google'}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ImageBackground>

      <Modal visible={!!nudge} transparent animationType="none" onRequestClose={() => setNudge(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,10,20,0.55)', opacity: nudgeBackdropOpacity }]}
          />
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setNudge(null)} />

          <Animated.View style={[styles.nudgeCard, { paddingBottom: insets.bottom + 28 }, { transform: [{ translateY: nudgeSheetY }] }]}>
            <View style={styles.nudgeHandle} />
            <Text style={styles.nudgeIcon}>🔒</Text>
            <Text style={styles.nudgeTitle}>Google sign-in is more secure</Text>
            <Text style={styles.nudgeBody}>
              Your Google account already protects you with 2-step verification — there's no code to intercept and nothing to lose access to. Signing up with your {nudgeLabel} still works, it's just less protected.
            </Text>

            <TouchableOpacity style={styles.nudgePrimary} onPress={handleGoogleSignIn} activeOpacity={0.85}>
              <View style={styles.googleLogoBg}>
                <GoogleLogo width={16} height={16} />
              </View>
              <Text style={styles.nudgePrimaryText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.nudgeSecondary}
              onPress={() => { const m = nudge; setNudge(null); goTo(m); }}
              activeOpacity={0.85}
            >
              <Text style={styles.nudgeSecondaryText}>Use my {nudgeLabel} anyway</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, ...Platform.select({ web: { height: '100dvh', overflow: 'hidden' } }) },
  bg: { flex: 1, backgroundColor: '#111' },
  bgImage: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', top: '30%', left: 0, right: 0, bottom: 0 },
  back: { position: 'absolute', left: 24, zIndex: 10 },
  backCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: '#fff', fontSize: 24, lineHeight: 28, marginLeft: -2 },
  content: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 28, gap: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  logoWrap: { width: 32, height: 20, position: 'relative' },
  circle: { position: 'absolute', top: 0, width: 20, height: 20, borderRadius: 10 },
  appName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: '#fff' },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 26, color: '#fff', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginBottom: 4 },
  phoneBtn: { backgroundColor: '#fff', borderRadius: 50, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  phoneBtnIcon: { fontSize: 18 },
  phoneBtnText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  emailBtn: { borderRadius: 50, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  emailBtnIcon: { fontSize: 16, color: '#fff' },
  emailBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  googleBtn: { borderRadius: 50, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.12)' },
  googleLogoBg: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  googleBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },

  // Google-recommendation sheet (sign-up only). Dark to sit with the hero
  // behind it rather than flashing a white panel over the photo.
  nudgeCard: {
    backgroundColor: '#16181F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 12,
    gap: 12,
  },
  nudgeHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', marginBottom: 12 },
  nudgeIcon: { fontSize: 26 },
  nudgeTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: '#fff', letterSpacing: -0.6 },
  nudgeBody: { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 21, marginBottom: 6 },
  nudgePrimary: { backgroundColor: '#fff', borderRadius: 50, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  nudgePrimaryText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  nudgeSecondary: { borderRadius: 50, paddingVertical: 15, alignItems: 'center' },
  nudgeSecondaryText: { color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: '600' },
});
