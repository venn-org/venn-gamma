import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import { useOnboarding } from '../../hooks/useOnboarding';

export default function AccountTypeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, updateData, submitData } = useOnboarding();
  const [loading, setLoading] = useState(false);

  const [type, setType] = useState(data.type || null);

  const handleContinue = async () => {
    if (!type) return;
    setLoading(true);
    updateData({ type });
    setLoading(false);
    router.push('/birthday');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={[colors.blue, colors.violet]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: '22%' }]}
          />
        </View>
        <Text style={styles.stepLabel}>STEP 2 OF 9</Text>
      </View>

      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backArrow}>‹</Text>
      </TouchableOpacity>

      <View style={styles.body}>
        <Text style={styles.title}>What brings you to Venn?</Text>
        <Text style={styles.subtitle}>This shapes how your profile appears to others.</Text>

        <TouchableOpacity
          style={[styles.card, type === 'seeking' && styles.cardActive]}
          onPress={() => setType('seeking')}
          activeOpacity={0.8}
        >
          <View style={[styles.cardIcon, type === 'seeking' && styles.cardIconActive]}>
            <Text style={{ fontSize: 30 }}>🔍</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, type === 'seeking' && styles.cardTitleActive]}>
              I'm looking for a flat
            </Text>
            <Text style={[styles.cardSub, type === 'seeking' && styles.cardSubActive]}>
              Your profile appears in others' feeds as a potential flatmate
            </Text>
          </View>
          {type === 'seeking' && (
            <Ionicons name="checkmark-circle" size={22} color={colors.blue} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, type === 'owner' && styles.cardActive]}
          onPress={() => setType('owner')}
          activeOpacity={0.8}
        >
          <View style={[styles.cardIcon, type === 'owner' && styles.cardIconActive]}>
            <Text style={{ fontSize: 30 }}>🏠</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, type === 'owner' && styles.cardTitleActive]}>
              I have a flat
            </Text>
            <Text style={[styles.cardSub, type === 'owner' && styles.cardSubActive]}>
              Your listing appears in Standouts — people send you a Key 🔑 to connect
            </Text>
          </View>
          {type === 'owner' && (
            <Ionicons name="checkmark-circle" size={22} color={colors.blue} />
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[styles.btn, (!type || loading) && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!type || loading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{loading ? 'Saving…' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, ...Platform.select({ web: { height: '100dvh', overflow: 'hidden' } }) },
  topBar: { paddingHorizontal: 28, paddingTop: 14, gap: 8 },
  progressTrack: { height: 3, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  stepLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: colors.placeholder, letterSpacing: 1.2, textAlign: 'right' },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 16, marginTop: 4 },
  backArrow: { fontSize: 28, color: colors.ink, lineHeight: 32 },
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 28 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, color: colors.ink, letterSpacing: -1, lineHeight: 38, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate, lineHeight: 22, marginBottom: 32 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    marginBottom: 14, borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardActive: { borderColor: colors.blue, backgroundColor: '#EEF1FF' },
  cardIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center',
  },
  cardIconActive: { backgroundColor: '#fff' },
  cardTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: colors.ink, marginBottom: 4 },
  cardTitleActive: { color: colors.blue },
  cardSub: { fontSize: 13, color: colors.slate, lineHeight: 18 },
  cardSubActive: { color: colors.ink },

  footer: { paddingHorizontal: 28, paddingTop: 12 },
  btn: { backgroundColor: colors.ink, borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
