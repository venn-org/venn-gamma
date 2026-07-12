import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import { setupRecaptcha, sendPhoneOtp, verifyPhoneOtp, ensureProfile } from '../../lib/auth';

export default function PhoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  
  const [cooldown, setCooldown] = useState(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'web') {
      setupRecaptcha('recaptcha-container');
    }
  }, []);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const shake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const handleSendCode = async () => {
    if (phone.length < 10) return;
    setLoading(true);
    setError('');
    try {
      const cr = await sendPhoneOtp(phone);
      setConfirmationResult(cr);
      setStep('otp');
      setCooldown(60);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length < 6 || !confirmationResult) return;
    setLoading(true);
    setError('');
    try {
      await verifyPhoneOtp(confirmationResult, code);
      await ensureProfile();
      // Auth listener routes automatically
    } catch (e) {
      setError('Invalid code. Please try again.');
      shake();
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <View style={s.progressTrack}>
          <LinearGradient colors={['#335CFF', '#8A5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.progressFill, { width: step === 'phone' ? '50%' : '100%' }]} />
        </View>
        <Text style={s.stepLabel}>STEP {step === 'phone' ? '1' : '2'} OF 2</Text>
      </View>

      <TouchableOpacity style={s.back} onPress={() => step === 'otp' ? setStep('phone') : router.back()}>
        <Text style={s.backArrow}>‹</Text>
      </TouchableOpacity>

      <View style={s.body}>
        {step === 'phone' ? (
          <>
            <Text style={s.title}>What's your number?</Text>
            <Text style={s.sub}>We'll text you a code to verify your account.</Text>

            <View style={s.inputRow}>
              <View style={s.countryBox}>
                <Text style={s.countryText}>IN +91</Text>
              </View>
              <TextInput
                style={s.input}
                placeholder="00000 00000"
                placeholderTextColor={colors.placeholder}
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
                autoFocus
              />
            </View>
            {error ? <Text style={s.errorText}>{error}</Text> : null}
          </>
        ) : (
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <Text style={s.title}>Enter your code</Text>
            <Text style={s.sub}>Sent to +91 {phone}</Text>

            <TextInput
              style={s.otpInput}
              placeholder="000000"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              autoFocus
              textAlign="center"
            />
            {error ? <Text style={s.errorText}>{error}</Text> : null}
            
            <TouchableOpacity 
              style={{ marginTop: 20 }} 
              onPress={handleSendCode} 
              disabled={cooldown > 0 || loading}
            >
              <Text style={[s.resendText, cooldown > 0 && s.resendDisabled]}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      <View style={[s.footer, { paddingBottom: insets.bottom + 24 }]}>
        <div id="recaptcha-container" style={{ display: 'none' }}></div>
        <TouchableOpacity 
          onPress={step === 'phone' ? handleSendCode : handleVerify} 
          disabled={loading || (step === 'phone' ? phone.length < 10 : code.length < 6)}
        >
          <LinearGradient 
            colors={['#335CFF', '#8A5BFF']} 
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} 
            style={[s.btn, (loading || (step === 'phone' ? phone.length < 10 : code.length < 6)) && { opacity: 0.5 }]}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Continue</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  topBar: { paddingHorizontal: 28, paddingTop: 14, gap: 8 },
  progressTrack: { height: 3, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  stepLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: colors.placeholder, letterSpacing: 1.2, textAlign: 'right' },
  
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 16, marginTop: 4 },
  backArrow: { fontSize: 28, color: colors.ink, lineHeight: 32 },
  
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 20 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, color: colors.ink, marginBottom: 8, letterSpacing: -0.5 },
  sub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.slate, lineHeight: 22, marginBottom: 32 },
  
  inputRow: { flexDirection: 'row', gap: 12 },
  countryBox: { backgroundColor: colors.inputBg, borderRadius: 14, paddingHorizontal: 16, justifyContent: 'center' },
  countryText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: colors.slate },
  input: { flex: 1, backgroundColor: colors.inputBg, borderRadius: 14, padding: 18, fontFamily: 'SpaceMono_400Regular', fontSize: 20, color: colors.ink, letterSpacing: 2 },
  
  otpInput: { backgroundColor: colors.inputBg, borderRadius: 14, padding: 18, fontFamily: 'SpaceMono_400Regular', fontSize: 32, color: colors.ink, letterSpacing: 12 },
  
  errorText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.error, marginTop: 12 },
  resendText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.blue, textAlign: 'center' },
  resendDisabled: { color: colors.placeholder },
  
  footer: { paddingHorizontal: 28, paddingTop: 12 },
  btn: { borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#fff' },
});
