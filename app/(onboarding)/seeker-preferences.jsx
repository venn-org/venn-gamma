import { useState } from 'react';
import { Text, View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../lib/theme';
import { useOnboarding, totalSteps } from '../../hooks/useOnboarding';
import { ZONES_BY_CITY } from '../../lib/locations';
import { ENUMS } from '../../lib/enums';
import { BUDGET_DEFAULT_MAX, BUDGET_MAX, BUDGET_MIN, BUDGET_STEP } from '../../lib/prefs';
import RangeSlider from '../../components/RangeSlider';
import OnboardingShell from '../../components/OnboardingShell';

const GENDERS = Object.values(ENUMS.pref_gender.dbToUI);

export default function SeekerPreferencesScreen() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();
  const [loading, setLoading] = useState(false);

  const zones = ZONES_BY_CITY[data.city] || [];

  const [areas, setAreas] = useState(data.prefs?.areas || []);
  const [budgetMin, setBudgetMin] = useState(data.prefs?.budgetMin ?? BUDGET_MIN);
  const [budgetMax, setBudgetMax] = useState(data.prefs?.budgetMax ?? BUDGET_DEFAULT_MAX);
  const [prefGender, setPrefGender] = useState(data.prefs?.gender || null);

  const toggleArea = (a) => {
    setAreas(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  // The slider always holds a value, so budget can't gate Continue anymore.
  const valid = areas.length > 0 && prefGender;

  const handleContinue = async () => {
    if (!valid) return;
    setLoading(true);
    updateData({
      prefs: { ...data.prefs, areas, budgetMin, budgetMax, flatType: null, gender: prefGender },
    });
    setLoading(false);
    router.push('/(onboarding)/photos');
  };

  return (
    <OnboardingShell
      step={8} total={totalSteps(data.type)}
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
        <Text style={styles.title}>What are you looking for?</Text>
        <Text style={styles.subtitle}>Help us match you with the right flats and flatmates.</Text>

        <Text style={styles.sectionLabel}>PREFERRED ZONES (Select all that apply)</Text>
        <View style={[styles.chips, { marginBottom: 24 }]}>
          {zones.map(zone => {
            const on = areas.includes(zone.name);
            return (
              <TouchableOpacity key={zone.id} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleArea(zone.name)} activeOpacity={0.8}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{zone.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>MY BUDGET (₹ / MONTH)</Text>
        <View style={{ marginBottom: 24 }}>
          <RangeSlider
            min={BUDGET_MIN}
            max={BUDGET_MAX}
            step={BUDGET_STEP}
            valueMin={budgetMin}
            valueMax={budgetMax}
            onChange={(lo, hi) => { setBudgetMin(lo); setBudgetMax(hi); }}
          />
        </View>

        <Text style={styles.sectionLabel}>PREFERRED GENDER OF FLATMATE</Text>
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
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 20 },
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
