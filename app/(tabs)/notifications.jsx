import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, useThemedStyles } from "../../lib/ThemeContext";
import { getCurrentUserId } from "../../lib/auth";
import {
    getNotifications,
    markAllRead,
    markRead,
} from "../../lib/notifications";
import { NotificationsListSkeleton } from "../../components/Skeleton";

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

  const handlePressNotif = async (n) => {
    const uid = getCurrentUserId();
    if (!uid) return;

    if (!n.read) {
      await markRead(uid, n.id);
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
      );
    }

    if (n.type === "like") {
      router.push("/(tabs)/likes");
    } else if (n.type === "match" || n.type === "message") {
      router.push("/(tabs)/messages");
    }
  };

  return (
    <View style={s.screen}>
      <View style={[s.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)/messages")
          }
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={s.title}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.8}>
          <Ionicons
            name="checkmark-done-outline"
            size={22}
            color={colors.headerText}
          />
        </TouchableOpacity>
      </View>

      {initialLoad ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <NotificationsListSkeleton />
        </ScrollView>
      ) : notifications.length === 0 ? (
        <ScrollView
          contentContainerStyle={[s.center, { flexGrow: 1 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchNotifs}
              tintColor={colors.blue}
            />
          }
        >
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
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchNotifs}
              tintColor={colors.blue}
            />
          }
        >
          {notifications.map((n) => {
            const initials = n.actorName
              ? n.actorName.charAt(0).toUpperCase()
              : "?";

            let iconName = "notifications";
            let iconColor = colors.slate;
            if (n.type === "like") {
              iconName = "heart";
              iconColor = colors.violet;
            }
            if (n.type === "match") {
              iconName = "flash";
              iconColor = "#FF4D6A";
            }
            if (n.type === "message") {
              iconName = "chatbubble";
              iconColor = colors.blue;
            }

            return (
              <TouchableOpacity
                key={n.id}
                style={[s.notifCard, !n.read && s.notifUnread]}
                onPress={() => handlePressNotif(n)}
                activeOpacity={0.8}
              >
                <View style={s.avatarWrap}>
                  {n.actorPhoto ? (
                    <Image
                      source={{ uri: n.actorPhoto }}
                      style={s.avatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={s.initials}>{initials}</Text>
                  )}
                  <View style={[s.badgeIcon, { backgroundColor: iconColor }]}>
                    <Ionicons name={iconName} size={10} color="#fff" />
                  </View>
                </View>
                <View style={s.notifContent}>
                  <Text style={[s.notifText, !n.read && s.notifTextUnread]}>
                    <Text style={s.notifName}>{n.actorName}</Text>
                    {n.type === "like"
                      ? " liked your profile"
                      : n.type === "match"
                        ? " matched with you!"
                        : " sent you a message"}
                  </Text>
                  <Text style={s.notifTime}>
                    {new Date(n.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                {!n.read && <View style={s.unreadDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.canvas },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
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
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    title: {
      fontFamily: "SpaceGrotesk_700Bold",
      fontSize: 20,
      color: colors.headerText,
    },

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontFamily: "SpaceGrotesk_700Bold",
      fontSize: 20,
      color: colors.ink,
      marginBottom: 8,
    },
    emptySub: {
      fontFamily: "HankenGrotesk_400Regular",
      fontSize: 14,
      color: colors.placeholder,
      textAlign: "center",
      lineHeight: 22,
    },

    notifCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 20,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    notifUnread: { backgroundColor: colors.unread },
    avatarWrap: {
      position: "relative",
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.canvas,
      alignItems: "center",
      justifyContent: "center",
    },
    avatar: { width: "100%", height: "100%", borderRadius: 24 },
    initials: {
      fontFamily: "SpaceGrotesk_700Bold",
      fontSize: 18,
      color: colors.slate,
    },
    badgeIcon: {
      position: "absolute",
      bottom: -2,
      right: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.card,
    },
    notifContent: { flex: 1 },
    notifText: {
      fontFamily: "HankenGrotesk_400Regular",
      fontSize: 14,
      color: colors.slate,
      lineHeight: 20,
    },
    notifTextUnread: {
      color: colors.ink,
      fontFamily: "HankenGrotesk_600SemiBold",
    },
    notifName: { fontFamily: "SpaceGrotesk_700Bold", color: colors.ink },
    notifTime: {
      fontFamily: "HankenGrotesk_400Regular",
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
