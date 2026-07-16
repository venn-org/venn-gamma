import { useEffect, useState } from 'react';
import { Platform, View, StyleSheet, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { getCurrentUserId } from '../../lib/auth';
import { getUnreadCount } from '../../lib/notifications';

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
        // Fetch unread likes (notifications type = 'like')
        const { count: likesCount } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', uid)
          .eq('type', 'like')
          .eq('read', false);
          
        if (!cancelled) setUnreadLikes(likesCount ?? 0);

        // Fetch unread messages
        const { count: msgCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('to_user_id', uid)
          .eq('read', false);
          
        if (!cancelled) setUnreadMessages(msgCount ?? 0);
      } catch (e) {
        console.warn('Failed to fetch tab badges:', e);
      }
    };

    fetchCounts();

    // Subscribe to realtime updates
    channel = supabase.channel('tab-badges')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, fetchCounts)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, fetchCounts)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `to_user_id=eq.${uid}` }, fetchCounts)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `to_user_id=eq.${uid}` }, fetchCounts)
      .subscribe();

    return () => {
      cancelled = true;
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
      <Tabs.Screen name="chat" options={{ href: null }} />
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
