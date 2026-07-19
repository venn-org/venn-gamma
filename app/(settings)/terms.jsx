import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={s.title}>Terms & Privacy</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={s.content}>
        <Ionicons name="document-text-outline" size={48} color="#C0C5D0" />
        <Text style={s.comingSoon}>Coming Soon</Text>
        <Text style={s.subText}>Terms & Privacy documents will be available soon.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.ink },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, paddingBottom: 100 },
  comingSoon: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: colors.ink, marginTop: 16, marginBottom: 8 },
  subText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: '#9AA0B2', textAlign: 'center' },
});
