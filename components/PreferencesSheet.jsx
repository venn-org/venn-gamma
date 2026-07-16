import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Pressable, StyleSheet, Dimensions, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';
import { ENUMS } from '../lib/enums';

const { height: SCREEN_H } = Dimensions.get('window');

const AREAS = ['Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 'BTM Layout', 'Jayanagar', 'JP Nagar', 'Electronic City'];

export default function PreferencesSheet({ visible, prefs, onClose, onSave }) {
  const insets = useSafeAreaInsets();
  
  // Local state for editing before saving
  const [budget, setBudget] = useState(prefs?.budget || null);
  const [areas, setAreas] = useState(prefs?.areas || []);
  const [role, setRole] = useState(prefs?.role || null);

  // Sync when visible changes (resetting state if they close without saving)
  useEffect(() => {
    if (visible && prefs) {
      setBudget(prefs.budget);
      setAreas(prefs.areas || []);
      setRole(prefs.role);
    }
  }, [visible, prefs]);

  const toggleArea = (a) => {
    if (areas.includes(a)) {
      setAreas(areas.filter(x => x !== a));
    } else {
      setAreas([...areas, a]);
    }
  };

  const handleSave = () => {
    onSave({ budget, areas, role });
    onClose();
  };

  const budgets = Object.values(ENUMS.pref_budget.dbToUI);
  const roles = Object.values(ENUMS.pref_role.dbToUI);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <View style={[pref.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={pref.handle} />
          
          <View style={pref.header}>
            <Text style={pref.title}>Preferences</Text>
            <TouchableOpacity onPress={onClose} style={pref.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={14} color="#14161B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: SCREEN_H * 0.7 }} showsVerticalScrollIndicator={false}>
            
            {/* ROLE */}
            <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
              <Text style={pref.label}>I AM...</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {roles.map(r => {
                  const on = role === r;
                  return (
                    <TouchableOpacity key={r} style={[pref.chip, on && pref.chipOn]} onPress={() => setRole(r)} activeOpacity={0.8}>
                      <Text style={[pref.chipText, on && pref.chipTextOn]}>{r}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* BUDGET */}
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={pref.label}>MONTHLY BUDGET</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {budgets.map(b => {
                  const on = budget === b;
                  return (
                    <TouchableOpacity key={b} style={[pref.chip, on && pref.chipOn]} onPress={() => setBudget(b)} activeOpacity={0.8}>
                      <Text style={[pref.chipText, on && pref.chipTextOn]}>{b}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* AREAS */}
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={pref.label}>PREFERRED AREAS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {AREAS.map(a => {
                  const on = areas.includes(a);
                  return (
                    <TouchableOpacity key={a} style={[pref.chip, on && pref.chipOn]} onPress={() => toggleArea(a)} activeOpacity={0.8}>
                      <Text style={[pref.chipText, on && pref.chipTextOn]}>{a}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

          </ScrollView>

          {/* SAVE BUTTON */}
          <View style={pref.saveFooter}>
            <TouchableOpacity style={pref.saveBtn} onPress={handleSave}>
              <Text style={pref.saveBtnText}>Save Preferences</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const pref = StyleSheet.create({
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 40, height: 4, backgroundColor: '#E6E8EE', borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: '#14161B' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: '#9AA0B2', marginBottom: 12 },
  
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 50, borderWidth: 1, borderColor: '#E6E8EE', backgroundColor: '#fff' },
  chipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: '#14161B' },
  chipTextOn: { color: '#fff' },

  saveFooter: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F1F5' },
  saveBtn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#fff' },
});
