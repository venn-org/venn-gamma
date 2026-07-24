import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ImageBackground, Platform, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { signInWithGoogle } from '../../lib/auth';
import { colors } from '../../lib/theme';
import GoogleLogo from '../../assets/images/signin-google-logo.svg';

export default function AuthMethodsScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams(); // 'signup' or 'signin'
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const slideY = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true })
    ]).start();
  }, []);

  const title = mode === 'signup' ? 'Get started' : 'Welcome back';
  const subtitle = mode === 'signup' ? "Choose how you'd like to create your account." : "Choose how you'd like to continue.";

  const handleGoogleSignUp = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Not available', 'Google sign-in on native requires a dev-build. Use phone or email instead.');
      return;
    }
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

          {Platform.OS !== 'web' && (
            <TouchableOpacity style={styles.phoneBtn} onPress={() => router.push(`/(auth)/phone?mode=${mode}`)} activeOpacity={0.9}>
              <Text style={styles.phoneBtnIcon}>📞</Text>
              <Text style={styles.phoneBtnText}>Continue with phone</Text>
            </TouchableOpacity>
          )}

          {Platform.OS === 'web' && (
            <TouchableOpacity style={styles.phoneBtn} onPress={() => router.push(`/(auth)/phone?mode=${mode}`)} activeOpacity={0.9}>
              <Text style={styles.phoneBtnIcon}>📞</Text>
              <Text style={styles.phoneBtnText}>Continue with phone</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.emailBtn}
            onPress={() => router.push(`/(auth)/email?mode=${mode}`)}
            activeOpacity={0.85}
          >
            <Text style={styles.emailBtnIcon}>✉</Text>
            <Text style={styles.emailBtnText}>Continue with email</Text>
          </TouchableOpacity>

          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.googleBtn, loading && styles.btnDisabled]}
              onPress={handleGoogleSignUp}
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
});
