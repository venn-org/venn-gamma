import { useState } from 'react';
import { Text, View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../lib/theme';
import { useOnboarding } from '../../hooks/useOnboarding';
import OnboardingShell from '../../components/OnboardingShell';

const AREAS = ['South Delhi', 'Gurgaon', 'Noida', 'East Delhi', 'West Delhi', 'North Delhi'];
const BUDGETS = ['Under ₹10k', '₹10k–20k', '₹20k–35k', '₹35k–50k', '₹50k+'];
const FLAT_TYPES = ['1 RK', '1 BHK', '2 BHK', '3 BHK', '4+ BHK'];
const GENDERS = ['Women only', 'Men only', 'Any gender'];

export default function PreferencesScreen() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const isOwner = data.type === 'owner';

  const [areas, setAreas] = useState(data.prefs?.areas || []);
  const [budget, setBudget] = useState(data.prefs?.budget || null);
  const [flatType, setFlatType] = useState(data.prefs?.flatType || null);
  const [prefGender, setPrefGender] = useState(data.prefs?.gender || null);

  const toggleArea = (a) => {
    setAreas(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const validOwner = areas.length > 0 && budget && flatType && prefGender;
  const validSeeking = areas.length > 0 && budget && prefGender;
  const valid = isOwner ? validOwner : validSeeking;

  const handleContinue = async () => {
    if (!valid) return;
    setLoading(true);
    updateData({ 
      prefs: {
        areas,
        budget,
        flatType: isOwner ? flatType : null,
        gender: prefGender
      }
    });
    setLoading(false);
    router.push('/(onboarding)/photos');
  };

  return (
    <OnboardingShell
      step={7} total={9}
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
        {isOwner ? (
          <>
            <Text style={styles.title}>Tell us about your flat</Text>
            <Text style={styles.subtitle}>Help people find you in Standouts.</Text>

            <Text style={styles.sectionLabel}>WHERE IS YOUR FLAT?</Text>
            <View style={[styles.chips, { marginBottom: 24 }]}>
              {AREAS.map(a => {
                const on = areas.includes(a);
                return (
                  <TouchableOpacity key={a} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleArea(a)} activeOpacity={0.8}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{a}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

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
          </>
        ) : (
          <>
            <Text style={styles.title}>What are you looking for?</Text>
            <Text style={styles.subtitle}>Help us match you with the right flats and flatmates.</Text>

            <Text style={styles.sectionLabel}>PREFERRED AREAS (Select all that apply)</Text>
            <View style={[styles.chips, { marginBottom: 24 }]}>
              {AREAS.map(a => {
                const on = areas.includes(a);
                return (
                  <TouchableOpacity key={a} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleArea(a)} activeOpacity={0.8}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{a}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>MY BUDGET</Text>
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
          </>
        )}
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
