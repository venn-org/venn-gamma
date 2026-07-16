import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Pressable, StyleSheet, Dimensions, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';

const { height: SCREEN_H } = Dimensions.get('window');

const PREF_SECTIONS = [
  {
    title: 'BASIC',
    rows: [
      { key: 'role', label: 'I am...', placeholder: 'Select your role', multi: false },
      { key: 'budget', label: 'Budget', placeholder: 'Select budget', multi: false },
    ]
  },
  {
    title: 'PREFERENCES',
    rows: [
      { key: 'areas', label: 'Areas', placeholder: 'Select areas', multi: true },
    ]
  }
];

export default function PreferencesSheet({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const [openKey, setOpenKey] = useState(null);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[ps.sheet, { height: SCREEN_H * 0.72, paddingBottom: insets.bottom }]}>
          <View style={ps.handle} />
          
          <View style={ps.header}>
            <Text style={ps.title}>Preferences</Text>
            <TouchableOpacity style={ps.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={14} color="#14161B" />
            </TouchableOpacity>
          </View>
          <Text style={ps.subtitle}>Set what you need — we'll show you the right matches.</Text>
          <View style={ps.headerDivider} />

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {PREF_SECTIONS.map(section => (
              <View key={section.title} style={{ paddingHorizontal: 20 }}>
                <View style={ps.sectionHeader}>
                  <Text style={ps.sectionTitle}>{section.title}</Text>
                  <View style={ps.sectionLine} />
                </View>
                {section.rows.map((row) => (
                  <TouchableOpacity
                    key={row.key}
                    style={ps.prefRow}
                    onPress={() => setOpenKey(openKey === row.key ? null : row.key)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={ps.prefTitle}>{row.label}</Text>
                      <Text style={ps.prefVal}>{row.placeholder}</Text>
                    </View>
                    <Ionicons name={openKey === row.key ? 'chevron-up' : 'chevron-down'} size={16} color="#9AA0B2" />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>

          <View style={ps.saveFooter}>
            <TouchableOpacity style={[ps.saveBtn, { backgroundColor: colors.blue }]} onPress={onClose}>
              <Text style={ps.saveBtnText}>Save Preferences</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ps = StyleSheet.create({
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, flexDirection: 'column' },
  handle: { width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 4 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, fontWeight: '700', color: '#14161B' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2', paddingHorizontal: 20, marginBottom: 16 },
  headerDivider: { height: 1, backgroundColor: '#F0F1F5', marginHorizontal: 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 18, paddingBottom: 8 },
  sectionTitle: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: '#9AA0B2', letterSpacing: 1.2, textTransform: 'uppercase' },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#F0F1F5' },
  prefRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F0F1F5' },
  prefTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, fontWeight: '600', color: '#14161B', marginBottom: 2 },
  prefVal: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2' },
  saveFooter: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, borderTopWidth: 1, borderTopColor: '#F0F1F5', backgroundColor: '#fff' },
  saveBtn: { borderRadius: 50, overflow: 'hidden', paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, fontWeight: '700', color: '#fff' },
});
