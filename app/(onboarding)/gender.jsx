import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import OnboardingShell from '../../components/OnboardingShell';
import { colors } from '../../lib/theme';
import { useOnboarding } from '../../hooks/useOnboarding';

const GENDERS = ['Man', 'Woman', 'Non-binary', 'Prefer not to say'];

export default function GenderScreen() {
  const router = useRouter();
  const { state, updateField } = useOnboarding();
  const [selected, setSelected] = useState(state.gender);

  const handleNext = () => {
    updateField('gender', selected);
    router.push('/lifestyle-prefs');
  };

  return (
    <OnboardingShell
      step={5}
      total={8}
      footer={
        <TouchableOpacity onPress={handleNext} disabled={!selected}>
          <LinearGradient
            colors={['#335CFF', '#8A5BFF']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[s.btn, !selected && { opacity: 0.5 }]}
          >
            <Text style={s.btnText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      }
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>My gender is</Text>
        
        <View style={s.options}>
          {GENDERS.map(g => (
            <TouchableOpacity 
              key={g} 
              style={[s.option, selected === g && s.optionActive]} 
              onPress={() => setSelected(g)}
              activeOpacity={0.7}
            >
              <Text style={[s.optionText, selected === g && s.optionTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </OnboardingShell>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: colors.ink, marginBottom: 32, letterSpacing: -1 },
  
  options: { gap: 12 },
  option: { paddingVertical: 18, paddingHorizontal: 24, borderRadius: 16, borderWidth: 2, borderColor: colors.mist },
  optionActive: { borderColor: colors.blue, backgroundColor: '#EEF1FF' },
  
  optionText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: colors.ink },
  optionTextActive: { color: colors.blue },
  
  btn: { borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#fff' },
});
