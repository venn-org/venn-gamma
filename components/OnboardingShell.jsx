import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';

export default function OnboardingShell({ step, total, children, footer, slideX = 0, opacity = 1 }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pct = `${Math.round((step / total) * 100)}%`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.progressTrack}>
          <LinearGradient colors={[colors.blue, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: pct }]} />
        </View>
        <Text style={styles.stepLabel}>STEP {step} OF {total}</Text>
      </View>

      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backArrow}>‹</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.body, { opacity, transform: [{ translateX: slideX }] }]}>
        {children}
      </Animated.View>

      {footer && (
        <Animated.View style={[styles.footer, { paddingBottom: insets.bottom + 24 }, { opacity, transform: [{ translateX: slideX }] }]}>
          {footer}
        </Animated.View>
      )}
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
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 20 },
  footer: { paddingHorizontal: 28, paddingTop: 12 },
});
