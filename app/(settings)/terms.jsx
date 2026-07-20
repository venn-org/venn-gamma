import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import LegalDoc from '../../components/LegalDoc';
import { TERMS_DOC, PRIVACY_DOC, COOKIE_DOC, LEGAL_DRAFT_NOTICE } from '../../lib/legal';

const TABS = [
  { key: 'terms', label: 'Terms', doc: TERMS_DOC },
  { key: 'privacy', label: 'Privacy', doc: PRIVACY_DOC },
  { key: 'cookies', label: 'Cookies', doc: COOKIE_DOC },
];

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState('terms');

  const activeDoc = TABS.find(t => t.key === active).doc;

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={s.title}>Terms & Privacy</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.tabs}>
        {TABS.map(t => {
          const on = active === t.key;
          return (
            <TouchableOpacity key={t.key} style={[s.tab, on && s.tabOn]} onPress={() => setActive(t.key)} activeOpacity={0.8}>
              <Text style={[s.tabText, on && s.tabTextOn]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.notice}>
          <Text style={s.noticeText}>{LEGAL_DRAFT_NOTICE}</Text>
        </View>
        <LegalDoc doc={activeDoc} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.ink },

  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 50, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1, borderColor: '#E6E8EE' },
  tabOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  tabText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.slate },
  tabTextOn: { color: '#fff' },

  content: { paddingHorizontal: 20, paddingBottom: 60 },
  notice: { backgroundColor: '#FDF5F0', borderRadius: 12, padding: 12, marginBottom: 20 },
  noticeText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#8A5A3A', lineHeight: 18 },
});
