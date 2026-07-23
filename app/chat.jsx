import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/auth';
import { colors } from '../lib/theme';
import { activeStatusText, isOnline } from '../lib/presence';

const GROUP_WINDOW_MS = 5 * 60 * 1000;

const formatTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const POLL_INTERVAL_MS = 3000;
const TYPING_TIMEOUT_MS = 3000;

export default function ChatScreen() {
  const { matchId, name: rawName, photo: rawPhoto } = useLocalSearchParams();
  const name = !rawName || rawName === 'null' ? 'User' : rawName;
  const photo = !rawPhoto || rawPhoto === 'null' ? null : rawPhoto;
  
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const uid = getCurrentUserId();
  const flatListRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [myPhoto, setMyPhoto] = useState(null);
  const [otherUserId, setOtherUserId] = useState(null);
  const [otherLastActive, setOtherLastActive] = useState(null);
  const [otherTyping, setOtherTyping] = useState(false);

  const channelRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!uid) return;
    supabase.from('profiles').select('photos').eq('id', uid).single()
      .then(({ data }) => setMyPhoto(data?.photos?.[0] ?? null));
  }, [uid]);

  // Resolve the other participant in this match, for presence lookups.
  useEffect(() => {
    if (!matchId || !uid) return;
    supabase.from('matches').select('user1_id, user2_id').eq('id', matchId).single()
      .then(({ data }) => {
        if (!data) return;
        setOtherUserId(data.user1_id === uid ? data.user2_id : data.user1_id);
      });
  }, [matchId, uid]);

  const fetchOtherPresence = async () => {
    if (!otherUserId) return;
    const { data } = await supabase.from('profiles').select('last_active_at').eq('id', otherUserId).single();
    if (data) setOtherLastActive(data.last_active_at);
  };

  useEffect(() => {
    if (!otherUserId) return;
    fetchOtherPresence();
    const interval = setInterval(fetchOtherPresence, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [otherUserId]);

  useEffect(() => {
    if (!matchId || !uid) return;
    fetchMessages();
    markAsRead();

    const channel = supabase
      .channel(`room:${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`
      }, (payload) => {
        // own messages are added optimistically in sendMessage and reconciled there
        if (payload.new.sender_id === uid) return;

        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });

        markAsRead();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`
      }, (payload) => {
        // payload.new may only contain changed columns + id (no REPLICA IDENTITY FULL),
        // so merge instead of replacing the whole message object.
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.senderId === uid) return;
        setOtherTyping(true);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), TYPING_TIMEOUT_MS);
      })
      .subscribe();

    channelRef.current = channel;

    // Fallback poll: realtime delivery can be delayed/dropped, so periodically
    // re-fetch and merge in anything missing while the user stays on screen.
    const pollInterval = setInterval(() => {
      pollNewMessages();
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(typingTimeoutRef.current);
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [matchId, uid]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
    }
    setLoading(false);
  };

  const pollNewMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });
    if (!data) return;

    setMessages(prev => {
      const pendingOptimistic = prev.filter(m => typeof m.id === 'string' && m.id.startsWith('temp-'));
      return [...data, ...pendingOptimistic];
    });

    if (data.some(m => m.sender_id !== uid && !m.read)) {
      markAsRead();
    }
  };

  const markAsRead = async () => {
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('match_id', matchId)
      .neq('sender_id', uid)
      .eq('read', false);
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;

    setInputText('');

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      match_id: matchId,
      sender_id: uid,
      content: text,
      read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    const { data, error } = await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: uid,
      content: text,
      read: false
    }).select().single();

    if (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputText(text);
      return;
    }

    setMessages(prev => prev.map(m => m.id === tempId ? data : m));
  };

  const handleInputChange = (text) => {
    setInputText(text);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { senderId: uid },
    });
  };

  const renderItem = ({ item, index }) => {
    const isMine = item.sender_id === uid;
    const next = messages[index + 1];
    // last message in a run of consecutive messages from the same sender
    // (within a short time window) — that's the only one that gets an avatar/timestamp
    const isLastInGroup = !next
      || next.sender_id !== item.sender_id
      || new Date(next.created_at) - new Date(item.created_at) > GROUP_WINDOW_MS;

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
      <View style={[s.msgWrapper, isMine ? s.msgRight : s.msgLeft, !isLastInGroup && s.msgWrapperGrouped]}>
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
  };

  return (
    <KeyboardAvoidingView 
      style={[s.screen, { paddingTop: insets.top }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/messages')} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <View style={s.headerInfo}>
          {photo ? (
            <Image source={{ uri: photo }} style={s.headerAvatar} />
          ) : (
            <View style={[s.headerAvatar, { backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', color: '#64748B' }}>{name?.charAt(0)}</Text>
            </View>
          )}
          <View>
            <Text style={s.headerName}>{name}</Text>
            <Text style={[s.headerStatus, !otherTyping && isOnline(otherLastActive) && s.headerStatusOnline]}>
              {otherTyping ? 'Typing…' : activeStatusText(otherLastActive)}
            </Text>
          </View>
        </View>
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
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={[s.inputWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={s.input}
          placeholder="Message..."
          placeholderTextColor="#9AA0B2"
          value={inputText}
          onChangeText={handleInputChange}
          maxLength={500}
        />
        <TouchableOpacity 
          style={[s.sendBtn, !inputText.trim() && s.sendBtnDisabled]} 
          onPress={sendMessage}
          disabled={!inputText.trim()}
          activeOpacity={0.8}
        >
          <Ionicons name="send" size={16} color="#fff" style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F1F5', zIndex: 10 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: colors.ink },
  headerStatus: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: colors.slate, marginTop: 1 },
  headerStatusOnline: { color: colors.success },
  
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  list: { flex: 1, minHeight: 0 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 32, paddingBottom: 24, gap: 6 },
  emptyTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: colors.ink, textAlign: 'center' },
  emptyText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.slate, textAlign: 'center', lineHeight: 20 },

  listContent: { padding: 16, paddingBottom: 8, flexGrow: 1, justifyContent: 'flex-end' },
  msgWrapper: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgWrapperGrouped: { marginBottom: 2 },
  msgRight: { justifyContent: 'flex-end' },
  msgLeft: { justifyContent: 'flex-start' },
  msgColLeft: { alignItems: 'flex-start', marginLeft: 8, maxWidth: '75%' },
  msgColRight: { alignItems: 'flex-end', marginRight: 8, maxWidth: '75%' },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarFallback: { backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12, color: '#64748B' },
  msgBubble: { maxWidth: '100%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  bubbleRight: { backgroundColor: colors.blue, borderBottomRightRadius: 4 },
  bubbleLeft: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#EDEEF2' },
  msgText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, lineHeight: 22 },
  textRight: { color: '#fff' },
  textLeft: { color: colors.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  timestamp: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 11, color: colors.slate },

  inputWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F1F5' },
  input: { flex: 1, height: 44, backgroundColor: '#F2F3F7', borderRadius: 22, paddingHorizontal: 16, fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.ink },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginBottom: 0 },
  sendBtnDisabled: { backgroundColor: '#D0D4DF' },
});
