import { useRef, useState } from 'react';
import { View, Text, PanResponder, StyleSheet } from 'react-native';
import { colors } from '../lib/theme';

const THUMB_SIZE = 24;

// Dual-thumb range slider (min/max), e.g. for a budget filter.
export default function RangeSlider({ min, max, step = 1000, valueMin, valueMax, onChange, formatValue = (v) => `₹${v}` }) {
  const [trackWidth, setTrackWidth] = useState(0);

  // Refs so the PanResponder instances (created once) always read live values.
  const trackWidthRef = useRef(trackWidth);
  trackWidthRef.current = trackWidth;
  const valueMinRef = useRef(valueMin);
  valueMinRef.current = valueMin;
  const valueMaxRef = useRef(valueMax);
  valueMaxRef.current = valueMax;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const valueToX = (v) => trackWidthRef.current ? ((v - min) / (max - min)) * trackWidthRef.current : 0;
  const xToValue = (x) => {
    const raw = min + (x / trackWidthRef.current) * (max - min);
    return clamp(Math.round(raw / step) * step, min, max);
  };

  const startXRef = useRef({ min: 0, max: 0 });

  const minResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        startXRef.current.min = valueToX(valueMinRef.current);
      },
      onPanResponderMove: (_, gesture) => {
        const x = clamp(startXRef.current.min + gesture.dx, 0, trackWidthRef.current);
        const next = Math.min(xToValue(x), valueMaxRef.current - step);
        onChangeRef.current(Math.max(next, min), valueMaxRef.current);
      },
    })
  ).current;

  const maxResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        startXRef.current.max = valueToX(valueMaxRef.current);
      },
      onPanResponderMove: (_, gesture) => {
        const x = clamp(startXRef.current.max + gesture.dx, 0, trackWidthRef.current);
        const next = Math.max(xToValue(x), valueMinRef.current + step);
        onChangeRef.current(valueMinRef.current, Math.min(next, max));
      },
    })
  ).current;

  const minX = valueToX(valueMin);
  const maxX = valueToX(valueMax);

  return (
    <View style={styles.wrap}>
      <View style={styles.labelsRow}>
        <Text style={styles.valueText}>{formatValue(valueMin)}</Text>
        <Text style={styles.valueText}>{formatValue(valueMax)}</Text>
      </View>
      <View
        style={styles.track}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <View style={styles.trackBg} />
        <View style={[styles.trackFill, { left: minX, width: Math.max(0, maxX - minX) }]} />
        <View
          {...minResponder.panHandlers}
          style={[styles.thumb, { left: minX - THUMB_SIZE / 2 }]}
        />
        <View
          {...maxResponder.panHandlers}
          style={[styles.thumb, { left: maxX - THUMB_SIZE / 2 }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 8 },
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  valueText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: colors.ink },
  track: { height: THUMB_SIZE, justifyContent: 'center' },
  trackBg: { position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, backgroundColor: '#E6E8EE' },
  trackFill: { position: 'absolute', height: 4, borderRadius: 2, backgroundColor: colors.blue },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.blue,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});
