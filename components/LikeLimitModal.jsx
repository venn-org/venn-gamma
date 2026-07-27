import { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/ThemeContext';

// Two steps in one sheet: the limit notice, then a confirm before the likes are
// topped up. TEMP: "get more likes" grants them outright — it's the seam the
// premium purchase will slot into.
export default function LikeLimitModal({ visible, onClose, onConfirm }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [step, setStep] = useState('limit');
  const [busy, setBusy] = useState(false);

  const sheetY = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setStep('limit');
    setBusy(false);
    sheetY.setValue(40);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(sheetY, { toValue: 0, friction: 9, tension: 70, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    await onConfirm();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Animated.View style={{ opacity, transform: [{ translateY: sheetY }], width: '100%' }}>
          <Pressable style={s.card} onPress={() => {}}>
            <View style={s.iconCircle}>
              <Ionicons
                name={step === 'limit' ? 'heart-dislike' : 'sparkles'}
                size={24}
                color="#fff"
              />
            </View>

            {step === 'limit' ? (
              <>
                <Text style={s.title}>You have exhausted your likes for today</Text>
                <Text style={s.sub}>Your likes reset at midnight — or top up now to keep going.</Text>

                <TouchableOpacity activeOpacity={0.85} style={s.primaryWrap} onPress={() => setStep('confirm')}>
                  <LinearGradient
                    colors={[colors.blue, colors.violet]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={s.primary}
                  >
                    <Text style={s.primaryText}>Click here to get more likes</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={s.secondary} onPress={onClose} activeOpacity={0.7}>
                  <Text style={s.secondaryText}>Maybe later</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={s.title}>Are you sure?</Text>
                <Text style={s.sub}>This will reset your daily like limit so you can carry on browsing.</Text>

                <TouchableOpacity activeOpacity={0.85} style={s.primaryWrap} onPress={handleConfirm} disabled={busy}>
                  <LinearGradient
                    colors={[colors.blue, colors.violet]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[s.primary, busy && { opacity: 0.6 }]}
                  >
                    <Text style={s.primaryText}>{busy ? 'Resetting…' : 'Yes, reset my limit'}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={s.secondary} onPress={() => setStep('limit')} activeOpacity={0.7}>
                  <Text style={s.secondaryText}>Go back</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,20,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 18,
    alignItems: 'center',
  },
  iconCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#FF4D6A',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: 26,
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: colors.slate,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryWrap: { width: '100%', borderRadius: 50, overflow: 'hidden' },
  primary: { paddingVertical: 16, alignItems: 'center', borderRadius: 50 },
  primaryText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: '#fff' },
  secondary: { paddingVertical: 14, alignItems: 'center', width: '100%' },
  secondaryText: { fontSize: 14, color: colors.slate, fontWeight: '500' },
});
