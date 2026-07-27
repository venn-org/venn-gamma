import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../lib/theme';
import { useOnboarding, totalSteps } from '../../hooks/useOnboarding';
import OnboardingShell from '../../components/OnboardingShell';
import OptionIcon from '../../components/OptionIcon';
import VisibleOnProfileBadge from '../../components/VisibleOnProfileBadge';
import { optionIcon } from '../../lib/enums';

const QUESTIONS = [
  { key: 'drink', label: 'Do you drink?' },
  { key: 'tobacco', label: 'Do you smoke tobacco?' },
  { key: 'weed', label: 'Do you smoke weed?' },
];
const OPTIONS = ['Yes', 'Sometimes', 'No', 'Prefer not to say'];

export default function LifestyleScreen() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();
  const [loading, setLoading] = useState(false);

  const [answers, setAnswers] = useState(data.lifestyle || {});

  const setAnswer = (key, val) => {
    setAnswers(prev => ({ ...prev, [key]: val }));
  };

  const valid = QUESTIONS.every(q => !!answers[q.key]);

  const handleContinue = async () => {
    if (!valid) return;
    setLoading(true);
    updateData({ lifestyle: answers });
    setLoading(false);
    // Owners describe their flat (location + flat details); seekers set
    // what they're looking for (areas, budget, flatmate gender).
    router.push('/(onboarding)/city');
  };

  return (
    <OnboardingShell
      step={6} total={totalSteps(data.type)}
      footer={
        <View style={styles.footerInner}>
          <VisibleOnProfileBadge />
          <TouchableOpacity
            style={[styles.nextBtn, !valid && { opacity: 0.32 }]}
            onPress={handleContinue}
            disabled={!valid || loading}
            activeOpacity={0.8}
          >
            <View style={[styles.nextGrad, { backgroundColor: colors.ink }]}>
              <Text style={styles.nextArrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>A bit about your lifestyle</Text>
        <Text style={styles.subtitle}>Helps you find flatmates who match your vibe.</Text>

        {QUESTIONS.map(q => (
          <View key={q.key} style={styles.question}>
            <Text style={styles.qLabel}>{q.label}</Text>
            <View style={styles.chips}>
              {OPTIONS.map(opt => {
                const on = answers[q.key] === opt;
                return (
                  <TouchableOpacity key={opt} style={[styles.chip, on && styles.chipOn]} onPress={() => setAnswer(q.key, opt)} activeOpacity={0.8}>
                    <OptionIcon name={optionIcon('lifestyle', opt)} size={14} color={on ? '#fff' : colors.slate} />
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 30, color: colors.ink, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 28 },
  question: { marginBottom: 24, borderBottomWidth: 1, borderColor: colors.mist, paddingBottom: 20 },
  qLabel: { fontSize: 15, fontWeight: '600', color: colors.ink, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 50, borderWidth: 1.5, borderColor: colors.mist, backgroundColor: '#fff' },
  chipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontSize: 14, fontWeight: '500', color: colors.slate },
  chipTextOn: { color: '#fff' },
  footerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextBtn: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden' },
  nextGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nextArrow: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
