import { useState, useEffect, useRef, Fragment } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Pressable, StyleSheet, Dimensions, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';
import { ENUMS } from '../lib/enums';
import { ZONES_BY_CITY } from '../lib/locations';

const { height: SCREEN_H } = Dimensions.get('window');

export default function PreferencesSheet({ visible, prefs, city, showRole = false, only = null, onClose, onSave }) {
  const insets = useSafeAreaInsets();

  const zones = ZONES_BY_CITY[city] || [];

  // Local state for editing before saving
  const [budget, setBudget] = useState(prefs?.budget || null);
  const [areas, setAreas] = useState(prefs?.areas || []);
  const [role, setRole] = useState(prefs?.role || null);
  const [pendingRole, setPendingRole] = useState(null);

  // Sync when visible changes (resetting state if they close without saving)
  useEffect(() => {
    if (visible && prefs) {
      setBudget(prefs.budget);
      setAreas(prefs.areas || []);
      setRole(prefs.role);
    }
  }, [visible, prefs]);

  // Manual backdrop-fade + sheet-slide (decoupled) so the backdrop doesn't
  // ride along with the sheet's slide transform, which reads as a solid
  // black panel growing up the screen instead of an instant dim.
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

  const toggleArea = (a) => {
    if (areas.includes(a)) {
      setAreas(areas.filter(x => x !== a));
    } else {
      setAreas([...areas, a]);
    }
  };

  const requestRoleChange = (r) => {
    if (r === role) return;
    setPendingRole(r);
  };

  const confirmRoleChange = () => {
    setRole(pendingRole);
    setPendingRole(null);
  };

  const handleSave = () => {
    onSave({ budget, areas, role });
    onClose();
  };

  const budgets = Object.values(ENUMS.pref_budget.dbToUI);
  const roles = Object.values(ENUMS.pref_role.dbToUI);

  return (
    <Fragment>
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View style={[pref.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetY }] }]}>
          <View style={pref.handle} />
          
          <View style={pref.header}>
            <Text style={pref.title}>Preferences</Text>
            <TouchableOpacity onPress={onClose} style={pref.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={14} color="#14161B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: SCREEN_H * 0.7 }} showsVerticalScrollIndicator={false}>
            
            {/* ROLE */}
            {showRole && (!only || only === 'role') && (
              <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
                <Text style={pref.label}>I AM...</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                  {roles.map(r => {
                    const on = role === r;
                    return (
                      <TouchableOpacity key={r} style={[pref.chip, on && pref.chipOn]} onPress={() => requestRoleChange(r)} activeOpacity={0.8}>
                        <Text style={[pref.chipText, on && pref.chipTextOn]}>{r}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* BUDGET */}
            {(!only || only === 'budget') && (
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
            )}

            {/* AREAS */}
            {(!only || only === 'areas') && (
              <View style={{ paddingHorizontal: 20 }}>
                <Text style={pref.label}>PREFERRED AREAS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {zones.length === 0 ? (
                    <Text style={pref.emptyZones}>No zones available for your city yet.</Text>
                  ) : zones.map(zone => {
                    const on = areas.includes(zone.name);
                    return (
                      <TouchableOpacity key={zone.id} style={[pref.chip, on && pref.chipOn]} onPress={() => toggleArea(zone.name)} activeOpacity={0.8}>
                        <Text style={[pref.chipText, on && pref.chipTextOn]}>{zone.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

          </ScrollView>

          {/* SAVE BUTTON */}
          <View style={pref.saveFooter}>
            <TouchableOpacity style={pref.saveBtn} onPress={handleSave}>
              <Text style={pref.saveBtnText}>Save Preferences</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>

    {/* Confirm before switching role — affects who shows up in your feed */}
    <Modal visible={!!pendingRole} transparent animationType="fade" onRequestClose={() => setPendingRole(null)}>
      <Pressable style={pref.confirmBackdrop} onPress={() => setPendingRole(null)}>
        <Pressable style={pref.confirmBox} onPress={() => {}}>
          <Text style={pref.confirmTitle}>Switch to "{pendingRole}"?</Text>
          <Text style={pref.confirmSub}>This changes who you'll see and be shown to. You can switch back anytime.</Text>
          <View style={pref.confirmActions}>
            <TouchableOpacity style={[pref.confirmBtn, pref.confirmCancel]} onPress={() => setPendingRole(null)}>
              <Text style={pref.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[pref.confirmBtn, pref.confirmOk]} onPress={confirmRoleChange}>
              <Text style={pref.confirmOkText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
    </Fragment>
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
  emptyZones: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2' },

  confirmBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 30 },
  confirmBox: { width: '100%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  confirmTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: '#14161B', marginBottom: 4 },
  confirmSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2', marginBottom: 18 },
  confirmActions: { flexDirection: 'row', gap: 10 },
  confirmBtn: { flex: 1, borderRadius: 50, paddingVertical: 12, alignItems: 'center' },
  confirmCancel: { backgroundColor: '#F2F3F7' },
  confirmCancelText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: '#14161B' },
  confirmOk: { backgroundColor: colors.blue },
  confirmOkText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: '#fff' },

  saveFooter: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F1F5' },
  saveBtn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#fff' },
});
