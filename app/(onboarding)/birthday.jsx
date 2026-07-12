import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import OnboardingShell from '../../components/OnboardingShell';
import { colors } from '../../lib/theme';
import { useOnboarding } from '../../hooks/useOnboarding';

export default function BirthdayScreen() {
  const router = useRouter();
  const { state, updateField } = useOnboarding();
  
  // Format: DD/MM/YYYY
  const init = state.birthday ? new Date(state.birthday) : null;
  const [day, setDay] = useState(init ? String(init.getDate()).padStart(2, '0') : '');
  const [month, setMonth] = useState(init ? String(init.getMonth() + 1).padStart(2, '0') : '');
  const [year, setYear] = useState(init ? String(init.getFullYear()) : '');

  const isValid = day.length === 2 && month.length === 2 && year.length === 4;

  const handleNext = () => {
    if (!isValid) return;
    const date = new Date(`${year}-${month}-${day}`);
    updateField('birthday', date.toISOString());
    router.push('/pronouns');
  };

  return (
    <OnboardingShell
      step={3}
      total={8}
      footer={
        <TouchableOpacity onPress={handleNext} disabled={!isValid}>
          <LinearGradient
            colors={['#335CFF', '#8A5BFF']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[s.btn, !isValid && { opacity: 0.5 }]}
          >
            <Text style={s.btnText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      }
    >
      <Text style={s.title}>My birthday is</Text>
      
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="DD"
          placeholderTextColor={colors.placeholder}
          keyboardType="number-pad"
          maxLength={2}
          value={day}
          onChangeText={setDay}
          autoFocus
          textAlign="center"
        />
        <Text style={s.slash}>/</Text>
        <TextInput
          style={s.input}
          placeholder="MM"
          placeholderTextColor={colors.placeholder}
          keyboardType="number-pad"
          maxLength={2}
          value={month}
          onChangeText={setMonth}
          textAlign="center"
        />
        <Text style={s.slash}>/</Text>
        <TextInput
          style={[s.input, { width: 100 }]}
          placeholder="YYYY"
          placeholderTextColor={colors.placeholder}
          keyboardType="number-pad"
          maxLength={4}
          value={year}
          onChangeText={setYear}
          textAlign="center"
        />
      </View>
      
      <Text style={s.hint}>Your age will be public.</Text>
    </OnboardingShell>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: colors.ink, marginBottom: 32, letterSpacing: -1 },
  
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: { width: 70, borderBottomWidth: 2, borderBottomColor: colors.ink, fontFamily: 'SpaceMono_400Regular', fontSize: 28, color: colors.ink, paddingVertical: 8 },
  slash: { fontFamily: 'SpaceMono_400Regular', fontSize: 28, color: colors.slate },
  
  hint: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: colors.slate, marginTop: 24 },
  
  btn: { borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#fff' },
});
