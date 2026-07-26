import { Fragment, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Pressable, StyleSheet, Dimensions, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../lib/ThemeContext';
import {
  BUDGET_DEFAULT_MAX, BUDGET_MAX, BUDGET_MIN, BUDGET_STEP,
  PREF_SECTIONS, getPrefDisplay, isPrefSet, prefOptions,
} from '../lib/prefs';
import { formatBudgetRange, formatMoveInDate as formatMoveInDisplay, optionDisplay, stripLabelEmoji } from '../lib/enums';
import OptionIcon from './OptionIcon';
import RangeSlider from './RangeSlider';
import Calendar from './Calendar';

const { height: SCREEN_H } = Dimensions.get('window');

const pad2 = (n) => String(n).padStart(2, '0');
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const defaultHousing = () => ({ budgetMin: BUDGET_MIN, budgetMax: BUDGET_DEFAULT_MAX, moveInDate: '' });

export default function PreferencesSheet({ visible, prefs, city, housing, showRole = false, only = null, onClose, onSave }) {
  const insets = useSafeAreaInsets();
  const pref = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  const [draft, setDraft] = useState(prefs || {});
  const [housingDraft, setHousingDraft] = useState(housing || defaultHousing());
  const [openKey, setOpenKey] = useState(only);
  const [pendingRole, setPendingRole] = useState(null);

  // Reset the draft each time the sheet opens so closing without saving discards edits.
  useEffect(() => {
    if (visible) {
      setDraft(prefs || {});
      setHousingDraft(housing || defaultHousing());
      setOpenKey(only);
    }
  }, [visible, prefs, housing, only]);

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

  const setValue = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const toggleMulti = (key, opt) => {
    setDraft((d) => {
      const cur = Array.isArray(d[key]) ? d[key] : [];
      return { ...d, [key]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] };
    });
  };

  const sections = PREF_SECTIONS.map((section) => ({
    ...section,
    rows: section.rows.filter((row) => {
      if (row.roleOnly && !showRole) return false;
      return !only || only === row.key;
    }),
  })).filter((section) => section.rows.length > 0);

  const handleSave = () => {
    onSave(draft, housingDraft);
    onClose();
  };

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
              <Ionicons name="close" size={14} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <Text style={pref.subtitle}>Set what you need — we'll show you the right matches.</Text>

          <ScrollView style={{ maxHeight: SCREEN_H * 0.6 }} showsVerticalScrollIndicator={false}>
            {sections.map((section) => (
              <View key={section.title} style={{ paddingHorizontal: 20 }}>
                <View style={pref.sectionHeader}>
                  <Text style={pref.sectionTitle}>{section.title}</Text>
                  <View style={pref.sectionLine} />
                </View>

                {section.rows.map((row) => {
                  const isOpen = openKey === row.key;
                  const isRange = row.type === 'range';
                  const isDate = row.type === 'date';
                  const options = isRange || isDate ? [] : prefOptions(row, city);
                  const set = isRange
                    ? housingDraft.budgetMin !== BUDGET_MIN || housingDraft.budgetMax !== BUDGET_DEFAULT_MAX
                    : isDate
                      ? !!housingDraft.moveInDate
                      : isPrefSet(draft, row.key, row.multi);
                  const displayText = isRange
                    ? formatBudgetRange(housingDraft.budgetMin, housingDraft.budgetMax) || row.placeholder
                    : isDate
                      ? formatMoveInDisplay(housingDraft.moveInDate) || row.placeholder
                      : getPrefDisplay(draft, row.key, row.placeholder, row.multi);
                  // Icon for the collapsed summary — the first selected value
                  // stands in for a multi row, matching its "A +2" text.
                  const summaryValue = isRange || isDate || !set
                    ? null
                    : row.multi ? draft[row.key]?.[0] : draft[row.key];
                  const summaryIcon = optionDisplay(row.enumKey, summaryValue).icon;
                  const summaryText = summaryIcon ? stripLabelEmoji(displayText) : displayText;
                  return (
                    <View key={row.key}>
                      <TouchableOpacity
                        style={[pref.prefRow, isOpen && pref.prefRowOpen]}
                        onPress={() => setOpenKey(isOpen ? null : row.key)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={pref.prefTitle}>{row.label}</Text>
                          <View style={pref.prefValRow}>
                            <OptionIcon name={summaryIcon} size={13} color={set ? colors.blue : colors.placeholder} />
                            <Text style={[pref.prefVal, set && pref.prefValSet]}>
                              {summaryText}
                            </Text>
                          </View>
                        </View>
                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.placeholder} />
                      </TouchableOpacity>

                      {isOpen && isRange && (
                        <View style={[pref.optsWrap, pref.optsWrapStacked]}>
                          <RangeSlider
                            min={BUDGET_MIN}
                            max={BUDGET_MAX}
                            step={BUDGET_STEP}
                            valueMin={housingDraft.budgetMin}
                            valueMax={housingDraft.budgetMax}
                            onChange={(lo, hi) => setHousingDraft((h) => ({ ...h, budgetMin: lo, budgetMax: hi }))}
                          />
                        </View>
                      )}

                      {isOpen && isDate && (
                        <View style={[pref.optsWrap, pref.optsWrapStacked]}>
                          <Calendar
                            value={housingDraft.moveInDate}
                            onChange={(d) => setHousingDraft((h) => ({ ...h, moveInDate: d }))}
                            minDate={todayStr()}
                            placeholder="Select a move-in date"
                          />
                        </View>
                      )}

                      {isOpen && !isRange && !isDate && (
                        <View style={pref.optsWrap}>
                          {options.length === 0 ? (
                            <Text style={pref.emptyZones}>No zones available for your city yet.</Text>
                          ) : options.map((opt) => {
                            const on = row.multi
                              ? (draft[row.key] || []).includes(opt)
                              : draft[row.key] === opt;
                            const onPress = row.multi
                              ? () => toggleMulti(row.key, opt)
                              : row.key === 'role'
                                ? () => opt !== draft.role && setPendingRole(opt)
                                : () => setValue(row.key, on ? null : opt);
                            const { icon, text } = optionDisplay(row.enumKey, opt);
                            return (
                              <TouchableOpacity key={opt} style={[pref.chip, on && pref.chipOn]} onPress={onPress} activeOpacity={0.8}>
                                <OptionIcon name={icon} size={15} color={on ? '#fff' : colors.slate} />
                                <Text style={[pref.chipText, on && pref.chipTextOn]}>{text}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>

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
          <Text style={pref.confirmTitle}>Switch to "{stripLabelEmoji(pendingRole)}"?</Text>
          <Text style={pref.confirmSub}>This changes who you'll see and be shown to. You can switch back anytime.</Text>
          <View style={pref.confirmActions}>
            <TouchableOpacity style={[pref.confirmBtn, pref.confirmCancel]} onPress={() => setPendingRole(null)}>
              <Text style={pref.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[pref.confirmBtn, pref.confirmOk]}
              onPress={() => { setValue('role', pendingRole); setPendingRole(null); }}
            >
              <Text style={pref.confirmOkText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
    </Fragment>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.ink },
  subtitle: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: colors.placeholder, paddingHorizontal: 20, marginTop: 4, marginBottom: 8 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 4 },
  sectionTitle: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: colors.placeholder, textTransform: 'uppercase' },
  sectionLine: { flex: 1, height: 1, backgroundColor: colors.border },

  prefRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14,
    marginTop: 10, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.canvas,
  },
  prefRowOpen: { borderColor: colors.blue },
  prefTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: colors.ink },
  prefValRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  prefVal: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: colors.placeholder },
  prefValSet: { color: colors.blue },

  optsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 10, paddingBottom: 16 },
  // Full-width single-column layout for the slider/calendar rows. flexWrap
  // has to go back to 'nowrap' — wrapping in a column axis stops children
  // from stretching, which left the slider shrunk and off-centre.
  optsWrapStacked: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 50, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink },
  chipTextOn: { color: '#fff' },
  emptyZones: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: colors.placeholder, paddingBottom: 16 },

  confirmBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 30 },
  confirmBox: { width: '100%', maxWidth: 340, backgroundColor: colors.card, borderRadius: 20, padding: 20 },
  confirmTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.ink, marginBottom: 4 },
  confirmSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: colors.placeholder, marginBottom: 18 },
  confirmActions: { flexDirection: 'row', gap: 10 },
  confirmBtn: { flex: 1, borderRadius: 50, paddingVertical: 12, alignItems: 'center' },
  confirmCancel: { backgroundColor: colors.canvas },
  confirmCancelText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink },
  confirmOk: { backgroundColor: colors.blue },
  confirmOkText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: '#fff' },

  saveFooter: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  saveBtn: { backgroundColor: colors.blue, borderRadius: 50, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#fff' },
});
