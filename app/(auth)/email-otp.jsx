import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../lib/theme';
import { completeEmailLink, ensureProfile, isPendingEmailLink, EMAIL_REQUIRED } from '../../lib/auth';

/**
 * Landing screen for the email magic link.
 *
 * Firebase redirects here with the `oobCode` in the query string, so the link
 * is `window.location.href` — there is no `link` param to read. Sign-in also
 * needs the address the link was issued to; it's normally in localStorage from
 * when the link was requested, but if the user opened the link on a different
 * device we have to ask for it.
 */
export default function EmailOtpScreen() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [needsEmail, setNeedsEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  // StrictMode / fast-refresh can fire the effect twice; the oobCode is
  // single-use, so a second run would fail with an "invalid link" error.
  const started = useRef(false);

  const currentUrl = Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.href
    : '';

  const finish = async (address) => {
    await completeEmailLink(currentUrl, address);
    await ensureProfile();
    // Strip the oobCode so a refresh doesn't retry a spent link.
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    // Auth listener in _layout routes onwards from here
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!isPendingEmailLink(currentUrl)) {
      setError('This sign-in link is invalid or has already been used. Please request a new one.');
      return;
    }

    finish().catch((e) => {
      if (e.code === EMAIL_REQUIRED) {
        setNeedsEmail(true);
        return;
      }
      console.error('completeEmailLink failed:', e);
      setError('This link is invalid or has expired. Please request a new one.');
    });
  }, []);

  const valid = email.includes('@') && email.includes('.');

  const handleConfirm = async () => {
    if (!valid) return;
    setLoading(true);
    setError('');
    try {
      await finish(email.trim());
    } catch (e) {
      console.error('completeEmailLink failed:', e);
      setError("That email doesn't match this link. Please check it and try again.");
      setLoading(false);
    }
  };

  if (error && !needsEmail) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Link failed</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.replace('/login')} activeOpacity={0.85}>
          <Text style={styles.retryBtnText}>Back to sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (needsEmail) {
    return (
      <View style={styles.formContainer}>
        <Text style={styles.title}>Confirm your email</Text>
        <Text style={styles.subtitle}>
          You opened this link on a different device, so we need the email address you asked for it with.
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

        {error ? <Text style={styles.inlineError}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, !valid && styles.btnDisabled]}
          onPress={handleConfirm}
          disabled={!valid || loading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[colors.blue, colors.violet]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBtn}
          >
            <Text style={styles.btnText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.blue} />
      <Text style={styles.text}>Signing you in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 28 },
  text: { fontSize: 14, color: colors.placeholder },
  errorTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: colors.error, marginBottom: 10 },
  errorText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.slate, textAlign: 'center' },
  retryBtn: { marginTop: 12, borderRadius: 50, paddingVertical: 14, paddingHorizontal: 36, borderWidth: 1.5, borderColor: colors.mist },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: colors.ink },

  formContainer: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 26, color: colors.ink, letterSpacing: -0.8 },
  subtitle: { fontSize: 14, color: colors.placeholder, marginBottom: 16, lineHeight: 21 },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 17,
    fontSize: 16,
    color: colors.ink,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inlineError: { color: colors.error, fontSize: 13, textAlign: 'center' },
  btn: { borderRadius: 50, overflow: 'hidden', marginTop: 4 },
  btnDisabled: { opacity: 0.32 },
  gradientBtn: { paddingVertical: 18, alignItems: 'center', borderRadius: 50 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
