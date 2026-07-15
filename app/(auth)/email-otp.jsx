import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors } from '../../lib/theme';
import { completeEmailLink, ensureProfile } from '../../lib/auth';

export default function EmailOtpScreen() {
  const { link, email, mode } = useLocalSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    async function verify() {
      try {
        await completeEmailLink(email, link);
        await ensureProfile();
        // Auth listener routes automatically
      } catch (e) {
        setError(e.message);
      }
    }
    if (link && email) {
      verify();
    } else {
      setError('Invalid link.');
    }
  }, [link, email]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Link failed</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.blue} />
      <Text style={styles.text}>Redirecting…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', gap: 16 },
  text: { fontSize: 14, color: colors.placeholder },
  errorTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: colors.error, marginBottom: 10 },
  errorText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.slate, textAlign: 'center' },
});
