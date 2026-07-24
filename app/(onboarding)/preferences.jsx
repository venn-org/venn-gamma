import { useState } from 'react';
import { Text, View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../lib/theme';
import { useOnboarding, totalSteps } from '../../hooks/useOnboarding';
import { ENUMS } from '../../lib/enums';
import { ZONES_BY_CITY } from '../../lib/locations';
import OnboardingShell from '../../components/OnboardingShell';

const BUDGETS = Object.values(ENUMS.pref_budget.dbToUI);
const FLAT_TYPES = Object.values(ENUMS.flat_type.dbToUI);
const GENDERS = Object.values(ENUMS.pref_gender.dbToUI);

export default function PreferencesScreen() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();
  const [loading, setLoading] = useState(false);

  const [budget, setBudget] = useState(data.prefs?.budget || null);
  const [flatType, setFlatType] = useState(data.prefs?.flatType || null);
  const [prefGender, setPrefGender] = useState(data.prefs?.gender || null);

  const valid = budget && flatType && prefGender;

  const handleContinue = async () => {
    if (!valid) return;
    setLoading(true);
    // An owner's preferred area is wherever their flat is — location.jsx
    // already detected the zone, so seed it rather than asking again.
    const zone = (ZONES_BY_CITY[data.city] || []).find(z => z.id === data.zone);
    updateData({
      prefs: {
        ...data.prefs,
        areas: zone ? [zone.name] : [],
        budget,
        flatType,
        gender: prefGender,
      },
    });
    setLoading(false);
    router.push('/(onboarding)/photos');
  };

  return (
    <OnboardingShell
      step={9} total={totalSteps(data.type)}
      footer={
        <TouchableOpacity
          style={[styles.btn, (!valid || loading) && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!valid || loading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{loading ? 'Saving…' : 'Continue'}</Text>
        </TouchableOpacity>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={styles.title}>Tell us about your flat</Text>
        <Text style={styles.subtitle}>Help people find you in Standouts.</Text>

        <Text style={styles.sectionLabel}>EXPECTED RENT PER PERSON</Text>
            <View style={[styles.chips, { marginBottom: 24 }]}>
              {BUDGETS.map(b => {
                const on = budget === b;
                return (
                  <TouchableOpacity key={b} style={[styles.chip, on && styles.chipOn]} onPress={() => setBudget(b)} activeOpacity={0.8}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{b}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>FLAT TYPE</Text>
            <View style={[styles.chips, { marginBottom: 24 }]}>
              {FLAT_TYPES.map(t => {
                const on = flatType === t;
                return (
                  <TouchableOpacity key={t} style={[styles.chip, on && styles.chipOn]} onPress={() => setFlatType(t)} activeOpacity={0.8}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

        <Text style={styles.sectionLabel}>PREFERRED GENDER IN FLAT</Text>
        <View style={styles.chips}>
          {GENDERS.map(g => {
            const on = prefGender === g;
            return (
              <TouchableOpacity key={g} style={[styles.chip, on && styles.chipOn]} onPress={() => setPrefGender(g)} activeOpacity={0.8}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{g}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 30, color: colors.ink, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 16 },
  sectionLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: colors.slate, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 50, borderWidth: 1.5, borderColor: colors.mist, backgroundColor: '#fff' },
  chipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontSize: 14, fontWeight: '500', color: colors.slate },
  chipTextOn: { color: '#fff' },
  btn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
