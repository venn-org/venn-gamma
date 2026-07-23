import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StandoutsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: insets.top + 14 }]}>
      <View style={s.center}>
        <View style={s.iconWrap}>
          <Ionicons name="star" size={32} color="#8A5BFF" />
        </View>
        <Text style={s.title}>Standouts</Text>
        <Text style={s.subtitle}>Coming soon</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(138,91,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: '#fff' },
  subtitle: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.5)' },
});
