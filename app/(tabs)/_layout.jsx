import { useEffect, useState } from 'react';
import { AppState, Platform, View, StyleSheet, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/ThemeContext';
import { getCurrentUserId } from '../../lib/auth';
import { INTERVALS } from '../../config/flags';
import { fetchBadgeCounts, subscribeToBadgeEvents } from '../../services/badgeService';

const TabIcon = ({ name, size, color, count, badgeRing }) => (
  <View>
    <Ionicons name={name} size={size} color={color} />
    {count > 0 && (
      <View style={[dotStyles.badge, { borderColor: badgeRing }]}>
        <Text style={dotStyles.badgeText}>{count > 4 ? '4+' : count}</Text>
      </View>
    )}
  </View>
);

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const uid = getCurrentUserId();

  const [unreadLikes, setUnreadLikes] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    const refreshCounts = async () => {
      const counts = await fetchBadgeCounts(uid);
      // null means the fetch failed — keep the badges that are on screen
      // rather than flashing them to zero and back.
      if (cancelled || !counts) return;
      setUnreadLikes(counts.likes);
      setUnreadMessages(counts.messages);
    };

    refreshCounts();

    // Every message insert app-wide reaches this subscription (see
    // badgeService), and each event would otherwise fire three queries.
    // Collapse bursts into a single refresh.
    let refreshTimer = null;
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(refreshCounts, INTERVALS.badgeRefreshDebounceMs);
    };

    const unsubscribe = subscribeToBadgeEvents(uid, scheduleRefresh);

    // Fallback poll for delayed/dropped realtime, paused while backgrounded —
    // badges are only worth refreshing while someone can see them.
    let pollInterval = null;
    const startPolling = () => {
      if (pollInterval) return;
      pollInterval = setInterval(refreshCounts, INTERVALS.badgePollMs);
    };
    const stopPolling = () => {
      if (!pollInterval) return;
      clearInterval(pollInterval);
      pollInterval = null;
    };

    startPolling();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshCounts();
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      cancelled = true;
      stopPolling();
      appSub.remove();
      clearTimeout(refreshTimer);
      unsubscribe();
    };
  }, [uid]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'none',
        sceneStyle: { backgroundColor: colors.paper },
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 56 + insets.bottom : 60,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 6,
          paddingTop: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
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
              badgeRing={colors.tabBar}
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
              badgeRing={colors.tabBar}
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
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF4D6A',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 9,
    color: '#fff',
  },
});
