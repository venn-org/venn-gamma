import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import { useOnboarding, totalSteps } from '../../hooks/useOnboarding';
import { CITIES, ZONES_BY_CITY } from '../../lib/locations';
import OnboardingShell from '../../components/OnboardingShell';

export default function CityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, updateData } = useOnboarding();

  const [city, setCity] = useState(data.city || null);
  const [areas, setAreas] = useState(data.prefs?.areas || []);
  const [loading, setLoading] = useState(false);

  const zones = ZONES_BY_CITY[city] || [];

  const selectCity = (id) => {
    if (id === city) return;
    setCity(id);
    setAreas([]); // zones are city-scoped, so the old picks no longer apply
  };

  const toggleArea = (name) =>
    setAreas((prev) => (prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]));

  const valid = !!city && areas.length > 0;

  const handleContinue = async () => {
    if (!valid) return;
    setLoading(true);
    // Budget / flat type / preferred gender aren't asked during onboarding
    // anymore — they're set later from the Preferences sheet, which has the
    // full slider + calendar controls.
    updateData({ city, prefs: { ...data.prefs, areas } });
    setLoading(false);
    router.push('/(onboarding)/photos');
  };

  return (
    <OnboardingShell
      step={7} total={totalSteps(data.type)}
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
        <Text style={styles.title}>Where are you looking?</Text>
        <Text style={styles.subtitle}>
          {data.type === 'owner'
            ? 'Pick your city, then the areas your flat is in.'
            : 'Pick your city, then the areas you want to live in.'}
        </Text>

        <View style={styles.cards}>
          {CITIES.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.card, city === c.id && styles.cardActive]}
              onPress={() => selectCity(c.id)}
              activeOpacity={0.8}
            >
              <View style={styles.cardContent}>
                <Text style={[styles.cardName, city === c.id && styles.cardNameActive]}>{c.name}</Text>
                <Text style={[styles.cardCountry, city === c.id && styles.cardCountryActive]}>{c.country}</Text>
              </View>
              {city === c.id && (
                <Ionicons name="checkmark-circle-sharp" size={24} color={colors.blue} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {!!city && (
          <>
            <Text style={styles.sectionLabel}>AREAS (SELECT ALL THAT APPLY)</Text>
            {zones.length === 0 ? (
              <Text style={styles.emptyZones}>No areas listed for this city yet.</Text>
            ) : (
              <View style={styles.chips}>
                {zones.map((z) => {
                  const on = areas.includes(z.name);
                  return (
                    <TouchableOpacity
                      key={z.id}
                      style={[styles.chip, on && styles.chipOn]}
                      onPress={() => toggleArea(z.name)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{z.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 30, color: colors.ink, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 28 },

  cards: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#F0F1F5',
  },
  cardActive: { borderColor: colors.blue, backgroundColor: '#EEF1FF' },
  cardContent: { flex: 1 },
  cardName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: colors.ink, marginBottom: 3 },
  cardNameActive: { color: colors.blue },
  cardCountry: { fontSize: 12, color: colors.slate },
  cardCountryActive: { color: colors.ink },

  sectionLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: colors.slate, marginTop: 28, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 50, borderWidth: 1.5, borderColor: colors.mist, backgroundColor: '#fff' },
  chipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontSize: 14, fontWeight: '500', color: colors.slate },
  chipTextOn: { color: '#fff' },
  emptyZones: { fontSize: 13, color: colors.placeholder },

  btn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
