import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme, useThemedStyles } from '../../lib/ThemeContext';
import { getCurrentUserId } from '../../lib/auth';
import { getBlockedIds } from '../../lib/blocks';
import { isOnline } from '../../lib/presence';
import { error as logError, describeError } from '../../lib/log';
import { fetchMatchesWithLatestMessage } from '../../services/matchService';
import { fetchProfileSummaries } from '../../services/profileService';
import { MessagesListSkeleton } from '../../components/Skeleton';

const Avatar = ({ photo, name, size = 48, online }) => {
  const { colors } = useTheme();
  const initials = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <View style={{ position: 'relative' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: colors.canvas,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Text
            style={{
              fontFamily: 'SpaceGrotesk_700Bold',
              fontSize: size * 0.38,
              color: colors.slate,
            }}
          >
            {initials}
          </Text>
        )}
      </View>
      {online && (
        <View
          style={{
            position: 'absolute',
            bottom: 1,
            right: 1,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: colors.success,
            borderWidth: 2,
            borderColor: colors.card,
          }}
        />
      )}
    </View>
  );
};

export default function MessagesScreen() {
  const s = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [newMatches, setNewMatches] = useState([]);
  const [yourTurn, setYourTurn] = useState([]);
  const [theirTurn, setTheirTurn] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bumped on every fetch. A slow response from an earlier run must not
  // overwrite a newer one — refocusing the tab twice in quick succession used
  // to leave whichever request happened to land last in charge, regardless of
  // which was issued last.
  const requestSeq = useRef(0);

  const fetchMessages = useCallback(async () => {
    const uid = getCurrentUserId();
    if (!uid) {
      // Otherwise `loading` never clears and the skeleton pulses forever.
      setLoading(false);
      return;
    }

    const seq = ++requestSeq.current;
    const isCurrent = () => seq === requestSeq.current;

    setRefreshing(true);

    const finish = (next) => {
      if (!isCurrent()) return;
      setNewMatches(next.newMatches);
      setYourTurn(next.yourTurn);
      setTheirTurn(next.theirTurn);
      setLoading(false);
      setRefreshing(false);
    };

    const empty = { newMatches: [], yourTurn: [], theirTurn: [] };

    // Independent of each other, so no reason to serialise them.
    const [blocked, { data: matchesData, error: matchesError }] = await Promise.all([
      getBlockedIds(uid),
      fetchMatchesWithLatestMessage(uid),
    ]);

    if (matchesError) {
      if (!isCurrent()) return;
      logError('Failed to fetch matches', describeError(matchesError));
      setError('Failed to load messages. Please try again.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (isCurrent()) setError(null);

    if (matchesData.length === 0) return finish(empty);

    const validMatches = matchesData
      .map((m) => ({ ...m, otherId: m.user1_id === uid ? m.user2_id : m.user1_id }))
      .filter((m) => !blocked.has(m.otherId));

    if (validMatches.length === 0) return finish(empty);

    const profileMap = await fetchProfileSummaries(validMatches.map((m) => m.otherId));

    const buckets = { newMatches: [], yourTurn: [], theirTurn: [] };

    validMatches.forEach((m) => {
      const profile = profileMap.get(m.otherId);
      if (!profile) return; // shouldn't happen, but safe

      // The embed is ordered newest-first and capped at 1, so index 0 is the
      // latest message (or the array is empty for a match with no messages).
      const lastMsg = (m.messages || [])[0] ?? null;

      const matchObj = {
        id: m.id,
        name: profile.name || 'User',
        photo: Array.isArray(profile.photos) ? profile.photos[0] : null,
        lastMsg: lastMsg ? lastMsg.content : 'Say hi!',
        hasNewMsg: lastMsg ? !lastMsg.read && lastMsg.sender_id !== uid : true,
        online: isOnline(profile.last_active_at),
        lastActivity: lastMsg ? new Date(lastMsg.created_at).getTime() : 0,
      };

      if (!lastMsg) buckets.newMatches.push(matchObj);
      else if (lastMsg.sender_id !== uid) buckets.yourTurn.push(matchObj);
      else buckets.theirTurn.push(matchObj);
    });

    buckets.yourTurn.sort((a, b) => b.lastActivity - a.lastActivity);
    buckets.theirTurn.sort((a, b) => b.lastActivity - a.lastActivity);

    finish(buckets);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMessages();
      // Blurring the tab invalidates whatever is in flight, so a response that
      // lands after the user has left can't write into an unmounted screen.
      return () => {
        requestSeq.current += 1;
      };
    }, [fetchMessages]),
  );

  const isEmpty = newMatches.length === 0 && yourTurn.length === 0 && theirTurn.length === 0;

  const openChat = (m) => {
    router.push({
      pathname: '/chat',
      params: { matchId: m.id, name: m.name, photo: m.photo },
    });
  };

  return (
    <View style={s.screen}>
      <View style={[s.topBar, { paddingTop: insets.top + 12 }]}>
        <Text style={s.title}>Messages</Text>
        <TouchableOpacity
          style={s.bellBtn}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/notifications')}
        >
          <Ionicons name="notifications-outline" size={18} color={colors.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.whiteCard}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchMessages}
            tintColor={colors.blue}
          />
        }
      >
        {loading ? (
          // `loading` is only ever set true on mount, so the refetch that runs
          // on every screen focus keeps the existing rows up instead of
          // flashing back to a skeleton.
          <MessagesListSkeleton />
        ) : error && isEmpty ? (
          // `error` was set on every failed fetch but never rendered, so a
          // failure was indistinguishable from having no matches at all.
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Couldn&apos;t load messages</Text>
            <Text style={s.emptyText}>{error}</Text>
            <TouchableOpacity onPress={fetchMessages} activeOpacity={0.8} style={s.retryBtn}>
              <Text style={s.retryBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : isEmpty ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No matches yet</Text>
            <Text style={s.emptyText}>
              Keep swiping — when you match with someone, they'll show up here.
            </Text>
          </View>
        ) : (
          <>
            {newMatches.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHead}>
                  <Text style={s.sectionTitle}>New Matches</Text>
                  <Text style={s.sectionCount}>{newMatches.length} new</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 16, paddingBottom: 18 }}
                >
                  {newMatches.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={s.newMatchItem}
                      onPress={() => openChat(m)}
                      activeOpacity={0.8}
                    >
                      <Avatar photo={m.photo} name={m.name} size={60} />
                      <Text style={s.newMatchName}>{m.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={s.divider} />
              </View>
            )}

            {yourTurn.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHead}>
                  <Text style={s.sectionTitle}>Your turn ({yourTurn.length})</Text>
                </View>
                {yourTurn.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={s.chatRow}
                    onPress={() => openChat(m)}
                    activeOpacity={0.8}
                  >
                    <Avatar photo={m.photo} name={m.name} online={m.online} />
                    <View style={s.chatInfo}>
                      <View style={s.chatNameRow}>
                        <Text style={s.chatName}>{m.name}</Text>
                        {m.hasNewMsg && <View style={s.newMsgDot} />}
                      </View>
                      <Text style={[s.chatMsg, m.hasNewMsg && s.chatMsgUnread]} numberOfLines={1}>
                        {m.lastMsg}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#C0C5D0" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {theirTurn.length > 0 && (
              <View style={[s.section, { paddingTop: 10 }]}>
                <View style={s.sectionHead}>
                  <Text style={s.sectionTitle}>Their turn ({theirTurn.length})</Text>
                </View>
                {theirTurn.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={s.chatRow}
                    onPress={() => openChat(m)}
                    activeOpacity={0.8}
                  >
                    <Avatar photo={m.photo} name={m.name} online={m.online} />
                    <View style={s.chatInfo}>
                      <View style={s.chatNameRow}>
                        <Text style={s.chatName}>{m.name}</Text>
                        {m.hasNewMsg && <View style={s.newMsgDot} />}
                      </View>
                      <Text
                        style={[s.chatMsg, { color: '#9AA0B2' }, m.hasNewMsg && s.chatMsgUnread]}
                        numberOfLines={1}
                      >
                        {m.lastMsg}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#C0C5D0" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
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
      paddingBottom: 12,
      backgroundColor: colors.header,
    },
    title: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 28,
      fontWeight: '800',
      color: colors.headerText,
      letterSpacing: -0.03 * 28,
    },
    bellBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
      position: 'relative',
    },
    bellDot: {
      position: 'absolute',
      top: 7,
      right: 7,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#FF4D6A',
      borderWidth: 2,
      borderColor: colors.canvas,
    },

    whiteCard: { flex: 1, backgroundColor: colors.canvas },

    // flex:1 against the ScrollView's flexGrow:1 content container, so the
    // message centres in the viewport instead of hanging off a fixed top pad.
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 8,
    },
    emptyTitle: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 18,
      color: colors.ink,
      textAlign: 'center',
    },
    emptyText: {
      fontFamily: 'HankenGrotesk_400Regular',
      fontSize: 14,
      color: colors.placeholder,
      textAlign: 'center',
      lineHeight: 20,
    },
    retryBtn: {
      marginTop: 10,
      backgroundColor: colors.blue,
      borderRadius: 50,
      paddingHorizontal: 24,
      paddingVertical: 10,
    },
    retryBtnText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: '#fff' },

    section: { paddingHorizontal: 20, paddingTop: 18 },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    sectionTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: colors.ink },
    sectionCount: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: colors.blue },
    divider: { height: 1, backgroundColor: colors.mist, marginTop: 6 },

    newMatchItem: { alignItems: 'center', gap: 6 },
    newMatchName: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 11, color: colors.ink },

    chatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    chatInfo: { flex: 1, minWidth: 0 },
    chatNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
    chatName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: colors.ink },
    chatMsg: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink },
    chatMsgUnread: { color: colors.ink, fontFamily: 'HankenGrotesk_700Bold' },
    newMsgDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4D6A' },
  });
