import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MatchCelebration from '../../components/MatchCelebration';
import PreferencesSheet from '../../components/PreferencesSheet';
import { getCurrentUserId } from '../../lib/auth';
import { getBlockedIds } from '../../lib/blocks';
import { mapDbPrefsToUI, mapUIPrefsToDb, toDb } from '../../lib/enums';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { calculateProfileCompletion } from '../../lib/profileUtils';

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
  const [myProfile, setMyProfile] = useState(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  // Match celebration state
  const [matchData, setMatchData] = useState(null);

  // Animation
  const fadeIn = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    fadeIn.setValue(0);
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [currentIndex, profiles]);

  const fetchMyPrefs = async () => {
    const uid = getCurrentUserId();
    if (!uid) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (data) {
      setUserPrefs(mapDbPrefsToUI(data));
      setMyProfile(data);
    }
  };

  const handleSavePrefs = async (newPrefs) => {
    const uid = getCurrentUserId();
    if (!uid) return;
    setUserPrefs(newPrefs);
    const updates = mapUIPrefsToDb(newPrefs);
    await supabase.from('profiles').update(updates).eq('id', uid);
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
      .order('last_active_at', { ascending: false });

    if (currentPrefs?.role) {
      const dbRole = toDb('pref_role', currentPrefs.role);
      const targetRole = dbRole === 'seeking' ? 'owner' : 'seeking';
      query = query.eq('user_type', targetRole);
    }

    const { data } = await query.limit(30);
    if (data) {
      const filtered = data.filter(p => !blocked.has(p.id));
      setProfiles(filtered);
    }
  };

  const currentProfile = profiles[currentIndex];

  const handlePass = () => {
    Animated.timing(fadeIn, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex(i => i + 1);
    });
  };

  const handleLike = async () => {
    const uid = getCurrentUserId();
    if (!uid || !currentProfile) return;

    const targetId = currentProfile.id;

    Animated.timing(fadeIn, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex(i => i + 1);
    });

    const { error } = await supabase.from('likes').insert({
      from_user_id: uid,
      to_user_id: targetId
    });

    if (error && error.code !== '23505') {
      Alert.alert('Error', 'Failed to send like');
    }
  };

  const handleReport = () => {
    setMenuOpen(false);
    Alert.alert('Reported', 'Thank you for keeping Venn safe.');
    handlePass();
  };

  const handleBlock = async () => {
    setMenuOpen(false);
    const uid = getCurrentUserId();
    if (!uid || !currentProfile) return;

    const { error } = await supabase.from('blocks').insert({
      blocker_id: uid,
      blocked_id: currentProfile.id
    });

    if (!error) {
      handlePass();
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

      {/* Banner */}
      {showBanner && myProfile && !calculateProfileCompletion(myProfile).isComplete && (
        <View style={s.banner}>
          <TouchableOpacity style={s.bannerClose} onPress={() => setShowBanner(false)}>
            <Ionicons name="close" size={16} color={colors.ink} />
          </TouchableOpacity>
          <Text style={s.bannerTitle}>Complete your profile</Text>
          <Text style={s.bannerSub}>{calculateProfileCompletion(myProfile).missingText}</Text>
          <TouchableOpacity style={s.bannerBtn} onPress={() => router.push('/(settings)/edit-profile')}>
            <Text style={s.bannerBtnText}>Edit profile</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[s.separator]} />

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
          <>
            <Animated.View style={[s.cardOuter, { flex: 1, opacity: fadeIn }]}>
              
              <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
                <Pressable style={s.menuBackdrop} onPress={() => setMenuOpen(false)}>
                  <View style={s.menuBox}>
                    <TouchableOpacity style={s.menuItem} onPress={handleReport}>
                      <Text style={s.menuItemText}>Report</Text>
                    </TouchableOpacity>
                    <View style={s.menuDivider} />
                    <TouchableOpacity style={s.menuItem} onPress={handleBlock}>
                      <Text style={s.menuItemText}>Block</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Modal>

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
                    <Text style={s.pronouns}>{currentProfile.pronouns?.[0] || '-'}</Text>
                    <Text style={s.dot}> • </Text>
                    <Text style={s.active}>Active now</Text>
                  </View>
                </View>
                <View style={s.navBtns}>
                  <TouchableOpacity style={s.navBtn} onPress={handlePass}>
                    <Ionicons name="close" size={18} color={colors.ink} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.navBtn} onPress={() => setMenuOpen(true)}>
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
                      <Text style={{ color: '#9AA0B2' }}>No Photo</Text>
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
                      <Text style={s.infoItemText}>{currentProfile.age || '-'}</Text>
                    </View>
                    <View style={s.infoDivider} />
                    <View style={[s.infoItem, { paddingLeft: 12 }]}>
                      <Ionicons name="person-outline" size={16} color="#9AA0B2" />
                      <Text style={s.infoItemText}>{currentProfile.gender || '-'}</Text>
                    </View>
                  </View>
                  <View style={s.infoHorizDivider} />
                  <View style={s.infoRow}>
                    <View style={s.infoItem}>
                      <Ionicons name="location-outline" size={16} color="#9AA0B2" />
                      <Text style={s.infoItemText}>{currentProfile.location || '-'}</Text>
                    </View>
                    <View style={s.infoDivider} />
                    <View style={[s.infoItem, { paddingLeft: 12 }]}>
                      <Ionicons name="cash-outline" size={16} color="#9AA0B2" />
                      <Text style={s.infoItemText}>
                        {(currentProfile.budget_max || currentProfile.budget) ? `₹${currentProfile.budget_max || currentProfile.budget}/mo` : '-'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* First Prompt (White) */}
                <View style={s.promptWhite}>
                  <Text style={s.promptQ}>{currentProfile.prompts?.[0]?.q || '-'}</Text>
                  <Text style={s.promptA}>{currentProfile.prompts?.[0]?.a || '-'}</Text>
                  <TouchableOpacity style={s.promptHeartGray} activeOpacity={0.9} onPress={handleLike}>
                    <Ionicons name="heart" size={20} color="#C0C5D0" />
                  </TouchableOpacity>
                </View>

                {/* Flat Photo */}
                <View style={s.flatPhotoWrap}>
                  {currentProfile.photos?.[1] ? (
                    <Image source={{ uri: currentProfile.photos[1] }} style={s.flatPhoto} resizeMode="cover" />
                  ) : (
                    <View style={[s.flatPhoto, s.photoPlaceholder]}>
                      <Text style={{ color: '#9AA0B2' }}>No Flat Photo</Text>
                    </View>
                  )}
                  <View style={s.flatLabel}>
                    <Text style={s.flatLabelText}>Living Room</Text>
                  </View>
                </View>

                {/* Second Prompt (Accent) */}
                <View style={[s.promptAccent, { backgroundColor: '#F3EEFF' }]}>
                  <Text style={s.promptAccentQ}>{currentProfile.prompts?.[1]?.q || '-'}</Text>
                  <Text style={s.promptA}>{currentProfile.prompts?.[1]?.a || '-'}</Text>
                  <TouchableOpacity style={s.promptHeartViolet} activeOpacity={0.9} onPress={handleLike}>
                    <Ionicons name="heart" size={20} color={colors.violet} />
                  </TouchableOpacity>
                </View>

              </ScrollView>
            </Animated.View>
            <TouchableOpacity style={s.skipBtn} onPress={handlePass}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </>
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

  separator: { height: 1, backgroundColor: 'rgba(0,0,0,0.07)', marginHorizontal: -20 },

  banner: {
    margin: 12, backgroundColor: '#FDF5F0', borderRadius: 16,
    padding: 14, paddingRight: 30, position: 'relative',
  },
  bannerClose: { position: 'absolute', top: 10, right: 10, opacity: 0.4, padding: 4 },
  bannerTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink, marginBottom: 2 },
  bannerSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#9AA0B2', marginBottom: 10 },
  bannerBtn: {
    alignSelf: 'flex-start', backgroundColor: colors.ink,
    borderRadius: 50, paddingHorizontal: 20, paddingVertical: 9,
  },
  bannerBtnText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#fff' },

  feedContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 },

  skipBtn: {
    position: 'absolute', left: 22, bottom: 32,
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },

  menuBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
    paddingTop: 120, paddingRight: 20,
  },
  menuBox: {
    backgroundColor: '#fff', borderRadius: 14, minWidth: 160,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 4 },
    elevation: 8, overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  menuItemText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.ink },
  menuDivider: { height: 1, backgroundColor: '#F0F1F5' },

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
  photoPlaceholder: { backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },

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
