import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import OnboardingShell from '../../components/OnboardingShell';
import { colors } from '../../lib/theme';
import { useOnboarding } from '../../hooks/useOnboarding';

const LIFESTYLE_OPTS = ['Yes', 'Sometimes', 'No', 'Prefer not to say'];
const PREF_GENDER = ['👩 Women only', '👨 Men only', '🌈 Any gender'];
const PREF_BUDGET = ['Under ₹10k', '₹10k–20k', '₹20k–35k', '₹35k–50k', '₹50k+'];

export default function LifestylePrefsScreen() {
  const router = useRouter();
  const { state, updateField, updateNestedField } = useOnboarding();
  const isSeeking = state.role === 'seeking';

  const [slide, setSlide] = useState(0); // 0 = lifestyle, 1 = prefs
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Local state for lifestyle
  const [drink, setDrink] = useState(state.lifestyle.drink);
  const [tobacco, setTobacco] = useState(state.lifestyle.tobacco);
  const [weed, setWeed] = useState(state.lifestyle.weed);

  // Local state for prefs
  const [prefGender, setPrefGender] = useState(state.prefs.gender);
  const [prefBudget, setPrefBudget] = useState(state.prefs.budget);

  const isLifestyleValid = drink && tobacco && weed;
  const isPrefsValid = prefGender && prefBudget;

  const handleNext = () => {
    if (slide === 0) {
      updateNestedField('lifestyle', 'drink', drink);
      updateNestedField('lifestyle', 'tobacco', tobacco);
      updateNestedField('lifestyle', 'weed', weed);
      
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -50, duration: 200, useNativeDriver: true })
      ]).start(() => {
        setSlide(1);
        slideAnim.setValue(50);
        Animated.parallel([
          Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true })
        ]).start();
      });
    } else {
      updateNestedField('prefs', 'gender', prefGender);
      updateNestedField('prefs', 'budget', prefBudget);
      // In a real app, you'd add areas, move-in date, flat types here.
      // We kept this abbreviated for the rebuild demo.
      router.push('/photos');
    }
  };

  const OptionGroup = ({ label, value, setter, options }) => (
    <View style={s.group}>
      <Text style={s.groupLabel}>{label}</Text>
      <View style={s.chips}>
        {options.map(opt => (
          <TouchableOpacity 
            key={opt} 
            style={[s.chip, value === opt && s.chipActive]} 
            onPress={() => setter(opt)}
          >
            <Text style={[s.chipText, value === opt && s.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <OnboardingShell
      step={6}
      total={8}
      footer={
        <TouchableOpacity onPress={handleNext} disabled={slide === 0 ? !isLifestyleValid : !isPrefsValid}>
          <LinearGradient
            colors={['#335CFF', '#8A5BFF']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[s.btn, (slide === 0 ? !isLifestyleValid : !isPrefsValid) && { opacity: 0.5 }]}
          >
            <Text style={s.btnText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      }
    >
      <Animated.ScrollView 
        contentContainerStyle={{ paddingBottom: 40 }} 
        showsVerticalScrollIndicator={false}
        style={{ opacity: opacityAnim, transform: [{ translateX: slideAnim }] }}
      >
        {slide === 0 ? (
          <>
            <Text style={s.title}>My lifestyle</Text>
            <Text style={s.sub}>This helps us find compatible matches.</Text>
            
            <OptionGroup label="Do you drink?" value={drink} setter={setDrink} options={LIFESTYLE_OPTS} />
            <OptionGroup label="Do you smoke tobacco?" value={tobacco} setter={setTobacco} options={LIFESTYLE_OPTS} />
            <OptionGroup label="Do you smoke weed?" value={weed} setter={setWeed} options={LIFESTYLE_OPTS} />
          </>
        ) : (
          <>
            <Text style={s.title}>My preferences</Text>
            <Text style={s.sub}>What are you looking for in a flatmate?</Text>
            
            <OptionGroup label="Preferred gender" value={prefGender} setter={setPrefGender} options={PREF_GENDER} />
            <OptionGroup label={isSeeking ? "My budget" : "Expected rent"} value={prefBudget} setter={setPrefBudget} options={PREF_BUDGET} />
          </>
        )}
      </Animated.ScrollView>
    </OnboardingShell>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: colors.ink, marginBottom: 8, letterSpacing: -1 },
  sub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 16, color: colors.slate, marginBottom: 32 },
  
  group: { marginBottom: 32 },
  groupLabel: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: colors.ink, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.mist, backgroundColor: '#fff' },
  chipActive: { borderColor: colors.blue, backgroundColor: '#EEF1FF' },
  chipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.slate },
  chipTextActive: { color: colors.blue },
  
  btn: { borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#fff' },
});
