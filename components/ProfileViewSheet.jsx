import { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Pressable, StyleSheet, Image, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';

const { height: SCREEN_H } = Dimensions.get('window');

export default function ProfileViewSheet({ visible, profile, onClose, onPass, onLike }) {
  const insets = useSafeAreaInsets();

  // Manual backdrop-fade + sheet-slide (decoupled) so the backdrop doesn't
  // ride along with the sheet's slide transform, which reads as a solid
  // black panel growing up the screen instead of an instant dim.
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      sheetY.setValue(SCREEN_H);
    }
  }, [visible]);

  if (!profile) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View style={[s.sheet, { paddingTop: 20, paddingBottom: insets.bottom + 12, transform: [{ translateY: sheetY }] }]}>
          <View style={s.handle} />
          
          <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Header matches feed card */}
            <View style={s.cardHeader}>
              <View>
                <View style={s.nameRow}>
                  <Text style={s.name}>{profile.name}</Text>
                  <View style={s.verifiedBadge}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                  <View style={[s.overlapPill, { backgroundColor: profile.user_type === 'owner' ? colors.blue : colors.violet, marginLeft: 6 }]}>
                    <Text style={s.overlapText}>{profile.user_type === 'owner' ? 'Has a flat' : 'Looking for flat'}</Text>
                  </View>
                </View>
                <View style={s.statusRow}>
                  <Text style={s.pronouns}>{profile.pronouns?.[0] || '-'}</Text>
                  <Text style={s.dot}> • </Text>
                  <Text style={s.active}>Active now</Text>
                </View>
              </View>
            </View>

            {/* Main Photo */}
            <View style={s.photoWrap}>
              {profile.photos?.[0] ? (
                <Image source={{ uri: profile.photos[0] }} style={s.photo} resizeMode="cover" />
              ) : (
                <View style={[s.photo, s.photoPlaceholder]}>
                  <Text style={{color: '#9AA0B2'}}>No Photo</Text>
                </View>
              )}
            </View>

            {/* Info Card */}
            <View style={s.infoCard}>
              <View style={s.infoRow}>
                <View style={s.infoItem}>
                  <Ionicons name="calendar-outline" size={16} color="#9AA0B2" />
                  <Text style={s.infoItemText}>{profile.age || '-'}</Text>
                </View>
                <View style={s.infoDivider} />
                <View style={[s.infoItem, { paddingLeft: 12 }]}>
                  <Ionicons name="person-outline" size={16} color="#9AA0B2" />
                  <Text style={s.infoItemText}>{profile.gender || '-'}</Text>
                </View>
              </View>
              <View style={s.infoHorizDivider} />
              <View style={s.infoRow}>
                <View style={s.infoItem}>
                  <Ionicons name="location-outline" size={16} color="#9AA0B2" />
                  <Text style={s.infoItemText}>{profile.location || '-'}</Text>
                </View>
                <View style={s.infoDivider} />
                <View style={[s.infoItem, { paddingLeft: 12 }]}>
                  <Ionicons name="cash-outline" size={16} color="#9AA0B2" />
                  <Text style={s.infoItemText}>{(profile.budget_max || profile.budget) ? `£${profile.budget_max || profile.budget}/mo` : '-'}</Text>
                </View>
              </View>
            </View>

            {/* Flat Photo */}
            {profile.photos?.[1] && (
              <View style={s.flatPhotoWrap}>
                <Image source={{ uri: profile.photos[1] }} style={s.flatPhoto} resizeMode="cover" />
                <View style={s.flatLabel}>
                  <Text style={s.flatLabelText}>Living Room</Text>
                </View>
              </View>
            )}

            {/* Prompts */}
            {Array.isArray(profile.prompts) && profile.prompts.map((p, i) => (
              <View key={i} style={i % 2 === 0 ? s.promptWhite : [s.promptAccent, { backgroundColor: '#F3EEFF' }]}>
                <Text style={i % 2 === 0 ? s.promptQ : s.promptAccentQ}>{p.q}</Text>
                <Text style={s.promptA}>{p.a}</Text>
              </View>
            ))}

          </ScrollView>

          {/* Action Footer */}
          <View style={s.actions}>
            <TouchableOpacity style={s.navBtn} onPress={() => { onClose(); onPass?.(); }}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
            <TouchableOpacity style={s.navBtnHeart} onPress={() => { onClose(); onLike?.(); }}>
              <Ionicons name="heart" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  sheet: { backgroundColor: '#F2F3F7', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: SCREEN_H * 0.9 },
  handle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  
  cardHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 26, color: colors.ink, letterSpacing: -0.4 },
  verifiedBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center' },
  overlapPill: { borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3 },
  overlapText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12, color: '#fff', letterSpacing: -0.2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  pronouns: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2' },
  dot: { fontSize: 13, color: '#9AA0B2' },
  active: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.blue },

  photoWrap: { position: 'relative', borderRadius: 20, overflow: 'hidden', marginBottom: 10, height: 400, marginHorizontal: 16 },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { backgroundColor: '#E6E8EE', alignItems: 'center', justifyContent: 'center' },

  infoCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 10, marginHorizontal: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoItemText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink },
  infoDivider: { width: 1, height: 20, backgroundColor: '#F0F0F4' },
  infoHorizDivider: { height: 1, backgroundColor: '#F0F0F4', marginVertical: 8 },

  promptWhite: { position: 'relative', backgroundColor: '#fff', borderRadius: 20, padding: 24, paddingBottom: 30, marginBottom: 10, marginHorizontal: 16 },
  promptQ: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.slate, marginBottom: 10 },
  promptA: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: colors.ink, letterSpacing: -0.4, lineHeight: 30 },
  
  promptAccent: { position: 'relative', borderRadius: 20, padding: 24, paddingBottom: 30, marginBottom: 10, marginHorizontal: 16 },
  promptAccentQ: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.violet, marginBottom: 10 },

  flatPhotoWrap: { position: 'relative', borderRadius: 20, overflow: 'hidden', marginBottom: 10, height: 280, marginHorizontal: 16 },
  flatPhoto: { width: '100%', height: '100%' },
  flatLabel: { position: 'absolute', bottom: 14, left: 14, backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6 },
  flatLabelText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: '#fff' },

  actions: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingTop: 16, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: '#E6E8EE' },
  navBtn: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  navBtnHeart: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.violet,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  }
});
