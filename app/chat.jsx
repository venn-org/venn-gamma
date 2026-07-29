import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUserId } from '../lib/auth';
import { useTheme, useThemedStyles } from '../lib/ThemeContext';
import { activeStatusText, isOnline } from '../lib/presence';
import { INTERVALS, LIMITS } from '../config/flags';
import { error as logError, describeError } from '../lib/log';
import {
  broadcastTyping,
  fetchMessagesSince,
  fetchRecentMessages,
  markMessagesRead,
  sendMessage as sendMessageRequest,
  subscribeToMatch,
} from '../services/messageService';
import { fetchOtherParticipantId } from '../services/matchService';
import { fetchLastActiveAt } from '../services/presenceService';
import { fetchMyProfile, fetchProfileById, attachFlatDetails } from '../services/profileService';
import ProfileViewSheet from '../components/ProfileViewSheet';
import MessageComposer from '../components/chat/MessageComposer';

const GROUP_WINDOW_MS = 5 * 60 * 1000;

const formatTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

// How long the receiver holds "Typing…" after each broadcast. The composer
// pings on a shorter interval so the indicator never lapses mid-sentence.
const TYPING_TIMEOUT_MS = 3000;

const isOptimistic = (m) => typeof m.id === 'string' && m.id.startsWith('temp-');

/**
 * Merge server rows into the current list without disturbing optimistic ones.
 *
 * Server rows win on id collisions (they carry the real id and timestamps);
 * pending optimistic messages are appended at the end, where they were
 * rendered before the round-trip completed.
 */
function mergeMessages(previous, incoming) {
  const byId = new Map();
  for (const m of previous) {
    if (!isOptimistic(m)) byId.set(m.id, m);
  }
  for (const m of incoming) {
    byId.set(m.id, { ...byId.get(m.id), ...m });
  }

  const merged = [...byId.values()].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return [...merged, ...previous.filter(isOptimistic)];
}

