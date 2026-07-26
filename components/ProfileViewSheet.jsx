import { useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Pressable, StyleSheet, Image, Dimensions, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../lib/ThemeContext';
import { buildProfileCardBlocks, buildProfileTraits } from '../lib/profileUtils';

const { height: SCREEN_H } = Dimensions.get('window');

// `showActions` is off for read-only uses — previewing your own profile, or
// viewing a match you're already chatting with — where pass/like make no sense.
export default function ProfileViewSheet({ visible, profile, onClose, onPass, onLike, showActions = true }) {
  const s = useThemedStyles(makeStyles);
  const { colors } = useTheme();
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

  // Before the early return — hooks can't run conditionally.
  const cardBlocks = useMemo(() => buildProfileCardBlocks(profile), [profile]);
  const traits = useMemo(() => buildProfileTraits(profile), [profile]);

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
                  <Text style={s.infoItemText}>{(profile.budget_max || profile.budget) ? `₹${profile.budget_max || profile.budget}/mo` : '-'}</Text>
                </View>
              </View>
            </View>

            {/* Lifestyle traits — only the ones this profile has set */}
            {traits.length > 0 && (
              <View style={s.traitCard}>
                <Text style={s.traitTitle}>Lifestyle</Text>
                <View style={s.traitChips}>
                  {traits.map((t) => {
                    const Icon = t.iconSet === 'mci' ? MaterialCommunityIcons : Ionicons;
                    return (
                      <View key={t.group} style={s.traitChip}>
                        <Icon name={t.icon} size={14} color="#9AA0B2" />
                        <Text style={s.traitChipText}>{t.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Prompts and remaining photos, interleaved — shares the feed
                card's builder so the preview can't drift from the real card */}
            {cardBlocks.map((block, i) =>
              block.kind === 'prompt' ? (
                <View
                  key={`prompt-${i}`}
                  style={block.accent ? [s.promptAccent, { backgroundColor: colors.tintViolet }] : s.promptWhite}
                >
                  <Text style={block.accent ? s.promptAccentQ : s.promptQ}>{block.q}</Text>
                  <Text style={s.promptA}>{block.a}</Text>
                </View>
              ) : (
                <View key={`photo-${i}`} style={s.blockPhotoWrap}>
                  <Image source={{ uri: block.url }} style={s.blockPhoto} resizeMode="cover" />
                  {block.label && (
                    <View style={s.flatLabel}>
                      <Text style={s.flatLabelText}>{block.label}</Text>
                    </View>
                  )}
                </View>
              ),
            )}

          </ScrollView>

          {/* Action Footer */}
          {showActions ? (
            <View style={s.actions}>
              <TouchableOpacity style={s.navBtn} onPress={() => { onClose(); onPass?.(); }}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
              <TouchableOpacity style={s.navBtnHeart} onPress={() => { onClose(); onLike?.(); }}>
                <Ionicons name="heart" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.actions}>
              <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={s.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}

        </Animated.View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  sheet: { backgroundColor: colors.canvas, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: SCREEN_H * 0.9 },
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
  pronouns: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: colors.placeholder },
  dot: { fontSize: 13, color: colors.placeholder },
  active: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.blue },

  photoWrap: { position: 'relative', borderRadius: 20, overflow: 'hidden', marginBottom: 10, height: 400, marginHorizontal: 16 },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },

  infoCard: { backgroundColor: colors.card, borderRadius: 20, padding: 18, marginBottom: 10, marginHorizontal: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoItemText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink },
  infoDivider: { width: 1, height: 20, backgroundColor: colors.divider },
  infoHorizDivider: { height: 1, backgroundColor: colors.divider, marginVertical: 8 },

  traitCard: { backgroundColor: colors.card, borderRadius: 20, padding: 18, marginBottom: 10, marginHorizontal: 16 },
  traitTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.slate, marginBottom: 12 },
  traitChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  traitChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.mist, borderRadius: 50, paddingHorizontal: 12, paddingVertical: 7 },
  traitChipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink },

  promptWhite: { position: 'relative', backgroundColor: colors.card, borderRadius: 20, padding: 24, paddingBottom: 30, marginBottom: 10, marginHorizontal: 16 },
  promptQ: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.slate, marginBottom: 10 },
  promptA: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: colors.ink, letterSpacing: -0.4, lineHeight: 30 },
  
  promptAccent: { position: 'relative', borderRadius: 20, padding: 24, paddingBottom: 30, marginBottom: 10, marginHorizontal: 16 },
  promptAccentQ: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.violet, marginBottom: 10 },

  // Full-width stacked photos, matching the feed card's interleaved layout
  // (the old horizontal strip only ever showed owners' flat photos).
  blockPhotoWrap: { position: 'relative', borderRadius: 20, overflow: 'hidden', height: 260, marginBottom: 10, marginHorizontal: 16 },
  blockPhoto: { width: '100%', height: '100%' },
  flatLabel: { position: 'absolute', bottom: 14, left: 14, backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6 },
  flatLabelText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: '#fff' },

  actions: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingTop: 16, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: colors.border },
  navBtn: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  navBtnHeart: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.violet,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },

  closeBtn: {
    flex: 1, borderRadius: 50, paddingVertical: 16, alignItems: 'center',
    backgroundColor: colors.card,
  },
  closeBtnText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: colors.ink },
});
