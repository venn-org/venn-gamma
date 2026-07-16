import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { getCurrentUserId } from '../../lib/auth';

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const textFor = (notif) => {
  if (notif.type === 'like') return `${notif.actorName} liked you`;
  if (notif.type === 'match') return `You matched with ${notif.actorName}`;
  return notif.message || 'New notification';
};

const getMeta = (type) => {
  if (type === 'like') return { icon: 'heart', bg: '#FFF0F3', color: '#FF4D6A' };
  if (type === 'match') return { icon: 'flash', bg: '#EEF1FF', color: '#335CFF' };
  return { icon: 'notifications', bg: '#F2F3F7', color: '#5A6072' };
};

const NotifRow = ({ notif, last, onPress }) => {
  const meta = getMeta(notif.type);
  return (
    <TouchableOpacity style={[s.row, !last && s.rowBorder]} activeOpacity={0.7} onPress={onPress}>
      <View style={[s.iconWrap, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={18} color={meta.color} />
      </View>
      <View style={s.rowBody}>
        <Text style={[s.rowText, !notif.read && s.rowTextUnread]}>{textFor(notif)}</Text>
        <Text style={s.rowTime}>{timeAgo(notif.created_at)}</Text>
      </View>
      {!notif.read && <View style={s.unreadDot} />}
    </TouchableOpacity>
  );
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const uid = getCurrentUserId();
    if (!uid) return;
    
    // Simplistic query
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
      
    if (data) setNotifications(data);
    setLoading(false);
  };

  const handleMarkAllRead = async () => {
    const uid = getCurrentUserId();
    if (!uid) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', uid);
    fetchNotifications();
  };

  // Mock categorization for now
  const today = notifications.slice(0, 2);
  const earlier = notifications.slice(2);
  const isEmpty = notifications.length === 0;

  return (
    <View style={[s.screen, { paddingTop: insets.top + 4 }]}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={18} color={colors.ink} />
        </TouchableOpacity>
        <Text style={s.title}>Notifications</Text>
        <TouchableOpacity activeOpacity={0.8} onPress={handleMarkAllRead}>
          <Text style={s.markAll}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={s.empty}><Text style={s.emptyText}>Loading...</Text></View>
        ) : isEmpty ? (
          <View style={s.empty}>
            <Ionicons name="notifications-outline" size={40} color="#D5D8E0" />
            <Text style={s.emptyTitle}>No notifications yet</Text>
            <Text style={s.emptySub}>Likes, matches, and messages will show up here.</Text>
          </View>
        ) : (
          <>
            {today.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionLabel}>TODAY</Text>
                {today.map((n, i) => (
                  <NotifRow key={n.id} notif={n} last={i === today.length - 1} onPress={() => {}} />
                ))}
              </View>
            )}
            {earlier.length > 0 && (
              <View style={[s.section, { marginTop: 8 }]}>
                <Text style={s.sectionLabel}>EARLIER</Text>
                {earlier.map((n, i) => (
                  <NotifRow key={n.id} notif={n} last={i === earlier.length - 1} onPress={() => {}} />
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
  screen: { flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: colors.ink },
  markAll: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.blue },

  scroll: { flex: 1 },
  section: { paddingHorizontal: 20, paddingTop: 16 },
  sectionLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: '#9AA0B2', marginBottom: 10 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F1F5' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowBody: { flex: 1 },
  rowText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.ink, lineHeight: 20, marginBottom: 3 },
  rowTextUnread: { fontFamily: 'HankenGrotesk_600SemiBold' },
  rowTime: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#9AA0B2' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue, flexShrink: 0 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 100, gap: 10 },
  emptyTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: colors.ink, textAlign: 'center' },
  emptySub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#9AA0B2', textAlign: 'center', lineHeight: 19 },
  emptyText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#9AA0B2', textAlign: 'center', marginTop: 40 },
});
