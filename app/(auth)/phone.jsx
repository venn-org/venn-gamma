import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Animated, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import { setupRecaptcha, clearRecaptcha, sendPhoneOtp, verifyPhoneOtp, ensureProfile } from '../../lib/auth';

export default function PhoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams(); // 'signin' or 'signup'
  
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputs = useRef([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [spamWarning, setSpamWarning] = useState('');
  
  const [cooldown, setCooldown] = useState(0);
  const slideY = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'web') {
      setupRecaptcha('recaptcha-container');
    }
    return () => {
      if (Platform.OS === 'web') clearRecaptcha();
    };
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true })
    ]).start();
  }, [step]);

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

  const handleSendCode = async () => {
    if (phone.length < 10) return;
    setLoading(true);
    setError('');
    setSpamWarning('');
    try {
      const cr = await sendPhoneOtp(phone);
      setConfirmationResult(cr);
      setStep('otp');
      setCooldown(60);
      slideY.setValue(50);
      opacity.setValue(0);
    } catch (e) {
      console.error('sendPhoneOtp failed:', e);
      if (e.code) {
        // Raw Firebase error (has an error code) — never show its message to the user.
        if (e.code.includes('too-many-requests')) {
          setSpamWarning('Too many attempts. Please try again later.');
        } else if (e.code.includes('operation-not-allowed')) {
          setSpamWarning('Phone sign-in is currently unavailable. Please use email instead.');
        } else {
          setSpamWarning('Failed to send code. Please try again.');
        }
      } else {
        // Our own validation/spam-protection errors are already user-friendly.
        setSpamWarning(e.message || 'Failed to send code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6 || !confirmationResult) return;
    setLoading(true);
    setError('');
    try {
      await verifyPhoneOtp(confirmationResult, code);
      await ensureProfile();
      // Auth listener routes automatically
    } catch (e) {
      shake();
      setOtp(['', '', '', '', '', '']);
      if (inputs.current[0]) inputs.current[0].focus();
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (v, i) => {
    const newOtp = [...otp];
    newOtp[i] = v;
    setOtp(newOtp);
    if (v && i < 5) inputs.current[i + 1].focus();
  };

  const handleKeyPress = (e, i) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0) {
      inputs.current[i - 1].focus();
      const newOtp = [...otp];
      newOtp[i - 1] = '';
      setOtp(newOtp);
    }
  };

  const complete = otp.every(d => d !== '');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {step === 'phone' ? (
        <View style={styles.statusBar}>
          <Text style={styles.step}>STEP 1 OF 5</Text>
        </View>
      ) : null}
      
      <View style={[styles.progressTrack, step === 'phone' ? {} : { marginTop: 14 }]}>
        <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: '20%' }]} />
      </View>

      <TouchableOpacity style={styles.back} onPress={() => step === 'otp' ? setStep('phone') : (router.canGoBack() ? router.back() : router.replace('/login'))}>
        <Text style={styles.backArrow}>‹</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.body, { opacity, transform: [{ translateY: slideY }] }]}>
        {step === 'phone' ? (
          <>
            <Text style={styles.title}>What's your phone number?</Text>
            <Text style={styles.subtitle}>We only use this to verify it's you. It won't appear on your profile.</Text>

            <View style={styles.inputRow}>
              <View style={styles.countryCode}>
                <Text style={styles.flag}>🇮🇳</Text>
                <Text style={styles.dialCode}>+91</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Phone number"
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={v => setPhone(v.replace(/\D/g, ''))}
                autoFocus
              />
            </View>

            {spamWarning ? (
              <Text style={styles.warningText}>{spamWarning}</Text>
            ) : (
              <Text style={styles.hint}>Venn will send you a verification code. Standard rates may apply.</Text>
            )}

            <View style={styles.protectionRow}>
              <Text style={styles.protectionIcon}>🛡️</Text>
              <Text style={styles.protectionText}>Protected by reCAPTCHA · Max 5 codes per day</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.logoRow}>
              <View style={styles.logoWrap}>
                <View style={[styles.circle, { backgroundColor: colors.blue, left: 0 }]} />
                <View style={[styles.circle, { backgroundColor: colors.violet, right: 0, opacity: 0.9 }]} />
              </View>
            </View>
            <Text style={styles.title}>Enter the code</Text>
            <Text style={styles.subtitle}>Sent to +91 {phone}</Text>

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
                  selectTextOnFocus
                  autoFocus={i === 0}
                />
              ))}
            </Animated.View>

            <TouchableOpacity onPress={() => handleSendCode()} disabled={cooldown > 0}>
              <Text style={[styles.resend, cooldown > 0 && { color: colors.placeholder }]}>
                {cooldown > 0 ? `RESEND CODE IN ${cooldown}S` : 'RESEND CODE'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <div id="recaptcha-container" style={{ display: 'none' }}></div>
        {step === 'phone' ? (
          <TouchableOpacity
            id="phone-send-btn"
            nativeID="phone-send-btn"
            style={[styles.btn, (phone.length < 10 || !!spamWarning) && styles.btnDisabled]}
            onPress={handleSendCode}
            disabled={phone.length < 10 || loading || !!spamWarning}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>{loading ? 'Sending…' : 'Continue'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.btn, !complete && styles.btnDisabled]}
            onPress={handleVerify}
            disabled={!complete || loading}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtn}>
              <Text style={styles.btnText}>{loading ? 'Verifying…' : 'Verify & sign in'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, ...Platform.select({ web: { height: '100dvh', overflow: 'hidden' } }) },
  statusBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 28, paddingTop: 14 },
  step: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: colors.placeholder, letterSpacing: 1.2 },
  progressTrack: { height: 3, backgroundColor: 'rgba(0,0,0,0.08)', marginHorizontal: 28, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 16, marginTop: 4 },
  backArrow: { fontSize: 28, color: colors.ink, lineHeight: 32 },
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 20 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: colors.ink, letterSpacing: -1, lineHeight: 38, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 32 },
  
  // Phone styles
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 },
  countryCode: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.inputBg, borderRadius: 14, paddingHorizontal: 14, height: 56 },
  flag: { fontSize: 20 },
  dialCode: { fontSize: 16, fontWeight: '500', color: colors.ink },
  input: { flex: 1, backgroundColor: colors.inputBg, borderRadius: 14, paddingHorizontal: 18, height: 56, fontSize: 16, color: colors.ink, borderWidth: 2, borderColor: 'transparent' },
  hint: { fontSize: 12, color: colors.placeholder, textAlign: 'center', marginTop: 8 },
  warningText: { fontSize: 13, color: colors.error, textAlign: 'center', marginTop: 8, fontWeight: '500' },
  protectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, opacity: 0.6 },
  protectionIcon: { fontSize: 12 },
  protectionText: { fontSize: 11, color: colors.placeholder },
  
  // OTP styles
  logoRow: { marginBottom: 24 },
  logoWrap: { width: 32, height: 20, position: 'relative' },
  circle: { position: 'absolute', top: 0, width: 20, height: 20, borderRadius: 10 },
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 24 },
  otpBox: { width: 48, height: 62, borderRadius: 14, backgroundColor: colors.inputBg, borderWidth: 2, borderColor: 'transparent', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 26, textAlign: 'center', color: colors.ink },
  otpBoxFilled: { borderColor: colors.blue, backgroundColor: '#fff' },
  resend: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, letterSpacing: 1.2, color: colors.blue, textAlign: 'center' },
  
  footer: { paddingHorizontal: 28, paddingTop: 12 },
  btn: { backgroundColor: colors.ink, borderRadius: 50, overflow: 'hidden', paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  gradientBtn: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
