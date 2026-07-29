import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  useWindowDimensions,
  RefreshControl,
  Modal,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../../lib/ThemeContext';
import { getCurrentUserId } from '../../lib/auth';
import { getBlockedIds } from '../../lib/blocks';
import { error as logError, describeError } from '../../lib/log';
import { dismissLike, fetchIncomingLikes, sendLike } from '../../services/likeService';
import { fetchMatchedUserIds } from '../../services/matchService';
import { attachFlatDetails } from '../../services/profileService';
import ProfileViewSheet from '../../components/ProfileViewSheet';
import MatchCelebration from '../../components/MatchCelebration';
import { LikesGridSkeleton } from '../../components/Skeleton';
import { useRouter } from 'expo-router';

export default function LikesScreen() {
  const s = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Recomputed on rotation / web resize, unlike a module-scope Dimensions read.
  const { width } = useWindowDimensions();
  const cardW = (width - 32 - 12) / 2;

  const [likes, setLikes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  // Distinct from `refreshing`: this only covers the cold load, so a
  // pull-to-refresh keeps the existing cards on screen under the spinner
  // instead of collapsing them back into a skeleton.
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedLike, setSelectedLike] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [showBoost, setShowBoost] = useState(false);

  const fetchLikes = async () => {
    const uid = getCurrentUserId();
    if (!uid) {
      setInitialLoad(false);
      return;
    }
    setRefreshing(true);

    // All three are independent of each other.
    //
    // A mutual like that already turned into a match is never cleaned up from
    // `likes` server-side (RLS won't let this user delete the other person's
    // row), so matched users are filtered out here. Blocking is bidirectional;
    // without that filter a blocked user's like kept showing here even though
    // they were gone from feed and messages.
    const [{ data }, blocked, matchedUserIds] = await Promise.all([
      fetchIncomingLikes(uid),
      getBlockedIds(uid),
      fetchMatchedUserIds(uid),
    ]);

    const mapped = data
      .map((l) => ({ likeId: l.id, userId: l.from_user_id, profile: l.profiles }))
      .filter((l) => l.profile && !matchedUserIds.has(l.userId) && !blocked.has(l.userId));

    // Returns new profile objects rather than mutating the fetched rows in
    // place, which is what this used to do — in-place writes are visible
    // through every other reference to the same row.
    const profiles = await attachFlatDetails(mapped.map((l) => l.profile));
    setLikes(mapped.map((l, i) => ({ ...l, profile: profiles[i] })));

    setRefreshing(false);
    setInitialLoad(false);
  };

  useEffect(() => {
    fetchLikes();
  }, []);

  const handlePass = async (like) => {
    const target = like ?? selectedLike;
    if (!target) return;
    const { likeId } = target;
    setSelectedLike(null);
    setLikes((prev) => prev.filter((l) => l.likeId !== likeId));

    const { error } = await dismissLike(likeId);
    if (error) {
      logError('Failed to dismiss like', describeError(error));
      fetchLikes();
    }
  };

  const handleLikeBack = async () => {
    const uid = getCurrentUserId();
    if (!uid || !selectedLike) return;

    const targetId = selectedLike.userId;
    const profile = selectedLike.profile;

    setSelectedLike(null);
    setLikes((prev) => prev.filter((l) => l.userId !== targetId));

    const result = await sendLike(uid, targetId);

    if (result.error) {
      logError('Failed to like back', describeError(result.error));
      Alert.alert('Error', 'Failed to match');
      fetchLikes(); // put the card back — the optimistic removal was wrong
      return;
    }

    if (!result.ok) {
      // BEHAVIOUR CHANGE, flagged for product: liking back now spends from the
      // daily allowance, because the limit moved into like_profile() and that
      // function cannot tell a first like from a reciprocal one. Previously
      // this path inserted directly and was effectively unlimited. If
      // reciprocating should stay free, give like_profile a
      // "reciprocal" branch that skips the allowance when an active like from
      // the target already exists — do NOT re-add a client-side bypass.
      fetchLikes();
      Alert.alert("You're out of likes", 'You can like again tomorrow.');
      return;
    }

    // create_match_on_mutual_like fired on the insert, so liking back someone
    // who already liked you is always a match.
    setMatchData({ name: profile.name, photo: profile.photos?.[0] });
  };

  return (
    <View style={s.screen}>
      <View style={[s.topBar, { paddingTop: insets.top + 12 }]}>
        <Text style={s.title}>Likes You</Text>
        <TouchableOpacity
          style={s.boostBtn}
          activeOpacity={0.85}
          onPress={() => setShowBoost(true)}
        >
          <Ionicons name="flash" size={14} color="#fff" />
          <Text style={s.boostText}>Boost</Text>
        </TouchableOpacity>
      </View>

      {initialLoad ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <LikesGridSkeleton cardW={cardW} />
        </ScrollView>
      ) : likes.length === 0 ? (
        <ScrollView
          contentContainerStyle={[s.center, { flexGrow: 1 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchLikes}
              tintColor={colors.blue}
            />
          }
        >
          <Text style={s.emptyTitle}>{"Have patience —\nsomeone's checking you out"}</Text>
          <Text style={s.emptySub}>
            Your profile is out there. When someone likes you, they'll show up here.
          </Text>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.grid}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={fetchLikes}
                tintColor={colors.blue}
              />
            }
          >
            {likes.map((l) => (
              <TouchableOpacity
                key={l.likeId}
                style={[s.likeCard, { width: cardW }]}
                activeOpacity={0.85}
                onPress={() => setSelectedLike(l)}
              >
                <View style={[s.likePhotoWrap, { height: cardW * 1.25 }]}>
                  {l.profile?.photos?.[0] ? (
                    <Image
                      source={{ uri: l.profile.photos[0] }}
                      style={s.likePhoto}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[s.likePhoto, s.likePhotoPlaceholder]}>
                      <Ionicons name="person" size={32} color={colors.mist} />
                    </View>
                  )}
                </View>
                <View style={s.likeInfo}>
                  <Text style={s.likeName}>{l.profile?.name}</Text>
                  <Text style={s.likeTime}>Liked you</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ProfileViewSheet
        visible={!!selectedLike}
        profile={selectedLike?.profile}
        onClose={() => setSelectedLike(null)}
        onPass={handlePass}
        onLike={handleLikeBack}
      />

      <Modal
        visible={showBoost}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBoost(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalBox}>
            <View style={s.modalIcon}>
              <Ionicons name="flash" size={32} color="#fff" />
            </View>
            <Text style={s.modalTitle}>Boost your profile</Text>
            <Text style={s.modalSub}>
              Coming soon! Get pushed to the top of the feed so more people see you first.
            </Text>
            <TouchableOpacity style={s.modalBtn} onPress={() => setShowBoost(false)}>
              <Text style={s.modalBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

const makeStyles = (colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.canvas },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 14,
      backgroundColor: colors.header,
    },
    title: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 28,
      fontWeight: '800',
      color: colors.headerText,
      letterSpacing: -0.03 * 28,
    },
    boostBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: colors.blue,
      borderRadius: 50,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    boostText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, color: '#fff' },

    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
      paddingBottom: 24,
    },
    emptyTitle: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 22,
      fontWeight: '800',
      color: colors.ink,
      textAlign: 'center',
      letterSpacing: -0.44,
      marginTop: 4,
      marginBottom: 10,
      lineHeight: 28,
    },
    emptySub: {
      fontFamily: 'HankenGrotesk_400Regular',
      fontSize: 14,
      color: colors.placeholder,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 28,
    },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16, paddingBottom: 100 },
    likeCard: { borderRadius: 18, overflow: 'hidden', backgroundColor: colors.card },
    likePhotoWrap: { width: '100%', position: 'relative' },
    likePhoto: { width: '100%', height: '100%' },
    likePhotoPlaceholder: {
      backgroundColor: colors.canvas,
      alignItems: 'center',
      justifyContent: 'center',
    },
    likeInfo: { padding: 12 },
    likeName: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 15,
      color: colors.ink,
      marginBottom: 2,
    },
    likeTime: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: colors.placeholder },

    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalBox: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 24,
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
    },
    modalIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.blue,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 22,
      color: colors.ink,
      marginBottom: 8,
      textAlign: 'center',
    },
    modalSub: {
      fontFamily: 'HankenGrotesk_400Regular',
      fontSize: 15,
      color: colors.placeholder,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 22,
    },
    modalBtn: {
      backgroundColor: colors.blue,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 50,
      width: '100%',
      alignItems: 'center',
    },
    modalBtnText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: '#fff' },
  });
