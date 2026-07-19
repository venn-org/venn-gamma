import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { getCurrentUserId } from '../../lib/auth';
import { getBlockedIds } from '../../lib/blocks';

const Avatar = ({ photo, name, size = 48, online }) => {
  const initials = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <View style={{ position: 'relative' }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }}>
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: size * 0.38, color: colors.slate }}>{initials}</Text>
        )}
      </View>
      {online && (
        <View style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#fff' }} />
      )}
    </View>
  );
};

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [refreshing, setRefreshing] = useState(false);
  const [newMatches, setNewMatches] = useState([]);
  const [yourTurn, setYourTurn] = useState([]);
  const [theirTurn, setTheirTurn] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    const uid = getCurrentUserId();
    if (!uid) return;
    setRefreshing(true);
    
    const blocked = await getBlockedIds(uid);

    // Fetch matches with messages
    const { data: matchesData, error } = await supabase
      .from('matches')
      .select(`
        id, user1_id, user2_id,
        messages(id, content, sender_id, read, created_at)
      `)
      .or(`user1_id.eq.${uid},user2_id.eq.${uid}`);

    if (error) {
      console.error('Error fetching matches:', error);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!matchesData || matchesData.length === 0) {
      setNewMatches([]);
      setYourTurn([]);
      setTheirTurn([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Determine the "other" user for each match
    const otherUserIds = [];
    const validMatches = [];
    
    matchesData.forEach(m => {
      const otherId = m.user1_id === uid ? m.user2_id : m.user1_id;
      if (!blocked.has(otherId)) {
        otherUserIds.push(otherId);
        validMatches.push({ ...m, otherId });
      }
    });

    if (otherUserIds.length === 0) {
      setNewMatches([]);
      setYourTurn([]);
      setTheirTurn([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Fetch profiles for the other users
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, name, photos')
      .in('id', otherUserIds);

    const profileMap = {};
    if (profilesData) {
      profilesData.forEach(p => {
        profileMap[p.id] = p;
      });
    }

    const _newMatches = [];
    const _yourTurn = [];
    const _theirTurn = [];

    validMatches.forEach(m => {
      const profile = profileMap[m.otherId];
      if (!profile) return; // shouldn't happen, but safe

      const msgs = m.messages || [];
      msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

      const matchObj = {
        id: m.id,
        name: profile.name || 'User',
        photo: Array.isArray(profile.photos) ? profile.photos[0] : null,
        lastMsg: lastMsg ? lastMsg.content : 'Say hi!',
        hasNewMsg: lastMsg ? (!lastMsg.read && lastMsg.sender_id !== uid) : true,
        online: false, // mock
        lastActivity: lastMsg ? new Date(lastMsg.created_at).getTime() : 0,
      };

      if (!lastMsg) {
        _newMatches.push(matchObj);
      } else if (lastMsg.sender_id !== uid) {
        _yourTurn.push(matchObj);
      } else {
        _theirTurn.push(matchObj);
      }
    });

    // Sort by recent activity
    _yourTurn.sort((a, b) => b.lastActivity - a.lastActivity);
    _theirTurn.sort((a, b) => b.lastActivity - a.lastActivity);

    setNewMatches(_newMatches);
    setYourTurn(_yourTurn);
    setTheirTurn(_theirTurn);
    
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchMessages();
    }, [])
  );

  const isEmpty = newMatches.length === 0 && yourTurn.length === 0 && theirTurn.length === 0;

  const openChat = (m) => {
    router.push({
      pathname: '/chat',
      params: { matchId: m.id, name: m.name, photo: m.photo }
    });
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top + 12 }]}>
      <View style={s.topBar}>
        <Text style={s.title}>Messages</Text>
        <TouchableOpacity style={s.bellBtn} activeOpacity={0.8} onPress={() => router.push('/(tabs)/notifications')}>
          <Ionicons name="notifications-outline" size={18} color={colors.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.whiteCard}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchMessages} tintColor={colors.blue} />}
      >
        {loading ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>Loading...</Text>
          </View>
        ) : isEmpty ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No matches yet</Text>
            <Text style={s.emptyText}>Keep swiping — when you match with someone, they'll show up here.</Text>
          </View>
        ) : (
          <>
            {newMatches.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHead}>
                  <Text style={s.sectionTitle}>New Matches</Text>
                  <Text style={s.sectionCount}>{newMatches.length} new</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 18 }}>
                  {newMatches.map(m => (
                    <TouchableOpacity key={m.id} style={s.newMatchItem} onPress={() => openChat(m)} activeOpacity={0.8}>
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
                {yourTurn.map(m => (
                  <TouchableOpacity key={m.id} style={s.chatRow} onPress={() => openChat(m)} activeOpacity={0.8}>
                    <Avatar photo={m.photo} name={m.name} online={m.online} />
                    <View style={s.chatInfo}>
                      <View style={s.chatNameRow}>
                        <Text style={s.chatName}>{m.name}</Text>
                        {m.hasNewMsg && <View style={s.newMsgDot} />}
                      </View>
                      <Text style={[s.chatMsg, m.hasNewMsg && s.chatMsgUnread]} numberOfLines={1}>{m.lastMsg}</Text>
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
                {theirTurn.map(m => (
                  <TouchableOpacity key={m.id} style={s.chatRow} onPress={() => openChat(m)} activeOpacity={0.8}>
                    <Avatar photo={m.photo} name={m.name} online={m.online} />
                    <View style={s.chatInfo}>
                      <View style={s.chatNameRow}>
                        <Text style={s.chatName}>{m.name}</Text>
                        {m.hasNewMsg && <View style={s.newMsgDot} />}
                      </View>
                      <Text style={[s.chatMsg, { color: '#9AA0B2' }, m.hasNewMsg && s.chatMsgUnread]} numberOfLines={1}>{m.lastMsg}</Text>
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

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.03 * 28 },
  bellBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 2, position: 'relative' },
  bellDot: { position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4D6A', borderWidth: 2, borderColor: colors.canvas },

  whiteCard: { flex: 1, backgroundColor: colors.canvas },

  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 80, gap: 8 },
  emptyTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: colors.ink, textAlign: 'center' },
  emptyText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#9AA0B2', textAlign: 'center', lineHeight: 20 },

  section: { paddingHorizontal: 20, paddingTop: 18 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: colors.ink },
  sectionCount: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: colors.blue },
  divider: { height: 1, backgroundColor: '#F0F1F5', marginTop: 6 },

  newMatchItem: { alignItems: 'center', gap: 6 },
  newMatchName: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 11, color: colors.ink },

  chatRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  chatInfo: { flex: 1, minWidth: 0 },
  chatNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  chatName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: colors.ink },
  chatMsg: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink },
  chatMsgUnread: { color: colors.ink, fontFamily: 'HankenGrotesk_700Bold' },
  newMsgDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4D6A' },
});
