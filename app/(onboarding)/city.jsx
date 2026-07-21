import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import { useOnboarding } from '../../hooks/useOnboarding';
import { CITIES } from '../../lib/locations';
import OnboardingShell from '../../components/OnboardingShell';

export default function CityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, updateData } = useOnboarding();

  const [city, setCity] = useState(data.city || null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!city) return;
    setLoading(true);
    updateData({ city });
    setLoading(false);

    // Branch by type: owners → location, seekers → preferences
    const nextRoute = data.type === 'owner' ? '/(onboarding)/location' : '/(onboarding)/preferences';
    router.push(nextRoute);
  };

  return (
    <OnboardingShell
      step={3} total={9}
      footer={
        <TouchableOpacity
          style={[styles.btn, (!city || loading) && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!city || loading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{loading ? 'Saving…' : 'Continue'}</Text>
        </TouchableOpacity>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={styles.title}>Where are you based?</Text>
        <Text style={styles.subtitle}>You can always change this later.</Text>

        <View style={styles.cards}>
          {CITIES.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.card, city === c.id && styles.cardActive]}
              onPress={() => setCity(c.id)}
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

  btn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
