import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/auth';
import { colors } from '../lib/theme';

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
        setMessages(prev => {
          // ensure no duplicates
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        
        // mark as read if it's from the other person
        if (payload.new.sender_id !== uid) {
          markAsRead();
        }
      })
      .subscribe();

    return () => {
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
    
    const { error } = await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: uid,
      content: text,
      read: false
    });
    
    if (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderItem = ({ item }) => {
    const isMine = item.sender_id === uid;
    
    return (
      <View style={[s.msgWrapper, isMine ? s.msgRight : s.msgLeft]}>
        {!isMine && photo ? (
          <Image source={{ uri: photo }} style={s.avatar} />
        ) : null}
        <View style={[s.msgBubble, isMine ? s.bubbleRight : s.bubbleLeft]}>
          <Text style={[s.msgText, isMine ? s.textRight : s.textLeft]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[s.screen, { paddingTop: insets.top }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
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
          <Text style={s.headerName}>{name}</Text>
        </View>
        <View style={s.backBtn} />
      </View>

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator size="small" color={colors.blue} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
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
          onChangeText={setInputText}
          multiline
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
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F1F5', zIndex: 10 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: colors.ink },
  
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  listContent: { padding: 16, paddingBottom: 24, flexGrow: 1 },
  msgWrapper: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgRight: { justifyContent: 'flex-end' },
  msgLeft: { justifyContent: 'flex-start' },
  avatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  msgBubble: { maxWidth: '75%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  bubbleRight: { backgroundColor: colors.blue, borderBottomRightRadius: 4 },
  bubbleLeft: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#EDEEF2' },
  msgText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, lineHeight: 22 },
  textRight: { color: '#fff' },
  textLeft: { color: colors.ink },
  
  inputWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F1F5' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: '#F2F3F7', borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.ink },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginBottom: 0 },
  sendBtnDisabled: { backgroundColor: '#D0D4DF' },
});
