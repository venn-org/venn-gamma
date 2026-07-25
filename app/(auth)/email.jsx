import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isValidEmail, sendEmailOtp } from "../../lib/auth";
import { colors } from "../../lib/theme";

export default function EmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams(); // 'signup' or 'signin'
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const slideY = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideY, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const valid = isValidEmail(email);

  const handleSend = async () => {
    if (!valid) return;
    setLoading(true);
    setError("");
    const address = email.trim().toLowerCase();
    try {
      await sendEmailOtp(address, mode);
      router.push(`/(auth)/email-otp?email=${encodeURIComponent(address)}&mode=${mode ?? 'signup'}`);
    } catch (e) {
      console.error('sendEmailOtp failed:', e);
      // "Sign in" uses shouldCreateUser:false, so an unknown address is a real
      // outcome to explain rather than a generic failure.
      if (e.code === 'otp_disabled' || e.code === 'signup_disabled') {
        setError("We couldn't find an account for that email. Try creating one instead.");
      } else if (e.status === 429 || e.code === 'over_email_send_rate_limit') {
        setError('Too many requests. Please wait a minute and try again.');
      } else {
        setError(e.message || 'Failed to send the code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity
        style={styles.back}
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/login")
        }
      >
        <Text style={styles.backArrow}>‹</Text>
      </TouchableOpacity>

      <Animated.View
        style={[styles.body, { opacity, transform: [{ translateY: slideY }] }]}
      >
        <View style={styles.logoRow}>
          <View style={styles.logoWrap}>
            <View
              style={[styles.circle, { backgroundColor: colors.blue, left: 0 }]}
            />
            <View
              style={[
                styles.circle,
                { backgroundColor: colors.violet, right: 0, opacity: 0.9 },
              ]}
            />
          </View>
        </View>
        <Text style={styles.title}>What's your email?</Text>
        <Text style={styles.subtitle}>
          We'll send you a 6-digit code to sign in — no password needed.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor={colors.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          autoFocus
        />
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.btn, !valid && styles.btnDisabled]}
          onPress={handleSend}
          disabled={!valid || loading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[colors.blue, colors.violet]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBtn}
          >
            <Text style={styles.btnText}>
              {loading ? "Sending…" : "Send code"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
    ...Platform.select({ web: { height: "100dvh", overflow: "hidden" } }),
  },
  back: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
    marginTop: 14,
  },
  backArrow: { fontSize: 28, color: colors.ink, lineHeight: 32 },
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 20 },
  logoRow: { marginBottom: 24 },
  logoWrap: { width: 32, height: 20, position: "relative" },
  circle: {
    position: "absolute",
    top: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  subtitle: { fontSize: 14, color: colors.placeholder, marginBottom: 28 },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 17,
    fontSize: 16,
    color: colors.ink,
    borderWidth: 2,
    borderColor: "transparent",
  },
  footer: { paddingHorizontal: 28, paddingTop: 12 },
  btn: { borderRadius: 50, overflow: "hidden" },
  btnDisabled: { opacity: 0.32 },
  gradientBtn: { paddingVertical: 18, alignItems: "center", borderRadius: 50 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  errorText: {
    color: "#e02020",
    fontSize: 13,
    marginBottom: 10,
    textAlign: "center",
  },
});
