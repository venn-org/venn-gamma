import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[s.screen, { paddingTop: insets.top + 4 }]}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={18} color={colors.ink} />
        </TouchableOpacity>
        <Text style={s.title}>Chat</Text>
      </View>
      <View style={s.empty}>
        <Ionicons name="chatbubbles-outline" size={40} color="#D5D8E0" />
        <Text style={s.emptyTitle}>Chat coming soon</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: colors.ink },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: colors.ink, textAlign: 'center' },
});
