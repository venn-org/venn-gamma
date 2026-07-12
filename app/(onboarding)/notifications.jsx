import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ImageBackground, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import { useOnboarding } from '../../hooks/useOnboarding';
import { subscribeToPush } from '../../lib/push';
import { getCurrentUserId } from '../../lib/auth';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { saveAll } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const finish = async (enablePush = false) => {
    setLoading(true);
    setError('');
    try {
      if (enablePush) {
        await subscribeToPush(getCurrentUserId());
      }
      
      // Save all onboarding data to Supabase
      await saveAll();
      
      // The auth guard in app/_layout.jsx will automatically 
      // detect onboarding is done and route to the main feed.
    } catch (e) {
      setError(e.message || 'Failed to save profile. Please try again.');
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={require('../../assets/notif-bg.jpeg')} style={s.bg} resizeMode="cover">
      <LinearGradient colors={['rgba(20,22,27,0)', 'rgba(20,22,27,0.9)', '#14161B']} style={s.overlay} locations={[0, 0.4, 1]}>
        
        <View style={s.content}>
          <View style={s.iconWrap}>
            <View style={s.iconBg}>
              <Ionicons name="notifications" size={32} color={colors.blue} />
            </View>
            <View style={s.badge} />
          </View>
          
          <Text style={s.title}>Don't miss out</Text>
          <Text style={s.sub}>Get notified when someone matches with you or sends a message.</Text>
        </View>

        <View style={[s.footer, { paddingBottom: insets.bottom + 24 }]}>
          {error ? <Text style={s.error}>{error}</Text> : null}
          
          <TouchableOpacity onPress={() => finish(true)} disabled={loading}>
            <LinearGradient 
              colors={['#335CFF', '#8A5BFF']} 
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} 
              style={[s.btn, loading && { opacity: 0.5 }]}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Enable notifications</Text>}
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => finish(false)} disabled={loading} style={s.skipBtn}>
            <Text style={s.skipText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#14161B' },
  overlay: { flex: 1, paddingHorizontal: 28, justifyContent: 'flex-end' },
  
  content: { alignItems: 'center', marginBottom: 40 },
  iconWrap: { position: 'relative', marginBottom: 24 },
  iconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(51,92,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.red, borderWidth: 3, borderColor: '#14161B' },
  
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: '#fff', marginBottom: 12, letterSpacing: -1, textAlign: 'center' },
  sub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 16, color: 'rgba(255,255,255,0.7)', lineHeight: 24, textAlign: 'center', paddingHorizontal: 10 },
  
  error: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.error, textAlign: 'center', marginBottom: 16 },
  
  footer: { gap: 16 },
  btn: { borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#fff' },
  
  skipBtn: { paddingVertical: 14, alignItems: 'center' },
  skipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: 'rgba(255,255,255,0.5)' },
});
