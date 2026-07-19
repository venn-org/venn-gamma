import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../lib/theme';
import { useOnboarding } from '../../hooks/useOnboarding';
import OnboardingShell from '../../components/OnboardingShell';

const OPTIONS = ['Woman', 'Man', 'Non-binary', 'Transgender', 'Other'];

export default function GenderScreen() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState(data.gender || null);

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);
    updateData({ gender: selected });
    setLoading(false);
    router.push('/(onboarding)/lifestyle');
  };

  return (
    <OnboardingShell 
      step={5} total={9}
      footer={
        <View style={styles.footerInner}>
          <Text style={styles.visible}>Visible on profile</Text>
          <TouchableOpacity
            style={[styles.nextBtn, !selected && { opacity: 0.32 }]}
            onPress={handleContinue}
            disabled={!selected || loading}
            activeOpacity={0.8}
          >
            <View style={[styles.nextGrad, { backgroundColor: colors.ink }]}>
              <Text style={styles.nextArrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>
      }
    >
      <Text style={styles.title}>Which gender best describes you?</Text>
      <Text style={styles.subtitle}>Choose what describes you best.</Text>

      {OPTIONS.map(opt => {
        const on = selected === opt;
        return (
          <TouchableOpacity key={opt} style={[styles.row, on && styles.rowOn]} onPress={() => setSelected(opt)} activeOpacity={0.8}>
            <Text style={styles.rowLabel}>{opt}</Text>
            <View style={[styles.radio, on && styles.radioOn]}>
              {on && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 30, color: colors.ink, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 24 },
  row: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 10, borderWidth: 2, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowOn: { borderColor: colors.blue, backgroundColor: '#EEF1FF' },
  rowLabel: { fontSize: 17, color: colors.ink },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#C8CAD2', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.blue },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue },
  footerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  visible: { fontSize: 14, color: colors.ink, fontWeight: '500' },
  nextBtn: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden' },
  nextGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nextArrow: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
