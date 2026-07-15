import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../lib/theme';
import { useOnboarding } from '../../lib/auth';
import OnboardingShell from '../../components/OnboardingShell';

const OPTIONS = ['She/her', 'He/him', 'They/them', 'Ze/zir', 'Ze/zan', 'Other'];

export default function PronounsScreen() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState(data.pronouns || []);

  const toggle = (opt) => {
    setSelected(prev => {
      if (prev.includes(opt)) return prev.filter(x => x !== opt);
      if (prev.length >= 4) return prev;
      return [...prev, opt];
    });
  };

  const handleContinue = async () => {
    setLoading(true);
    updateData({ pronouns: selected });
    setLoading(false);
    router.push('/gender');
  };

  return (
    <OnboardingShell
      step={4} total={9}
      footer={
        <View style={styles.footerInner}>
          <Text style={styles.visible}>Visible on profile</Text>
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.8}
          >
            <View style={[styles.nextGrad, { backgroundColor: colors.ink }]}>
              <Text style={styles.nextArrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>
      }
    >
      <Text style={styles.title}>What are your pronouns?</Text>
      <Text style={styles.subtitle}>Optional. Pick up to four that feel right.</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {OPTIONS.map(opt => {
          const on = selected.includes(opt);
          return (
            <TouchableOpacity key={opt} style={[styles.row, on && styles.rowOn]} onPress={() => toggle(opt)} activeOpacity={0.8}>
              <Text style={styles.rowLabel}>{opt}</Text>
              <View style={[styles.check, on && styles.checkOn]}>
                {on && <Text style={styles.checkMark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 30, color: colors.ink, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 24 },
  row: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 10, borderWidth: 2, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowOn: { borderColor: colors.blue, backgroundColor: '#EEF1FF' },
  rowLabel: { fontSize: 17, color: colors.ink },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#C8CAD2', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  footerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  visible: { fontSize: 14, color: colors.ink, fontWeight: '500' },
  nextBtn: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden' },
  nextGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nextArrow: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