export default function ChatScreen() {
  const s = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { matchId, name: rawName, photo: rawPhoto } = useLocalSearchParams();
  const name = !rawName || rawName === 'null' ? 'User' : rawName;
  const photo = !rawPhoto || rawPhoto === 'null' ? null : rawPhoto;

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const uid = getCurrentUserId();
  const flatListRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myPhoto, setMyPhoto] = useState(null);
  const [otherUserId, setOtherUserId] = useState(null);
  const [otherLastActive, setOtherLastActive] = useState(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherProfile, setOtherProfile] = useState(null);
  const [profileVisible, setProfileVisible] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // The bottom safe-area inset only needs padding while the keyboard is
  // closed — keeping it once the keyboard is up leaves a visible strip of
  // empty space between the input bar and the top of the keyboard.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const channelRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!uid) return;
    fetchMyProfile(uid).then((data) => {
      if (!cancelled) setMyPhoto(data?.photos?.[0] ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Resolve the other participant in this match, for presence lookups.
  useEffect(() => {
    let cancelled = false;
    if (!matchId || !uid) return;
    fetchOtherParticipantId(matchId, uid).then((id) => {
      if (!cancelled && id) setOtherUserId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [matchId, uid]);

  // Fetched on demand rather than up front — most chat visits never open the
  // profile sheet, and this is one more query per visit otherwise.
  const openOtherProfile = async () => {
    if (!otherUserId) return;
    setProfileVisible(true);
    if (otherProfile) return;

    const data = await fetchProfileById(otherUserId);
    if (!data) return;

    const [withFlat] = await attachFlatDetails([data]);
    setOtherProfile(withFlat);
  };

  // Other participant's presence. Paused while the app is backgrounded — a
  // suspended chat has nobody reading the "Active now" line, and on web the
  // timer would keep polling a hidden tab indefinitely.
  useEffect(() => {
    if (!otherUserId) return;
    let cancelled = false;
    let interval = null;

    const refresh = async () => {
      const lastActive = await fetchLastActiveAt(otherUserId);
      if (!cancelled && lastActive) setOtherLastActive(lastActive);
    };

    const start = () => {
      if (interval) return;
      refresh();
      interval = setInterval(refresh, INTERVALS.chatPresencePollMs);
    };
    const stop = () => {
      if (!interval) return;
      clearInterval(interval);
      interval = null;
    };

    start();
    const sub = AppState.addEventListener('change', (s) => (s === 'active' ? start() : stop()));

    return () => {
      cancelled = true;
      stop();
      sub.remove();
    };
  }, [otherUserId]);

  // Newest server-confirmed timestamp, so the fallback poll can ask for
  // "anything since this" instead of re-downloading the conversation.
  const lastSyncedAtRef = useRef(null);

  const noteSynced = useCallback((rows) => {
    for (const m of rows) {
      if (!m?.created_at) continue;
      if (!lastSyncedAtRef.current || m.created_at > lastSyncedAtRef.current) {
        lastSyncedAtRef.current = m.created_at;
      }
    }
  }, []);

  const markAsRead = useCallback(() => markMessagesRead(matchId, uid), [matchId, uid]);

  useEffect(() => {
    if (!matchId || !uid) return;

    let cancelled = false;
    lastSyncedAtRef.current = null;

    const loadInitial = async () => {
      const { data } = await fetchRecentMessages(matchId, LIMITS.chatInitialMessages);
      if (cancelled) return;
      noteSynced(data);
      setMessages(data);
      setLoading(false);
      if (data.some((m) => m.sender_id !== uid && !m.read)) markAsRead();
    };

    loadInitial();

    const unsubscribe = subscribeToMatch(matchId, {
      onReady: (channel) => {
        channelRef.current = channel;
      },
      onInsert: (row) => {
        // Own messages are added optimistically in sendMessage and reconciled
        // there, so echoing them back here would render a duplicate.
        if (row.sender_id === uid) return;
        noteSynced([row]);
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        markAsRead();
      },
      onUpdate: (row) => {
        // `row` may carry only the changed columns plus the id (the table has
        // no REPLICA IDENTITY FULL), so merge rather than replace.
        setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, ...row } : m)));
      },
      onTyping: (payload) => {
        if (payload?.senderId === uid) return;
        setOtherTyping(true);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), TYPING_TIMEOUT_MS);
      },
    });

    // Fallback poll for realtime delivery that was delayed or dropped.
    //
    // This used to refetch the entire conversation — `select('*')`, no limit —
    // every 10 seconds for as long as the chat stayed open, so a long thread
    // moved its whole history six times a minute. It now asks only for rows
    // newer than the last one it saw, which is almost always zero rows.
    // Paused while backgrounded, where realtime reconnect covers the gap.
    let pollInterval = null;

    const pollNewMessages = async () => {
      const { data } = await fetchMessagesSince(matchId, lastSyncedAtRef.current);
      if (cancelled || data.length === 0) return;
      noteSynced(data);
      setMessages((prev) => mergeMessages(prev, data));
      if (data.some((m) => m.sender_id !== uid && !m.read)) markAsRead();
    };

    const startPolling = () => {
      if (pollInterval) return;
      pollInterval = setInterval(pollNewMessages, INTERVALS.chatPollMs);
    };
    const stopPolling = () => {
      if (!pollInterval) return;
      clearInterval(pollInterval);
      pollInterval = null;
    };

    startPolling();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        pollNewMessages();
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      cancelled = true;
      stopPolling();
      appSub.remove();
      clearTimeout(typingTimeoutRef.current);
      channelRef.current = null;
      unsubscribe();
    };
  }, [matchId, uid, markAsRead, noteSynced]);

  /**
   * `restoreDraft` is handed back by the composer, which cleared its own input
   * optimistically — a failed send puts the text back where the user left it
   * instead of losing it.
   */
  const sendMessage = useCallback(
    async (text, restoreDraft) => {
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg = {
        id: tempId,
        match_id: matchId,
        sender_id: uid,
        content: text,
        read: false,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      const { data, error } = await sendMessageRequest(matchId, uid, text);

      if (error) {
        logError('Failed to send message', describeError(error));
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        restoreDraft?.();
        return;
      }

      noteSynced([data]);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
    },
    [matchId, uid, noteSynced],
  );

  const handleTypingPing = useCallback(() => {
    broadcastTyping(channelRef.current, uid);
  }, [uid]);

  const renderItem = useCallback(
    ({ item, index }) => {
      const isMine = item.sender_id === uid;
      const next = messages[index + 1];
      // last message in a run of consecutive messages from the same sender
      // (within a short time window) — that's the only one that gets an avatar/timestamp
      const isLastInGroup =
        !next ||
        next.sender_id !== item.sender_id ||
        new Date(next.created_at) - new Date(item.created_at) > GROUP_WINDOW_MS;

      const avatarUri = isMine ? myPhoto : photo;
      const avatarInitial = isMine ? '' : name?.charAt(0);

      const avatarEl = avatarUri ? (
        <Image source={{ uri: avatarUri }} style={s.avatar} />
      ) : (
        <View style={[s.avatar, s.avatarFallback]}>
          <Text style={s.avatarFallbackText}>{avatarInitial}</Text>
        </View>
      );

      return (
        <View
          style={[
            s.msgWrapper,
            isMine ? s.msgRight : s.msgLeft,
            !isLastInGroup && s.msgWrapperGrouped,
          ]}
        >
          {!isMine && (isLastInGroup ? avatarEl : <View style={s.avatar} />)}
          <View style={isMine ? s.msgColRight : s.msgColLeft}>
            <View style={[s.msgBubble, isMine ? s.bubbleRight : s.bubbleLeft]}>
              <Text style={[s.msgText, isMine ? s.textRight : s.textLeft]}>{item.content}</Text>
            </View>
            {isLastInGroup && (
              <View style={s.metaRow}>
                <Text style={s.timestamp}>{formatTime(item.created_at)}</Text>
                {isMine && (
                  <Ionicons
                    name={item.read ? 'checkmark-done' : 'checkmark'}
                    size={14}
                    color={item.read ? colors.blue : '#9AA0B2'}
                  />
                )}
              </View>
            )}
          </View>
          {isMine && (isLastInGroup ? avatarEl : <View style={s.avatar} />)}
        </View>
      );
    },
    [messages, uid, myPhoto, photo, name, s, colors],
  );

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/messages'))}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.headerInfo}
          onPress={openOtherProfile}
          disabled={!otherUserId}
          activeOpacity={0.7}
        >
          {photo ? (
            <Image source={{ uri: photo }} style={s.headerAvatar} />
          ) : (
            <View
              style={[
                s.headerAvatar,
                {
                  backgroundColor: colors.avatarFallback,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
            >
              <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', color: '#64748B' }}>
                {name?.charAt(0)}
              </Text>
            </View>
          )}
          <View>
            <Text style={s.headerName}>{name}</Text>
            <Text
              style={[
                s.headerStatus,
                !otherTyping && isOnline(otherLastActive) && s.headerStatusOnline,
              ]}
            >
              {otherTyping ? 'Typing…' : activeStatusText(otherLastActive)}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.viewProfileBtn}
          onPress={openOtherProfile}
          disabled={!otherUserId}
          activeOpacity={0.7}
          accessibilityLabel={`View ${name}'s profile`}
        >
          <Ionicons name="person-circle-outline" size={26} color={colors.headerText} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator size="small" color={colors.blue} />
        </View>
      ) : messages.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Say hi to {name} 👋</Text>
          <Text style={s.emptyText}>You matched — break the ice and start the conversation.</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          style={s.list}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        />
      )}

      <MessageComposer
        onSend={sendMessage}
        onTypingPing={handleTypingPing}
        bottomPad={keyboardOpen ? 12 : Math.max(insets.bottom, 12)}
      />

      {/* Already matched, so pass/like would be meaningless here. */}
      <ProfileViewSheet
        visible={profileVisible && !!otherProfile}
        profile={otherProfile}
        showActions={false}
        onClose={() => setProfileVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.canvas },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: colors.header,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      zIndex: 10,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    viewProfileBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerAvatar: { width: 36, height: 36, borderRadius: 18 },
    headerName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: colors.headerText },
    headerStatus: {
      fontFamily: 'HankenGrotesk_400Regular',
      fontSize: 12,
      color: colors.slate,
      marginTop: 1,
    },
    headerStatusOnline: { color: colors.success },

    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    list: { flex: 1, minHeight: 0 },

    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingHorizontal: 32,
      paddingBottom: 24,
      gap: 6,
    },
    emptyTitle: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 17,
      color: colors.ink,
      textAlign: 'center',
    },
    emptyText: {
      fontFamily: 'HankenGrotesk_400Regular',
      fontSize: 14,
      color: colors.slate,
      textAlign: 'center',
      lineHeight: 20,
    },

    listContent: { padding: 16, paddingBottom: 8, flexGrow: 1, justifyContent: 'flex-end' },
    msgWrapper: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
    msgWrapperGrouped: { marginBottom: 2 },
    msgRight: { justifyContent: 'flex-end' },
    msgLeft: { justifyContent: 'flex-start' },
    msgColLeft: { alignItems: 'flex-start', marginLeft: 8, maxWidth: '75%' },
    msgColRight: { alignItems: 'flex-end', marginRight: 8, maxWidth: '75%' },
    avatar: { width: 28, height: 28, borderRadius: 14 },
    avatarFallback: {
      backgroundColor: colors.avatarFallback,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarFallbackText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12, color: '#64748B' },
    msgBubble: { maxWidth: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
    bubbleRight: { backgroundColor: colors.blue, borderBottomRightRadius: 4 },
    bubbleLeft: {
      backgroundColor: colors.card,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    msgText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, lineHeight: 22 },
    textRight: { color: '#fff' },
    textLeft: { color: colors.ink },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    timestamp: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 11, color: colors.slate },
  });
