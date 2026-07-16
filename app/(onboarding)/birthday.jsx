import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../lib/theme';
import { useOnboarding } from '../../hooks/useOnboarding';
import OnboardingShell from '../../components/OnboardingShell';

export default function BirthdayScreen() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();
  const [loading, setLoading] = useState(false);

  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState('');

  // Pre-fill if we have it
  useState(() => {
    if (data.birthday) {
      const [y, m, d] = data.birthday.split('-');
      if (y) setYear(y);
      if (m) setMonth(m);
      if (d) setDay(d);
    }
  });

  const valid = day.length === 2 && month.length === 2 && year.length === 4;

  const handleContinue = async () => {
    if (!valid) return;
    setError('');
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const date = new Date(y, m - 1, d);
    
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      setError('Invalid date.');
      return;
    }
    
    const age = new Date().getFullYear() - y;
    if (age < 18) {
      setError('You must be 18 or older.');
      return;
    }
    if (age > 100) {
      setError('Please enter a valid year.');
      return;
    }

    setLoading(true);
    const bday = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    updateData({ birthday: bday });
    setLoading(false);
    router.push('/pronouns');
  };

  return (
    <OnboardingShell
      step={3} total={9}
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
      <Text style={styles.title}>When's your birthday?</Text>
      <Text style={styles.subtitle}>We'll only show your age on your profile.</Text>

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>DAY</Text>
          <TextInput style={styles.numInput} placeholder="DD" placeholderTextColor={colors.placeholder} keyboardType="number-pad" maxLength={2} value={day} onChangeText={setDay} autoFocus />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>MONTH</Text>
          <TextInput style={styles.numInput} placeholder="MM" placeholderTextColor={colors.placeholder} keyboardType="number-pad" maxLength={2} value={month} onChangeText={setMonth} />
        </View>
        <View style={[styles.field, { flex: 1.4 }]}>
          <Text style={styles.label}>YEAR</Text>
          <TextInput style={styles.numInput} placeholder="YYYY" placeholderTextColor={colors.placeholder} keyboardType="number-pad" maxLength={4} value={year} onChangeText={setYear} />
        </View>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: colors.ink, letterSpacing: -1, lineHeight: 38, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 40 },
  row: { flexDirection: 'row', gap: 12 },
  field: { flex: 1 },
  label: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: colors.slate, marginBottom: 6 },
  numInput: { backgroundColor: colors.inputBg, borderRadius: 14, padding: 17, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, textAlign: 'center', color: colors.ink, borderWidth: 2, borderColor: 'transparent' },
  error: { fontSize: 12, color: colors.error, marginTop: 8 },
  btn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
