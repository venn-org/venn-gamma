import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import OnboardingShell from '../../components/OnboardingShell';
import { colors } from '../../lib/theme';
import { useOnboarding } from '../../hooks/useOnboarding';

const PRONOUNS = ['she/her', 'he/him', 'they/them'];

export default function PronounsScreen() {
  const router = useRouter();
  const { state, updateField } = useOnboarding();
  const [selected, setSelected] = useState(state.pronouns || []);

  const toggle = (p) => {
    if (selected.includes(p)) {
      setSelected(selected.filter(x => x !== p));
    } else {
      setSelected([...selected, p]);
    }
  };

  const handleNext = () => {
    updateField('pronouns', selected);
    router.push('/gender');
  };

  return (
    <OnboardingShell
      step={4}
      total={8}
      footer={
        <TouchableOpacity onPress={handleNext}>
          <LinearGradient
            colors={['#335CFF', '#8A5BFF']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.btn}
          >
            <Text style={s.btnText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      }
    >
      <Text style={s.title}>My pronouns are</Text>
      
      <View style={s.options}>
        {PRONOUNS.map(p => {
          const active = selected.includes(p);
          return (
            <TouchableOpacity 
              key={p} 
              style={[s.option, active && s.optionActive]} 
              onPress={() => toggle(p)}
              activeOpacity={0.7}
            >
              <Text style={[s.optionText, active && s.optionTextActive]}>{p}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      <Text style={s.hint}>We show this on your profile so others know how to refer to you. You can choose more than one.</Text>
    </OnboardingShell>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: colors.ink, marginBottom: 32, letterSpacing: -1 },
  
  options: { gap: 12, flexDirection: 'row', flexWrap: 'wrap' },
  option: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 50, borderWidth: 2, borderColor: colors.mist },
  optionActive: { borderColor: colors.blue, backgroundColor: '#EEF1FF' },
  
  optionText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: colors.slate },
  optionTextActive: { color: colors.blue },
  
  hint: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: colors.slate, marginTop: 24, lineHeight: 20 },
  
  btn: { borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#fff' },
});
