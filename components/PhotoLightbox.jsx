import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Image, Dimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/**
 * Full-screen viewer for a set of `{url, label}` photos, opened from a gallery
 * tile. Always dark regardless of theme — the image is the subject here.
 *
 * `startIndex` seeds the cursor each time the viewer opens; the cursor then
 * lives here so the caller doesn't have to track paging.
 */
export default function PhotoLightbox({ visible, photos = [], startIndex = 0, onClose }) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    if (visible) setIndex(startIndex);
  }, [visible, startIndex]);

  if (!photos.length) return null;

  // Wrap around so the arrows never dead-end on the first/last photo.
  const step = (delta) => setIndex((i) => (i + delta + photos.length) % photos.length);
  const photo = photos[Math.min(index, photos.length - 1)];
  const multiple = photos.length > 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        {/* Tapping the background closes; the image sits above it. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Image source={{ uri: photo.url }} style={styles.image} resizeMode="contain" />

        <View style={[styles.topBar, { top: insets.top + 10 }]}>
          <Text style={styles.counter}>
            {photo.label ? `${photo.label} · ` : ''}{index + 1}/{photos.length}
          </Text>
          <TouchableOpacity style={styles.iconBtn} onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {multiple && (
          <>
            <TouchableOpacity
              style={[styles.navBtn, styles.navLeft]}
              onPress={() => step(-1)}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navBtn, styles.navRight]}
              onPress={() => step(1)}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-forward" size={26} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' },
  image: { width: SCREEN_W, height: SCREEN_H * 0.72 },

  topBar: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  counter: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: '#fff' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },

  navBtn: {
    position: 'absolute', top: '50%', marginTop: -22,
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  navLeft: { left: 14 },
  navRight: { right: 14 },
});
