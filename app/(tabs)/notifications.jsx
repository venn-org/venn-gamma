import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../../lib/ThemeContext';
import { getCurrentUserId } from '../../lib/auth';
import { getNotifications, markAllRead, markRead } from '../../lib/notifications';
import { NotificationsListSkeleton } from '../../components/Skeleton';
import RemoteImage from '../../components/RemoteImage';

// Badge glyph per notification type. Module scope so it isn't rebuilt on every
// row render; `iconColor` is resolved against the theme at render time.
const TYPE_BADGE = {
  like: { icon: 'heart', color: (c) => c.violet },
  match: { icon: 'flash', color: () => '#FF4D6A' },
  message: { icon: 'chatbubble', color: (c) => c.blue },
};

const AVATAR_SIZE = 48;

/**
 * One notification row.
 *
 * Memoised because the list re-renders on every read/mark-all-read state
 * change: without this, marking one notification read re-renders all 50 rows
 * and re-decodes 50 avatars.
 */
const NotificationRow = memo(function NotificationRow({ notification, onPress, s, colors }) {
  const badge = TYPE_BADGE[notification.type];
  const iconName = badge?.icon ?? 'notifications';
  const iconColor = badge ? badge.color(colors) : colors.slate;
  const initials = notification.actorName ? notification.actorName.charAt(0).toUpperCase() : '?';

  return (
    <TouchableOpacity
      style={[s.notifCard, !notification.read && s.notifUnread]}
      onPress={() => onPress(notification)}
      activeOpacity={0.8}
    >
      <View style={s.avatarWrap}>
        {notification.actorPhoto ? (
          <RemoteImage uri={notification.actorPhoto} width={AVATAR_SIZE} style={s.avatar} />
        ) : (
          <Text style={s.initials}>{initials}</Text>
        )}
        <View style={[s.badgeIcon, { backgroundColor: iconColor }]}>
          <Ionicons name={iconName} size={10} color="#fff" />
        </View>
      </View>
      <View style={s.notifContent}>
        <Text style={[s.notifText, !notification.read && s.notifTextUnread]}>
          <Text style={s.notifName}>{notification.actorName}</Text>
          {notification.type === 'like'
            ? ' liked your profile'
            : notification.type === 'match'
              ? ' matched with you!'
              : ' sent you a message'}
        </Text>
        <Text style={s.notifTime}>{new Date(notification.createdAt).toLocaleDateString()}</Text>
      </View>
      {!notification.read && <View style={s.unreadDot} />}
    </TouchableOpacity>
  );
});

export default function NotificationsScreen() {
  const s = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  // Cold load only — a pull-to-refresh keeps the current rows under the
  // spinner rather than replacing them with a skeleton.
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchNotifs = async () => {
    const uid = getCurrentUserId();
    if (!uid) {
      setInitialLoad(false);
      return;
    }
    setRefreshing(true);
    const data = await getNotifications(uid);
    setNotifications(data || []);
    setRefreshing(false);
    setInitialLoad(false);
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    const uid = getCurrentUserId();
    if (!uid) return;
    await markAllRead(uid);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // useCallback so the memoised rows keep a stable `onPress` and don't all
  // re-render whenever this screen's state changes.
  const handlePressNotif = useCallback(
    async (n) => {
      const uid = getCurrentUserId();
      if (!uid) return;

      if (!n.read) {
        await markRead(uid, n.id);
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      }

      if (n.type === 'like') {
        router.push('/(tabs)/likes');
      } else if (n.type === 'match' || n.type === 'message') {
        router.push('/(tabs)/messages');
      }
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <NotificationRow notification={item} onPress={handlePressNotif} s={s} colors={colors} />
    ),
    [handlePressNotif, s, colors],
  );

  const keyExtractor = useCallback((item) => String(item.id), []);

  return (
    <View style={s.screen}>
      <View style={[s.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/messages'))}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={s.title}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.8}>
          <Ionicons name="checkmark-done-outline" size={22} color={colors.headerText} />
        </TouchableOpacity>
      </View>

      {initialLoad ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <NotificationsListSkeleton />
        </ScrollView>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          // flexGrow lets the empty state centre itself in the viewport while
          // still leaving room under the tab bar once there are rows.
          contentContainerStyle={
            notifications.length === 0 ? [s.center, { flexGrow: 1 }] : { paddingBottom: 100 }
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchNotifs}
              tintColor={colors.blue}
            />
          }
          // Rows are a fixed height, so windowing can be tight. removeClipped-
          // SubViews matters most on low-end Android, where 50 mounted rows
          // with avatars is the difference between a smooth scroll and a stutter.
          removeClippedSubviews
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          ListEmptyComponent={
            <>
              <Ionicons
                name="notifications-off-outline"
                size={48}
                color="#C0C5D0"
                style={{ marginBottom: 12 }}
              />
              <Text style={s.emptyTitle}>All caught up!</Text>
              <Text style={s.emptySub}>
                When you get likes, matches, or messages, they will appear here.
              </Text>
            </>
          }
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
      paddingBottom: 12,
      backgroundColor: colors.header,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    title: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 20,
      color: colors.headerText,
    },

    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 20,
      color: colors.ink,
      marginBottom: 8,
    },
    emptySub: {
      fontFamily: 'HankenGrotesk_400Regular',
      fontSize: 14,
      color: colors.placeholder,
      textAlign: 'center',
      lineHeight: 22,
    },

    notifCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 20,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    notifUnread: { backgroundColor: colors.unread },
    avatarWrap: {
      position: 'relative',
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.canvas,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: { width: '100%', height: '100%', borderRadius: 24 },
    initials: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 18,
      color: colors.slate,
    },
    badgeIcon: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.card,
    },
    notifContent: { flex: 1 },
    notifText: {
      fontFamily: 'HankenGrotesk_400Regular',
      fontSize: 14,
      color: colors.slate,
      lineHeight: 20,
    },
    notifTextUnread: {
      color: colors.ink,
      fontFamily: 'HankenGrotesk_600SemiBold',
    },
    notifName: { fontFamily: 'SpaceGrotesk_700Bold', color: colors.ink },
    notifTime: {
      fontFamily: 'HankenGrotesk_400Regular',
      fontSize: 12,
      color: colors.placeholder,
      marginTop: 4,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.blue,
    },
  });
