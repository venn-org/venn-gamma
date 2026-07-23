import { useEffect, useState } from 'react';
import { Platform, View, StyleSheet, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { getCurrentUserId } from '../../lib/auth';
import { getUnreadCount } from '../../lib/notifications';

const POLL_INTERVAL_MS = 3000;

const TabIcon = ({ name, size, color, count }) => (
  <View>
    <Ionicons name={name} size={size} color={color} />
    {count > 0 && (
      <View style={dotStyles.badge}>
        <Text style={dotStyles.badgeText}>{count > 4 ? '4+' : count}</Text>
      </View>
    )}
  </View>
);

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const uid = getCurrentUserId();

  const [unreadLikes, setUnreadLikes] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!uid) return;
    
    let cancelled = false;
    let channel = null;

    const fetchCounts = async () => {
      try {
        // Unread messages: messages in your matches sent by the other person
        // that you haven't read yet.
        const { data: matches } = await supabase
          .from('matches')
          .select('id, user1_id, user2_id')
          .or(`user1_id.eq.${uid},user2_id.eq.${uid}`);
        const matchIds = (matches ?? []).map((m) => m.id);
        const matchedUserIds = new Set(
          (matches ?? []).map((m) => (m.user1_id === uid ? m.user2_id : m.user1_id))
        );

        // Pending likes: everyone currently in your Likes queue (matches what
        // the Likes tab itself shows). A mutual like already turned into a
        // match is never cleaned up from `likes` server-side, so exclude
        // anyone already matched — otherwise the badge over-counts.
        const { data: likers } = await supabase
          .from('likes')
          .select('from_user_id')
          .eq('to_user_id', uid);
        const likesCount = (likers ?? []).filter((l) => !matchedUserIds.has(l.from_user_id)).length;

        if (!cancelled) setUnreadLikes(likesCount);

        let msgCount = 0;
        if (matchIds.length > 0) {
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .in('match_id', matchIds)
            .eq('read', false)
            .neq('sender_id', uid);
          msgCount = count ?? 0;
        }

        if (!cancelled) setUnreadMessages(msgCount);
      } catch (e) {
        console.warn('Failed to fetch tab badges:', e);
      }
    };

    fetchCounts();

    // Subscribe to realtime updates
    channel = supabase.channel('tab-badges')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes', filter: `to_user_id=eq.${uid}` }, fetchCounts)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'likes' }, fetchCounts)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fetchCounts)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, fetchCounts)
      .subscribe();

    // Fallback poll: realtime delivery can be delayed/dropped, so periodically
    // re-fetch to make sure the badge clears once messages are marked read.
    const pollInterval = setInterval(fetchCounts, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [uid]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'none',
        sceneStyle: { backgroundColor: '#FCFCFD' },
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E6E8EE',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 56 + insets.bottom : 60,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 6,
          paddingTop: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: '#9AA0B2',
        tabBarLabelStyle: {
          fontFamily: 'HankenGrotesk_600SemiBold',
          fontSize: 10,
          marginTop: 2,
        },
        tabBarItemStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="standouts"
        options={{
          title: 'Standouts',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'star' : 'star-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          title: 'Likes',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'heart' : 'heart-outline'}
              size={22}
              color={color}
              count={unreadLikes}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? 'chatbubble' : 'chatbubble-outline'}
              size={22}
              color={color}
              count={unreadMessages}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}

const dotStyles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -4, right: -8,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#FF4D6A', borderWidth: 1.5, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: 'HankenGrotesk_700Bold', fontSize: 9, color: '#fff',
  }
});
