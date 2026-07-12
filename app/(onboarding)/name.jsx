import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import OnboardingShell from '../../components/OnboardingShell';
import { colors } from '../../lib/theme';
import { useOnboarding } from '../../hooks/useOnboarding';

export default function NameScreen() {
  const router = useRouter();
  const { state, updateField } = useOnboarding();
  const [firstName, setFirstName] = useState(state.name.split(' ')[0] || '');
  const [lastName, setLastName] = useState(state.name.split(' ').slice(1).join(' ') || '');

  // Need to import useState locally
  const React = require('react');
  const [localFirst, setLocalFirst] = React.useState(firstName);
  const [localLast, setLocalLast] = React.useState(lastName);

  const handleNext = () => {
    const fullName = [localFirst.trim(), localLast.trim()].filter(Boolean).join(' ');
    updateField('name', fullName);
    router.push('/account-type');
  };

  return (
    <OnboardingShell
      step={1}
      total={8}
      footer={
        <TouchableOpacity onPress={handleNext} disabled={localFirst.trim().length === 0}>
          <LinearGradient
            colors={['#335CFF', '#8A5BFF']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[s.btn, localFirst.trim().length === 0 && { opacity: 0.5 }]}
          >
            <Text style={s.btnText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      }
    >
      <Text style={s.title}>My name is</Text>
      
      <TextInput
        style={s.input}
        placeholder="First name"
        placeholderTextColor={colors.placeholder}
        value={localFirst}
        onChangeText={setLocalFirst}
        autoFocus
      />
      <Text style={s.hint}>This is how it will appear on your profile.</Text>

      <TextInput
        style={[s.input, { marginTop: 24 }]}
        placeholder="Last name"
        placeholderTextColor={colors.placeholder}
        value={localLast}
        onChangeText={setLocalLast}
      />
      <Text style={s.hint}>Only your first initial is shown publicly.</Text>
    </OnboardingShell>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: colors.ink, marginBottom: 32, letterSpacing: -1 },
  input: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: colors.ink, borderBottomWidth: 2, borderBottomColor: colors.ink, paddingVertical: 8 },
  hint: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: colors.slate, marginTop: 8 },
  btn: { borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#fff' },
});
