import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { getCurrentUserId } from '../../lib/auth';

const { width: SCREEN_W } = Dimensions.get('window');

const FILTER_CHIPS = [
  { key: 'role', label: 'Role' },
  { key: 'budget', label: 'Budget' },
  { key: 'areas', label: 'Areas' },
];

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    const uid = getCurrentUserId();
    if (!uid) return;
    
    // Simplistic feed query: everyone except current user
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', uid)
      .limit(20);
      
    if (data) setProfiles(data);
  };

  const handlePass = () => setCurrentIndex(i => i + 1);
  const handleLike = () => setCurrentIndex(i => i + 1); 

  const currentProfile = profiles[currentIndex];

  return (
    <View style={[s.screen, { paddingTop: insets.top + 12 }]}>
      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.logoRow}>
          <View style={s.logoWrap}>
            <View style={[s.circle, { backgroundColor: colors.blue, left: 0 }]} />
            <View style={[s.circle, { backgroundColor: colors.violet, right: 0, opacity: 0.9 }]} />
          </View>
          <Text style={s.wordmark}>Venn</Text>
        </View>
        <View style={s.topBarRight}>
          <View style={s.likesPill}>
            <Ionicons name="heart" size={12} color="#22C55E" />
            <Text style={s.likesPillText}>∞ likes left</Text>
          </View>
          <TouchableOpacity style={s.filterIconBtn} activeOpacity={0.8}>
            <Ionicons name="options-outline" size={18} color={colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
        {FILTER_CHIPS.map(chip => (
          <TouchableOpacity key={chip.key} style={s.filterChip} activeOpacity={0.8}>
            <Text style={s.filterChipText}>{chip.label}</Text>
            <Ionicons name="chevron-down" size={12} color={colors.ink} style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Feed Content */}
      <View style={[s.feedContent, { flex: 1 }]}>
        {!currentProfile ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>No more profiles found.</Text>
            <TouchableOpacity style={[s.refreshBtn, { marginTop: 16 }]} onPress={fetchFeed}>
              <Text style={s.refreshBtnText}>Refresh Feed</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[s.cardOuter, { flex: 1 }]}>
            {/* Card Header (Fixed) */}
            <View style={s.cardHeader}>
              <View>
                <View style={s.nameRow}>
                  <Text style={s.name}>{currentProfile.name}</Text>
                  <View style={s.verifiedBadge}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                  <View style={[s.overlapPill, { backgroundColor: colors.violet, marginLeft: 6 }]}>
                    <Text style={s.overlapText}>Seeking</Text>
                  </View>
                </View>
                <View style={s.statusRow}>
                  <Text style={s.pronouns}>{currentProfile.pronouns?.[0] || 'they/them'}</Text>
                  <Text style={s.dot}> • </Text>
                  <Text style={s.active}>Active now</Text>
                </View>
              </View>
              <View style={s.navBtns}>
                <TouchableOpacity style={s.navBtn} onPress={handlePass}>
                  <Ionicons name="close" size={18} color={colors.ink} />
                </TouchableOpacity>
                <TouchableOpacity style={s.navBtn} onPress={handlePass}>
                  <Ionicons name="ellipsis-horizontal" size={18} color={colors.ink} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Scrollable Profile Content */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={s.photoWrap}>
                {currentProfile.photos?.[0] ? (
                  <Image source={{ uri: currentProfile.photos[0] }} style={s.photo} resizeMode="cover" />
                ) : (
                  <View style={[s.photo, s.photoPlaceholder]}>
                    <Text style={{color: '#9AA0B2'}}>No Photo</Text>
                  </View>
                )}
                <TouchableOpacity style={s.heartBtn} activeOpacity={0.9} onPress={handleLike}>
                  <Ionicons name="heart" size={24} color={colors.violet} />
                </TouchableOpacity>
              </View>

              {/* Info Card */}
              <View style={s.infoCard}>
                <View style={s.infoRow}>
                  <View style={s.infoItem}>
                    <Ionicons name="calendar-outline" size={16} color="#9AA0B2" />
                    <Text style={s.infoItemText}>24</Text>
                  </View>
                  <View style={s.infoDivider} />
                  <View style={[s.infoItem, { paddingLeft: 12 }]}>
                    <Ionicons name="person-outline" size={16} color="#9AA0B2" />
                    <Text style={s.infoItemText}>{currentProfile.gender || 'Non-binary'}</Text>
                  </View>
                </View>
                <View style={s.infoHorizDivider} />
                <View style={s.infoRow}>
                  <View style={s.infoItem}>
                    <Ionicons name="location-outline" size={16} color="#9AA0B2" />
                    <Text style={s.infoItemText}>London</Text>
                  </View>
                  <View style={s.infoDivider} />
                  <View style={[s.infoItem, { paddingLeft: 12 }]}>
                    <Ionicons name="cash-outline" size={16} color="#9AA0B2" />
                    <Text style={s.infoItemText}>£{currentProfile.budget || '1200'}/mo</Text>
                  </View>
                </View>
              </View>

              {/* Prompt White */}
              <View style={s.promptWhite}>
                <Text style={s.promptQ}>A random fact I love is</Text>
                <Text style={s.promptA}>The first oranges weren't orange</Text>
                <TouchableOpacity style={s.promptHeartGray} activeOpacity={0.9} onPress={handleLike}>
                  <Ionicons name="heart" size={20} color="#C0C5D0" />
                </TouchableOpacity>
              </View>

              {/* Flat Photo (Mocked if empty) */}
              <View style={s.flatPhotoWrap}>
                 {currentProfile.photos?.[1] ? (
                  <Image source={{ uri: currentProfile.photos[1] }} style={s.flatPhoto} resizeMode="cover" />
                ) : (
                  <View style={[s.flatPhoto, s.photoPlaceholder]}>
                    <Text style={{color: '#9AA0B2'}}>No Flat Photo</Text>
                  </View>
                )}
                <View style={s.flatLabel}>
                  <Text style={s.flatLabelText}>Living Room</Text>
                </View>
              </View>

              {/* Prompt Accent */}
              <View style={[s.promptAccent, { backgroundColor: '#F3EEFF' }]}>
                <Text style={s.promptAccentQ}>I'm looking for a flatmate who</Text>
                <Text style={s.promptA}>Doesn't mind my 3 pet rocks</Text>
                <TouchableOpacity style={s.promptHeartViolet} activeOpacity={0.9} onPress={handleLike}>
                  <Ionicons name="heart" size={20} color={colors.violet} />
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F2F3F7' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 6, paddingBottom: 6, backgroundColor: '#F2F3F7',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoWrap: { width: 30, height: 18, position: 'relative' },
  circle: { position: 'absolute', top: 0, width: 18, height: 18, borderRadius: 9 },
  wordmark: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.ink, letterSpacing: -0.4 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  likesPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F0FFF4', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 5,
  },
  likesPillText: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: '#22C55E', letterSpacing: 0.3 },
  filterIconBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  filterScroll: { flexShrink: 0, flexGrow: 0, backgroundColor: '#F2F3F7', maxHeight: 44 },
  filterRow: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10, gap: 8, flexDirection: 'row' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 50, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  filterChipText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink },
  feedContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 80 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.slate },
  refreshBtn: { backgroundColor: colors.ink, borderRadius: 50, paddingHorizontal: 26, paddingVertical: 12 },
  refreshBtnText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: '#fff' },

  // Card Styles matching blueprint
  cardOuter: { backgroundColor: '#F2F3F7' },
  cardHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 4, paddingBottom: 12,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: colors.ink, letterSpacing: -0.4 },
  verifiedBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center' },
  overlapPill: { borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3 },
  overlapText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12, color: '#fff', letterSpacing: -0.2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  pronouns: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2' },
  dot: { fontSize: 13, color: '#9AA0B2' },
  active: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.blue },
  
  navBtns: { flexDirection: 'row', gap: 8 },
  navBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 6, shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  photoWrap: { position: 'relative', borderRadius: 20, overflow: 'hidden', marginBottom: 10, height: 400 },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { backgroundColor: '#E6E8EE', alignItems: 'center', justifyContent: 'center' },
  
  heartBtn: {
    position: 'absolute', bottom: 14, right: 14,
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  infoCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoItemText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink },
  infoDivider: { width: 1, height: 20, backgroundColor: '#F0F0F4' },
  infoHorizDivider: { height: 1, backgroundColor: '#F0F0F4', marginVertical: 8 },

  promptWhite: { position: 'relative', backgroundColor: '#fff', borderRadius: 20, padding: 24, paddingBottom: 60, marginBottom: 10 },
  promptQ: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.slate, marginBottom: 10 },
  promptA: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: colors.ink, letterSpacing: -0.4, lineHeight: 30 },
  promptHeartGray: { position: 'absolute', bottom: 14, right: 14, width: 44, height: 44, borderRadius: 22, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' },
  
  promptAccent: { position: 'relative', borderRadius: 20, padding: 24, paddingBottom: 60, marginBottom: 10 },
  promptAccentQ: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.violet, marginBottom: 10 },
  promptHeartViolet: {
    position: 'absolute', bottom: 14, right: 14, width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.violet, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },

  flatPhotoWrap: { position: 'relative', borderRadius: 20, overflow: 'hidden', marginBottom: 10, height: 280 },
  flatPhoto: { width: '100%', height: '100%' },
  flatLabel: { position: 'absolute', bottom: 14, left: 14, backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6 },
  flatLabelText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: '#fff' },
});
