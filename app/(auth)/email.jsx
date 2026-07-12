import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import { sendEmailLink } from '../../lib/auth';
import { Ionicons } from '@expo/vector-icons';

export default function EmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendEmailLink(email.trim());
      setSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <TouchableOpacity style={s.back} onPress={() => router.back()}>
        <Text style={s.backArrow}>‹</Text>
      </TouchableOpacity>

      <View style={s.body}>
        {sent ? (
          <View style={s.sentContainer}>
            <View style={s.iconCircle}>
              <Ionicons name="mail" size={32} color={colors.blue} />
            </View>
            <Text style={s.title}>Check your email</Text>
            <Text style={s.sub}>We sent a sign-in link to {email}. Tap the link to continue.</Text>
            
            <TouchableOpacity onPress={() => setSent(false)} style={{ marginTop: 24 }}>
              <Text style={s.resendText}>Use a different email</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={s.title}>What's your email?</Text>
            <Text style={s.sub}>We'll email you a magic link for a password-free sign in.</Text>

            <TextInput
              style={s.input}
              placeholder="name@example.com"
              placeholderTextColor={colors.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              autoFocus
            />
            {error ? <Text style={s.errorText}>{error}</Text> : null}
          </>
        )}
      </View>

      {!sent && (
        <View style={[s.footer, { paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity onPress={handleSend} disabled={loading || !email}>
            <LinearGradient 
              colors={['#335CFF', '#8A5BFF']} 
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} 
              style={[s.btn, (loading || !email) && { opacity: 0.5 }]}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Send sign-in link</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 16, marginTop: 4 },
  backArrow: { fontSize: 28, color: colors.ink, lineHeight: 32 },
  
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 20 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, color: colors.ink, marginBottom: 8, letterSpacing: -0.5 },
  sub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.slate, lineHeight: 22, marginBottom: 32 },
  
  input: { backgroundColor: colors.inputBg, borderRadius: 14, padding: 18, fontFamily: 'HankenGrotesk_400Regular', fontSize: 16, color: colors.ink },
  errorText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.error, marginTop: 12 },
  
  sentContainer: { alignItems: 'center', justifyContent: 'center', flex: 1, paddingBottom: 100 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EEF1FF', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  resendText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: colors.blue },
  
  footer: { paddingHorizontal: 28, paddingTop: 12 },
  btn: { borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#fff' },
});
