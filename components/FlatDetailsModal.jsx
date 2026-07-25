import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Pressable, StyleSheet, TextInput, Dimensions, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../lib/ThemeContext';

const { height: SCREEN_H } = Dimensions.get('window');

// Mirrors lib/enums.js ENUMS.flat_type dbToUI values.
const FLAT_TYPE_OPTIONS = ['1 RK', '1 BHK', '2 BHK', '3 BHK', '4+ BHK', 'Studio', 'Private room', 'Shared room', 'PG'];

export default function FlatDetailsModal({ visible, flatType, description, onClose, onSave }) {
  const s = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [draftType, setDraftType] = useState(flatType || '');
  const [draftDescription, setDraftDescription] = useState(description || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraftType(flatType || '');
      setDraftDescription(description || '');
    }
  }, [visible, flatType, description]);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      sheetY.setValue(SCREEN_H);
    }
  }, [visible]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave({ flatType: draftType, description: draftDescription.trim() });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View style={[s.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetY }] }]}>
          <View style={s.handle} />

          <View style={s.header}>
            <Text style={s.title}>Flat Details</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={14} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <Text style={s.subtitle}>Let others know what kind of flat you have.</Text>

          <ScrollView style={{ maxHeight: SCREEN_H * 0.55 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            <Text style={s.label}>Flat Type</Text>
            <View style={s.chipContainer}>
              {FLAT_TYPE_OPTIONS.map((opt) => {
                const on = draftType === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[s.chip, on && s.chipOn]}
                    onPress={() => setDraftType(opt)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.chipText, on && s.chipTextOn]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.label}>Description</Text>
            <TextInput
              style={s.input}
              placeholder="Describe your flat — layout, amenities, vibe..."
              placeholderTextColor="#9AA0B2"
              value={draftDescription}
              onChangeText={setDraftDescription}
              multiline
              textAlignVertical="top"
            />

            <Text style={s.hint}>Flat photos can be added from your profile.</Text>
          </ScrollView>

          <View style={s.saveFooter}>
            <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.ink },
  subtitle: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: colors.placeholder, paddingHorizontal: 20, marginTop: 4, marginBottom: 8 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },

  label: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.slate, marginBottom: 8, marginTop: 12 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 50, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.slate },
  chipTextOn: { color: '#fff' },

  input: {
    backgroundColor: colors.canvas,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 15,
    color: colors.ink,
    height: 100,
  },
  hint: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: colors.placeholder, marginTop: 12, marginBottom: 4 },

  saveFooter: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  saveBtn: { backgroundColor: colors.blue, borderRadius: 50, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#fff' },
});
