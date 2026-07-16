import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { getCurrentUserId } from '../../lib/auth';
import { getBlockedIds } from '../../lib/blocks';
import { mapDbPrefsToUI, mapUIPrefsToDb, toDb } from '../../lib/enums';
import PreferencesSheet from '../../components/PreferencesSheet';
import MatchCelebration from '../../components/MatchCelebration';
import { useRouter } from 'expo-router';

const { width: SCREEN_W } = Dimensions.get('window');

const FILTER_CHIPS = [
  { key: 'role', label: 'Role' },
  { key: 'budget', label: 'Budget' },
  { key: 'areas', label: 'Areas' },
];

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [prefsVisible, setPrefsVisible] = useState(false);
  const [userPrefs, setUserPrefs] = useState(null);

  // Match celebration state
  const [matchData, setMatchData] = useState(null); // { name, photo, matchId }

  useEffect(() => {
    fetchMyPrefs();
    fetchFeed();

    const uid = getCurrentUserId();
    if (!uid) return;

    // Listen for new matches in real-time
    const matchSub = supabase
      .channel('feed_matches')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        (payload) => {
          const { user1_id, user2_id, id } = payload.new;
          if (user1_id === uid || user2_id === uid) {
            const otherId = user1_id === uid ? user2_id : user1_id;
            // Fetch their details to show celebration
            supabase.from('profiles').select('name, photos').eq('id', otherId).single().then(({ data }) => {
              if (data) {
                setMatchData({
                  name: data.name,
                  photo: data.photos?.[0] || null,
                  matchId: id
                });
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchSub);
    };
  }, []);

  const fetchMyPrefs = async () => {
    const uid = getCurrentUserId();
    if (!uid) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (data) {
      setUserPrefs(mapDbPrefsToUI(data));
    }
  };

  const handleSavePrefs = async (newPrefs) => {
    const uid = getCurrentUserId();
    if (!uid) return;
    setUserPrefs(newPrefs);
    const updates = mapUIPrefsToDb(newPrefs);
    await supabase.from('profiles').update(updates).eq('id', uid);
    // Refresh feed based on new prefs
    fetchFeed(newPrefs);
  };

  const fetchFeed = async (currentPrefs = userPrefs) => {
    const uid = getCurrentUserId();
    if (!uid) return;
    
    setCurrentIndex(0);
    const blocked = await getBlockedIds(uid);

    let query = supabase
      .from('profiles')
      .select('*')
      .neq('id', uid)
      .eq('paused', false)
      .order('last_active_at', { ascending: false }); // simple ranking

    // Apply basic filters if preferences exist
    if (currentPrefs?.role) {
      const dbRole = toDb('pref_role', currentPrefs.role);
      // If I'm seeking, show me owners. If I'm owner, show me seeking.
      const targetRole = dbRole === 'seeking' ? 'owner' : 'seeking';
      query = query.eq('user_type', targetRole);
    }
    
    // Note: A full matching algorithm would filter on budget and areas here using postgres overlaps logic.
    // For now we do a simple query.
    
    const { data } = await query.limit(30);
    if (data) {
      // Filter out blocked users locally
      const filtered = data.filter(p => !blocked.has(p.id));
      setProfiles(filtered);
    }
  };

  const currentProfile = profiles[currentIndex];

  const handlePass = () => {
    setCurrentIndex(i => i + 1);
  };

  const handleLike = async () => {
    const uid = getCurrentUserId();
    if (!uid || !currentProfile) return;

    const targetId = currentProfile.id;
    setCurrentIndex(i => i + 1);

    // Insert like. The backend trigger will automatically create a match if mutual.
    const { error } = await supabase.from('likes').insert({
      from_user_id: uid,
      to_user_id: targetId
    });

    if (error && error.code !== '23505') { // Ignore unique constraint if already liked
      console.error('Like failed', error);
      Alert.alert('Error', 'Failed to send like');
    }
  };

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
          <TouchableOpacity style={s.filterIconBtn} activeOpacity={0.8} onPress={() => setPrefsVisible(true)}>
            <Ionicons name="options-outline" size={18} color={colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
        {FILTER_CHIPS.map(chip => (
          <TouchableOpacity key={chip.key} style={s.filterChip} activeOpacity={0.8} onPress={() => setPrefsVisible(true)}>
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
            <TouchableOpacity style={[s.refreshBtn, { marginTop: 16 }]} onPress={() => fetchFeed()}>
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
                  {currentProfile.verified && (
                    <View style={s.verifiedBadge}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                  <View style={[s.overlapPill, { backgroundColor: colors.violet, marginLeft: 6 }]}>
                    <Text style={s.overlapText}>{currentProfile.user_type === 'owner' ? 'Has a flat' : 'Seeking'}</Text>
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
                <TouchableOpacity style={s.navBtn} onPress={() => {}}>
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
                    <Text style={s.infoItemText}>{currentProfile.age || 24}</Text>
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
                    <Text style={s.infoItemText}>{currentProfile.location || 'London'}</Text>
                  </View>
                  <View style={s.infoDivider} />
                  <View style={[s.infoItem, { paddingLeft: 12 }]}>
                    <Ionicons name="cash-outline" size={16} color="#9AA0B2" />
                    <Text style={s.infoItemText}>£{currentProfile.budget_max || currentProfile.budget || '1200'}/mo</Text>
                  </View>
                </View>
              </View>

              {/* Prompts and Flat photos... */}
              {Array.isArray(currentProfile.prompts) && currentProfile.prompts.map((p, i) => (
                <View key={i} style={i % 2 === 0 ? s.promptWhite : [s.promptAccent, { backgroundColor: '#F3EEFF' }]}>
                  <Text style={i % 2 === 0 ? s.promptQ : s.promptAccentQ}>{p.q}</Text>
                  <Text style={s.promptA}>{p.a}</Text>
                  <TouchableOpacity style={i % 2 === 0 ? s.promptHeartGray : s.promptHeartViolet} activeOpacity={0.9} onPress={handleLike}>
                    <Ionicons name="heart" size={20} color={i % 2 === 0 ? "#C0C5D0" : colors.violet} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Flat Photo Fallback (if they have > 1 photo) */}
              {currentProfile.photos?.[1] && (
                <View style={s.flatPhotoWrap}>
                  <Image source={{ uri: currentProfile.photos[1] }} style={s.flatPhoto} resizeMode="cover" />
                  <View style={s.flatLabel}>
                    <Text style={s.flatLabelText}>Living Room</Text>
                  </View>
                </View>
              )}

            </ScrollView>
          </View>
        )}
      </View>

      <PreferencesSheet
        visible={prefsVisible}
        prefs={userPrefs}
        onClose={() => setPrefsVisible(false)}
        onSave={handleSavePrefs}
      />

      {matchData && (
        <MatchCelebration
          visible={!!matchData}
          matchedName={matchData.name}
          matchedPhoto={matchData.photo}
          onDismiss={() => setMatchData(null)}
          onChat={() => {
            setMatchData(null);
            router.push('/(tabs)/messages');
          }}
        />
      )}
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

  // Card Styles
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
