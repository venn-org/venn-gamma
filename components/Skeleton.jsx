import { useEffect } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useTheme } from '../lib/ThemeContext';

// One driver shared by every block on screen. Per-block animations would drift
// out of phase and read as a field of independently blinking rectangles, and
// on a slow device (the case this whole feature exists for) they'd also be N
// animations competing instead of one. Refcounted so the loop only runs while
// something is actually skeletoned.
const pulse = new Animated.Value(0);
let mounted = 0;
let loop = null;

function usePulse() {
  useEffect(() => {
    mounted += 1;
    if (!loop) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 650,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 650,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
    }
    return () => {
      mounted -= 1;
      if (mounted === 0 && loop) {
        loop.stop();
        loop = null;
        pulse.setValue(0);
      }
    };
  }, []);
  return pulse;
}

/**
 * A single placeholder block. Sized by the caller so each screen's skeleton can
 * mirror its real layout — a skeleton that doesn't match what replaces it
 * causes a visible reflow at the exact moment the user starts reading.
 */
export function Skeleton({ width, height, radius = 8, style }) {
  const { colors } = useTheme();
  const p = usePulse();
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.mist,
          opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] }),
        },
        style,
      ]}
    />
  );
}

/** Mirrors the feed card: header, hero photo, info card, lifestyle card. */
export function FeedCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View accessibilityLabel="Loading profiles" style={{ paddingTop: 14 }}>
      <View style={st.rowBetween}>
        <View style={{ gap: 8 }}>
          <Skeleton width={160} height={24} radius={7} />
          <Skeleton width={110} height={14} />
        </View>
        <Skeleton width={36} height={36} radius={18} />
      </View>

      <Skeleton height={400} radius={20} style={{ marginTop: 14, marginBottom: 10 }} />

      <View style={[st.card, { backgroundColor: colors.card }]}>
        <View style={st.rowBetween}>
          <Skeleton width={90} height={16} />
          <Skeleton width={90} height={16} />
        </View>
        <View style={[st.hr, { backgroundColor: colors.divider }]} />
        <View style={st.rowBetween}>
          <Skeleton width={120} height={16} />
          <Skeleton width={70} height={16} />
        </View>
      </View>

      <View style={[st.card, { backgroundColor: colors.card }]}>
        <Skeleton width={80} height={13} style={{ marginBottom: 14 }} />
        <View style={st.chipRow}>
          <Skeleton width={96} height={30} radius={50} />
          <Skeleton width={78} height={30} radius={50} />
          <Skeleton width={110} height={30} radius={50} />
        </View>
      </View>
    </View>
  );
}

/**
 * Mirrors the two-up likes grid. `cardW` comes from the screen's own measure.
 * Deliberately short (two rows): the skeleton is a hint that something is
 * coming, not a promise of how much — a full screen of placeholders that
 * resolves into "no likes yet" reads as content that failed to load.
 */
export function LikesGridSkeleton({ cardW, count = 4 }) {
  const { colors } = useTheme();
  return (
    <View accessibilityLabel="Loading likes" style={st.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width: cardW, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.card }}>
          <Skeleton height={cardW * 1.25} radius={0} />
          <View style={{ padding: 12, gap: 6 }}>
            <Skeleton width={cardW * 0.55} height={15} />
            <Skeleton width={cardW * 0.38} height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Mirrors the messages list: a section heading over stacked chat rows. */
export function MessagesListSkeleton({ count = 3 }) {
  const { colors } = useTheme();
  return (
    <View accessibilityLabel="Loading messages" style={{ paddingHorizontal: 20, paddingTop: 18 }}>
      <Skeleton width={120} height={15} style={{ marginBottom: 14 }} />
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[st.chatRow, { backgroundColor: colors.card }]}>
          <Skeleton width={48} height={48} radius={24} />
          <View style={{ flex: 1, gap: 7 }}>
            <Skeleton width={130} height={15} />
            <Skeleton width={'75%'} height={13} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Mirrors the notification rows (avatar + two lines, divider-separated). */
export function NotificationsListSkeleton({ count = 7 }) {
  const { colors } = useTheme();
  return (
    <View accessibilityLabel="Loading notifications">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[st.notifRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        >
          <Skeleton width={48} height={48} radius={24} />
          <View style={{ flex: 1, gap: 7 }}>
            <Skeleton width={'70%'} height={14} />
            <Skeleton width={70} height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: { borderRadius: 20, padding: 18, marginBottom: 10 },
  hr: { height: 1, marginVertical: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
});
