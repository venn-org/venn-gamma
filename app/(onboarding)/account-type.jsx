import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import OnboardingShell from '../../components/OnboardingShell';
import { colors } from '../../lib/theme';
import { useOnboarding } from '../../hooks/useOnboarding';
import React from 'react';

export default function AccountTypeScreen() {
  const router = useRouter();
  const { state, updateField } = useOnboarding();
  const [role, setRole] = React.useState(state.role);

  const handleNext = () => {
    updateField('role', role);
    router.push('/birthday');
  };

  return (
    <OnboardingShell
      step={2}
      total={8}
      footer={
        <TouchableOpacity onPress={handleNext} disabled={!role}>
          <LinearGradient
            colors={['#335CFF', '#8A5BFF']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[s.btn, !role && { opacity: 0.5 }]}
          >
            <Text style={s.btnText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      }
    >
      <Text style={s.title}>I am...</Text>

      <View style={s.cards}>
        <TouchableOpacity
          style={[s.card, role === 'seeking' && s.cardActive]}
          onPress={() => setRole('seeking')}
          activeOpacity={0.8}
        >
          <View style={s.cardTop}>
            <View style={[s.iconBox, role === 'seeking' && s.iconBoxActive]}>
              <Ionicons name="search" size={24} color={role === 'seeking' ? '#fff' : colors.slate} />
            </View>
            <View style={[s.radio, role === 'seeking' && s.radioActive]}>
              {role === 'seeking' && <View style={s.radioDot} />}
            </View>
          </View>
          <Text style={[s.cardTitle, role === 'seeking' && s.cardTitleActive]}>Looking for a flat</Text>
          <Text style={[s.cardSub, role === 'seeking' && s.cardSubActive]}>I need a room or flatmates to team up with.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.card, role === 'owner' && s.cardActive]}
          onPress={() => setRole('owner')}
          activeOpacity={0.8}
        >
          <View style={s.cardTop}>
            <View style={[s.iconBox, role === 'owner' && s.iconBoxActive]}>
              <Ionicons name="home" size={24} color={role === 'owner' ? '#fff' : colors.slate} />
            </View>
            <View style={[s.radio, role === 'owner' && s.radioActive]}>
              {role === 'owner' && <View style={s.radioDot} />}
            </View>
          </View>
          <Text style={[s.cardTitle, role === 'owner' && s.cardTitleActive]}>I have a flat / room</Text>
          <Text style={[s.cardSub, role === 'owner' && s.cardSubActive]}>I have an empty room and need someone to fill it.</Text>
        </TouchableOpacity>
      </View>
    </OnboardingShell>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: colors.ink, marginBottom: 32, letterSpacing: -1 },
  
  cards: { gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardActive: { borderColor: colors.blue, backgroundColor: '#F8F9FF' },
  
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  iconBoxActive: { backgroundColor: colors.blue },
  
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D0D3DE', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.blue },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.blue },
  
  cardTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: colors.ink, marginBottom: 6 },
  cardTitleActive: { color: colors.blue },
  cardSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.slate, lineHeight: 20 },
  cardSubActive: { color: colors.ink },
  
  btn: { borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#fff' },
});
