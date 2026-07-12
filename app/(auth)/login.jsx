import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';
import { signInWithGoogle } from '../../lib/auth';

export default function LoginScreen() {
  const router = useRouter();

  const handleGoogle = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Not available', 'Google sign-in on native requires a dev-build. Use phone or email instead.');
      return;
    }
    try {
      await signInWithGoogle();
      // Auth listener in _layout will route automatically
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        Alert.alert('Sign in failed', e.message);
      }
    }
  };

  return (
    <ImageBackground source={require('../../assets/hero.jpeg')} style={s.bg} resizeMode="cover">
      <LinearGradient colors={['rgba(10,10,20,0)', 'rgba(10,10,20,0.85)', '#0a0a14']} style={s.overlay} locations={[0, 0.4, 1]}>
        
        <View style={s.logoWrap}>
          <View style={[s.circle, { backgroundColor: '#335CFF', left: 0 }]} />
          <View style={[s.circle, { backgroundColor: '#8A5BFF', right: 0, opacity: 0.9 }]} />
        </View>

        <View style={s.content}>
          <Text style={s.headline}>Find the right flatmate, faster.</Text>
          <Text style={s.sub}>Matches based on lifestyle, budget and area — so you can skip the awkward interviews.</Text>

          <View style={s.btnGroup}>
            <TouchableOpacity onPress={() => router.push({ pathname: '/auth-methods', params: { mode: 'signup' } })} activeOpacity={0.85}>
              <LinearGradient colors={['#335CFF', '#8A5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnPrimary}>
                <Text style={s.btnPrimaryText}>Create account</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={s.btnWhite} onPress={handleGoogle} activeOpacity={0.85}>
              <Ionicons name="logo-google" size={18} color={colors.ink} style={{ marginRight: 10 }} />
              <Text style={s.btnWhiteText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
              <Text style={s.signInText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/auth-methods', params: { mode: 'signin' } })}>
                <Text style={s.signInLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={s.legal}>
            By continuing, you agree to our <Text style={s.legalLink}>Terms of Service</Text> and <Text style={s.legalLink}>Privacy Policy</Text>.
          </Text>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0a0a14' },
  overlay: { flex: 1, padding: 28, paddingBottom: 40, justifyContent: 'space-between' },
  
  logoWrap: { width: 56, height: 36, position: 'relative', marginTop: 60 },
  circle: { position: 'absolute', top: 0, width: 36, height: 36, borderRadius: 18 },
  
  content: { gap: 24 },
  headline: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 44, color: '#fff', letterSpacing: -1.5, lineHeight: 48 },
  sub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 16, color: 'rgba(255,255,255,0.7)', lineHeight: 24, paddingRight: 20 },
  
  btnGroup: { gap: 12, marginTop: 16 },
  btnPrimary: { borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnPrimaryText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#fff' },
  btnWhite: { backgroundColor: '#fff', borderRadius: 50, paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnWhiteText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: colors.ink },
  
  signInText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: 'rgba(255,255,255,0.6)' },
  signInLink: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: '#fff' },
  
  legal: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 18, marginTop: 16 },
  legalLink: { textDecorationLine: 'underline' },
});
