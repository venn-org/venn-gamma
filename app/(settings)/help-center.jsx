import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../../lib/ThemeContext';

export default function HelpCenterScreen() {
  const s = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={s.screen}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')}>
          <Ionicons name="chevron-back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={s.title}>Help Center</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={s.content}>
        <Ionicons name="help-buoy-outline" size={48} color="#C0C5D0" />
        <Text style={s.comingSoon}>Coming Soon</Text>
        <Text style={s.subText}>Help Center content will be available soon.</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12, backgroundColor: colors.header },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.headerText },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, paddingBottom: 100 },
  comingSoon: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: colors.ink, marginTop: 16, marginBottom: 8 },
  subText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.placeholder, textAlign: 'center' },
});
