import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';
import { signInWithGoogle } from '../../lib/auth';

export default function AuthMethodsScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams(); // 'signup' or 'signin'

  const title = mode === 'signup' ? 'Get started' : 'Welcome back';
  
  const handleGoogle = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Not available', 'Google sign-in on native requires a dev-build. Use phone or email instead.');
      return;
    }
    try {
      await signInWithGoogle();
      // Auth listener routes automatically
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        Alert.alert('Sign in failed', e.message);
      }
    }
  };

  return (
    <ImageBackground source={require('../../assets/hero.jpeg')} style={s.bg} resizeMode="cover">
      <LinearGradient colors={['rgba(10,10,20,0)', 'rgba(10,10,20,0.85)', '#0a0a14']} style={s.overlay} locations={[0, 0.4, 1]}>
        
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={s.content}>
          <Text style={s.headline}>{title}</Text>
          <Text style={s.sub}>Choose how you'd like to continue.</Text>

          <View style={s.btnGroup}>
            <TouchableOpacity onPress={() => router.push('/phone')} activeOpacity={0.85}>
              <LinearGradient colors={['#335CFF', '#8A5BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnPrimary}>
                <Ionicons name="call" size={18} color="#fff" style={{ marginRight: 10 }} />
                <Text style={s.btnPrimaryText}>Continue with Phone</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={s.btnWhite} onPress={handleGoogle} activeOpacity={0.85}>
              <Ionicons name="logo-google" size={18} color={colors.ink} style={{ marginRight: 10 }} />
              <Text style={s.btnWhiteText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.btnOutline} onPress={() => router.push('/email')} activeOpacity={0.85}>
              <Ionicons name="mail" size={18} color="#fff" style={{ marginRight: 10 }} />
              <Text style={s.btnOutlineText}>Continue with Email</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0a0a14' },
  overlay: { flex: 1, padding: 28, paddingBottom: 50, justifyContent: 'space-between' },
  
  topBar: { marginTop: 50 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  
  content: { gap: 24 },
  headline: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 36, color: '#fff', letterSpacing: -1 },
  sub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 16, color: 'rgba(255,255,255,0.7)', lineHeight: 24 },
  
  btnGroup: { gap: 12, marginTop: 16 },
  btnPrimary: { borderRadius: 50, paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnPrimaryText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#fff' },
  btnWhite: { backgroundColor: '#fff', borderRadius: 50, paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnWhiteText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: colors.ink },
  btnOutline: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 50, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnOutlineText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#fff' },
});
