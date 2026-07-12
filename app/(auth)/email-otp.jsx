import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors } from '../../lib/theme';
import { completeEmailLink, ensureProfile } from '../../lib/auth';

export default function EmailOtpScreen() {
  const params = useLocalSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    // In a real app with Expo Linking, you'd get the full URL.
    // For web, we can just use window.location.href.
    const url = typeof window !== 'undefined' ? window.location.href : null;
    
    if (url) {
      completeEmailLink(url)
        .then(async () => {
          await ensureProfile();
          // Auth listener routes automatically
        })
        .catch(e => {
          setError(e.message || 'Invalid or expired sign-in link.');
        });
    } else {
      setError('No sign-in link found.');
    }
  }, []);

  return (
    <View style={s.container}>
      {error ? (
        <>
          <Text style={s.errorTitle}>Sign-in Failed</Text>
          <Text style={s.errorText}>{error}</Text>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={s.text}>Verifying your sign-in link…</Text>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: 30 },
  text: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: colors.ink, marginTop: 20 },
  errorTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: colors.error, marginBottom: 10 },
  errorText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.slate, textAlign: 'center' },
});
