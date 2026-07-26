import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import { sendEmailOtp, verifyEmailOtp, ensureProfile, getPendingEmail } from '../../lib/auth';

export default function EmailOtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams();
  // Held in module scope rather than a route param so the address never lands
  // in the web build's URL bar or history (see lib/auth.js).
  const email = getPendingEmail();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputs = useRef([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(60);

  const slideY = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true })
    ]).start();
  }, []);

  // A hard reload on web drops the module-scope address, and there's nothing
  // to verify a code against without it — send the user back a step.
  useEffect(() => {
    if (!email) router.replace('/(auth)/email');
  }, [email]);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const shake = () => {
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const handleVerify = async (codeOverride) => {
    const code = codeOverride ?? otp.join('');
    if (code.length < 6) return;
    setLoading(true);
    setError('');
    try {
      await verifyEmailOtp(email, code);
      await ensureProfile();
      // Auth listener in _layout routes onwards
    } catch (e) {
      console.error('verifyEmailOtp failed:', e);
      shake();
      setOtp(['', '', '', '', '', '']);
      setError(
        e.code === 'otp_expired'
          ? 'That code has expired. Request a new one.'
          : 'That code is incorrect. Please try again.'
      );
      if (inputs.current[0]) inputs.current[0].focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    try {
      await sendEmailOtp(email, mode);
      setCooldown(60);
    } catch (e) {
      console.error('sendEmailOtp failed:', e);
      setError(e.message || 'Failed to resend the code. Please try again.');
    }
  };

  const handleChange = (v, i) => {
    // Emailed codes get pasted far more often than phone codes get typed, so
    // spread a multi-character paste across the boxes instead of dropping it.
    const digits = v.replace(/\D/g, '');
    if (digits.length > 1) {
      const next = [...otp];
      for (let k = 0; k < digits.length && i + k < 6; k++) next[i + k] = digits[k];
      setOtp(next);
      const last = Math.min(i + digits.length, 5);
      inputs.current[last]?.focus();
      if (next.every(d => d !== '')) handleVerify(next.join(''));
      return;
    }

    const next = [...otp];
    next[i] = digits;
    setOtp(next);
    if (digits && i < 5) inputs.current[i + 1]?.focus();
    if (digits && i === 5 && next.every(d => d !== '')) handleVerify(next.join(''));
  };

  const handleKeyPress = (e, i) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0) {
      inputs.current[i - 1].focus();
      const next = [...otp];
      next[i - 1] = '';
      setOtp(next);
    }
  };

  const complete = otp.every(d => d !== '');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.progressTrack, { marginTop: 14 }]}>
        <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: '20%' }]} />
      </View>

      <TouchableOpacity style={styles.back} onPress={() => router.canGoBack() ? router.back() : router.replace('/login')}>
        <Text style={styles.backArrow}>‹</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.body, { opacity, transform: [{ translateY: slideY }] }]}>
        <View style={styles.logoRow}>
          <View style={styles.logoWrap}>
            <View style={[styles.circle, { backgroundColor: colors.blue, left: 0 }]} />
            <View style={[styles.circle, { backgroundColor: colors.violet, right: 0, opacity: 0.9 }]} />
          </View>
        </View>
        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.subtitle}>Sent to {email}</Text>

        <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeX }] }]}>
          {otp.map((d, i) => (
            <TextInput
              key={i}
              ref={r => inputs.current[i] = r}
              style={[styles.otpBox, d && styles.otpBoxFilled]}
              value={d}
              onChangeText={v => handleChange(v, i)}
              onKeyPress={e => handleKeyPress(e, i)}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={i === 0 ? 6 : 1}
              selectTextOnFocus
              autoFocus={i === 0}
            />
          ))}
        </Animated.View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity onPress={handleResend} disabled={cooldown > 0}>
          <Text style={[styles.resend, cooldown > 0 && { color: colors.placeholder }]}>
            {cooldown > 0 ? `RESEND CODE IN ${cooldown}S` : 'RESEND CODE'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[styles.btn, !complete && styles.btnDisabled]}
          onPress={() => handleVerify()}
          disabled={!complete || loading}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtn}>
            <Text style={styles.btnText}>{loading ? 'Verifying…' : 'Verify & sign in'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, ...Platform.select({ web: { height: '100dvh', overflow: 'hidden' } }) },
  progressTrack: { height: 3, backgroundColor: 'rgba(0,0,0,0.08)', marginHorizontal: 28, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 16, marginTop: 4 },
  backArrow: { fontSize: 28, color: colors.ink, lineHeight: 32 },
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 20 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: colors.ink, letterSpacing: -1, lineHeight: 38, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 32 },

  logoRow: { marginBottom: 24 },
  logoWrap: { width: 32, height: 20, position: 'relative' },
  circle: { position: 'absolute', top: 0, width: 20, height: 20, borderRadius: 10 },
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 24 },
  otpBox: { width: 48, height: 62, borderRadius: 14, backgroundColor: colors.inputBg, borderWidth: 2, borderColor: 'transparent', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 26, textAlign: 'center', color: colors.ink },
  otpBoxFilled: { borderColor: colors.blue, backgroundColor: '#fff' },
  errorText: { fontSize: 13, color: colors.error, textAlign: 'center', marginBottom: 14, fontWeight: '500' },
  resend: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, letterSpacing: 1.2, color: colors.blue, textAlign: 'center' },

  footer: { paddingHorizontal: 28, paddingTop: 12 },
  btn: { backgroundColor: colors.ink, borderRadius: 50, overflow: 'hidden', paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  gradientBtn: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
