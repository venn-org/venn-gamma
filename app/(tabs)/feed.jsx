import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MatchCelebration from "../../components/MatchCelebration";
import OptionIcon from "../../components/OptionIcon";
import PreferencesSheet from "../../components/PreferencesSheet";
import { getCurrentUserId } from "../../lib/auth";
import { getBlockedIds } from "../../lib/blocks";
import {
  canLikeToday,
  getRemainingLikes,
  getTodayViewedProfileIds,
  recordProfileView,
} from "../../lib/dailyLimits";
import { formatBudgetRange, formatMoveInDate, mapDbPrefsToUI, mapUIPrefsToDb, optionDisplay, stripLabelEmoji, toDb, toUI } from "../../lib/enums";
import { PREF_ROWS, calculateOverlapScore, getPrefDisplay, isPrefSet, matchesPrefs } from "../../lib/prefs";
import { buildProfileCardBlocks, buildProfileTraits, calculateProfileCompletion, isFeedReady } from "../../lib/profileUtils";
import { supabase } from "../../lib/supabase";
import { useTheme, useThemedStyles } from "../../lib/ThemeContext";

const { width: SCREEN_W } = Dimensions.get("window");

// TEMP: daily view limit disabled for today — profiles cycle (wrap around)
// instead of dead-ending at "come back tomorrow" once you've seen them all.
// Revert by flipping this back to false.
const TEMP_DISABLE_VIEW_LIMIT = true;

// Role is deliberately absent — it's an identity switch, not a filter, so it
// only lives behind the options button.
const FILTER_CHIPS = PREF_ROWS.filter((row) => !row.roleOnly);

export default function FeedScreen() {
  const s = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [prefsVisible, setPrefsVisible] = useState(false);
  const [prefsSection, setPrefsSection] = useState(null); // which chip opened the sheet, or null for the full sheet
  const [userPrefs, setUserPrefs] = useState(null);
  const [myProfile, setMyProfile] = useState(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [remainingLikes, setRemainingLikes] = useState(5);

  // Match celebration state
  const [matchData, setMatchData] = useState(null);
  const [likeSent, setLikeSent] = useState(null);
  const likeSentTimer = useRef(null);

  useEffect(() => () => clearTimeout(likeSentTimer.current), []);

  // Animation
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const uid = getCurrentUserId();
    if (uid) {
      getRemainingLikes(uid).then(setRemainingLikes);
    }
    fetchFeed();
    if (!uid) return;
  }, []);

  // Keep the completion banner in sync with edits made elsewhere
  useFocusEffect(
    useCallback(() => {
      fetchMyPrefs();
    }, []),
  );

  useEffect(() => {
    fadeIn.setValue(0);
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Record profile view when a new profile is shown
    const uid = getCurrentUserId();
    if (uid && currentProfile) {
      recordProfileView(uid, currentProfile.id);
    }
  }, [currentIndex, profiles]);

  const fetchMyPrefs = async () => {
    const uid = getCurrentUserId();
    if (!uid) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();
    if (data) {
      setUserPrefs(mapDbPrefsToUI(data));
      setMyProfile(data);
    }
  };

  const handleSavePrefs = async (newPrefs, housing) => {
    const uid = getCurrentUserId();
    if (!uid) return;
    const updates = mapUIPrefsToDb(newPrefs);
    // newPrefs (the sheet's draft) never touches budget/moveIn directly
    // anymore — those live in `housing` (slider/calendar) — so merge the
    // fresh values in here, otherwise userPrefs/fetchFeed would keep using
    // whatever budget/moveIn was current before this save.
    let mergedPrefs = newPrefs;
    if (housing) {
      updates.budget_min = housing.budgetMin;
      updates.budget_max = housing.budgetMax;
      updates.move_in_date = housing.moveInDate || null;
      mergedPrefs = {
        ...newPrefs,
        budget: formatBudgetRange(housing.budgetMin, housing.budgetMax),
        budgetMin: housing.budgetMin,
        budgetMax: housing.budgetMax,
        moveIn: formatMoveInDate(housing.moveInDate),
        moveInDate: housing.moveInDate || null,
      };
    }
    setUserPrefs(mergedPrefs);
    await supabase.from("profiles").update(updates).eq("id", uid);
    if (housing) {
      setMyProfile((p) => (p ? {
        ...p,
        budget_min: housing.budgetMin,
        budget_max: housing.budgetMax,
        move_in_date: housing.moveInDate || null,
      } : p));
    }
    fetchFeed(mergedPrefs);
  };

  const fetchFeed = async (currentPrefs = userPrefs) => {
    const uid = getCurrentUserId();
    if (!uid) return;

    setCurrentIndex(0);
    const [blocked, viewedToday] = await Promise.all([
      getBlockedIds(uid),
      TEMP_DISABLE_VIEW_LIMIT ? Promise.resolve(new Set()) : getTodayViewedProfileIds(uid),
    ]);

    let query = supabase
      .from("profiles")
      .select("*")
      .neq("id", uid)
      .eq("paused", false)
      .eq("onboarding_done", true)
      .order("last_active_at", { ascending: false });

    if (currentPrefs?.role) {
      const dbRole = toDb("pref_role", currentPrefs.role);
      const targetRole = dbRole === "seeking" ? "owner" : "seeking";
      query = query.eq("user_type", targetRole);
    }

    const { data, error } = await query.limit(30);
    if (error) {
      console.error('Feed query failed:', error);
      Alert.alert('Error', 'Failed to load profiles. Please try again.');
      return;
    }
    if (data) {
      const filtered = data.filter((p) => {
        if (blocked.has(p.id)) return false;
        if (viewedToday.has(p.id)) return false;

        // Skip incomplete profiles — they render as empty cards
        if (!isFeedReady(p)) return false;

        return matchesPrefs(currentPrefs, p);
      });

      // flat_details is a separate table (not embeddable through the
      // `profiles` view), so owners' labelled flat photos need their own
      // query — same as likes.jsx does.
      const ownerIds = filtered.filter((p) => p.user_type === "owner").map((p) => p.id);
      if (ownerIds.length > 0) {
        const { data: flatRows } = await supabase
          .from("flat_details")
          .select("profile_id, photos")
          .in("profile_id", ownerIds);
        const photosByProfile = new Map((flatRows ?? []).map((r) => [r.profile_id, r.photos]));
        filtered.forEach((p) => {
          p.flat_photos = photosByProfile.get(p.id) ?? [];
        });
      }

      setProfiles(filtered);
    }
  };

  const currentProfile = profiles[currentIndex];
  const overlapScore = currentProfile ? calculateOverlapScore(userPrefs, currentProfile) : null;

  const cardBlocks = useMemo(() => buildProfileCardBlocks(currentProfile), [currentProfile]);
  const traits = useMemo(() => buildProfileTraits(currentProfile), [currentProfile]);

  // TEMP: with the view limit off, wrap back to the start instead of
  // dead-ending once the list runs out, so profiles cycle like before.
  const advanceIndex = () => {
    setCurrentIndex((i) => {
      const next = i + 1;
      if (TEMP_DISABLE_VIEW_LIMIT && profiles.length > 0) {
        return next % profiles.length;
      }
      return next;
    });
  };

  const handlePass = async () => {
    const uid = getCurrentUserId();
    if (uid && currentProfile) {
      // Record the skip/pass as a view so it doesn't show up again today
      await recordProfileView(uid, currentProfile.id);
    }

    Animated.timing(fadeIn, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      advanceIndex();
    });
  };

  const handleLike = async () => {
    const uid = getCurrentUserId();
    if (!uid || !currentProfile) return;

    const canLike = await canLikeToday(uid);
    if (!canLike) {
      Alert.alert(
        "Like Limit Reached",
        "You have 5 likes per day. Come back tomorrow!",
      );
      return;
    }

    const targetId = currentProfile.id;

    Animated.timing(fadeIn, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      advanceIndex();
    });

    const { error } = await supabase.from("likes").insert({
      from_user_id: uid,
      to_user_id: targetId,
    });

    if (error && error.code !== "23505") {
      Alert.alert("Error", "Failed to send like");
    } else if (!error) {
      const remaining = await getRemainingLikes(uid);
      setRemainingLikes(remaining);

      // The mutual-like trigger (create_match_on_mutual_like) runs
      // synchronously as part of the insert above, so if this like just
      // completed a match, it's already visible here — checking this way
      // (instead of a broad realtime subscription on all match events) keeps
      // the full-screen celebration tied to this user's own action, not to
      // matches that land while they're elsewhere in the app.
      const { data: matchRow } = await supabase
        .from("matches")
        .select("id")
        .or(`and(user1_id.eq.${uid},user2_id.eq.${targetId}),and(user1_id.eq.${targetId},user2_id.eq.${uid})`)
        .maybeSingle();

      if (matchRow) {
        setMatchData({
          name: currentProfile.name,
          photo: currentProfile.photos?.[0] || null,
          matchId: matchRow.id,
        });
      } else {
        // Quick feedback loop — auto-dismisses so it doesn't block swiping
        setLikeSent({ name: currentProfile.name, photo: currentProfile.photos?.[0] || null });
        clearTimeout(likeSentTimer.current);
        likeSentTimer.current = setTimeout(() => setLikeSent(null), 1500);
      }
    }
  };

  const handleReport = () => {
    setMenuOpen(false);
    Alert.alert("Reported", "Thank you for keeping Venn safe.");
    handlePass();
  };

  const handleBlock = async () => {
    setMenuOpen(false);
    const uid = getCurrentUserId();
    if (!uid || !currentProfile) return;

    const { error } = await supabase.from("blocks").insert({
      blocker_id: uid,
      blocked_id: currentProfile.id,
    });

    if (!error) {
      handlePass();
    }
  };

  // Filter chips + completion banner — rendered inside the scrollable content
  // on both branches below so they scroll away with the card, leaving only
  // the top bar (logo/likes/filter icon) pinned.
  const renderScrollTopSection = () => (
    <View style={{ marginHorizontal: -16 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterScroll}
        contentContainerStyle={s.filterRow}
      >
        {FILTER_CHIPS.map((chip) => {
          const active = isPrefSet(userPrefs, chip.key, chip.multi);
          const chipValue = !active
            ? null
            : chip.multi ? userPrefs?.[chip.key]?.[0] : userPrefs?.[chip.key];
          const chipIcon = optionDisplay(chip.enumKey, chipValue).icon;
          const chipText = active
            ? getPrefDisplay(userPrefs, chip.key, chip.label, chip.multi)
            : chip.label;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[s.filterChip, active && s.filterChipActive]}
              activeOpacity={0.8}
              onPress={() => { setPrefsSection(chip.key); setPrefsVisible(true); }}
            >
              <OptionIcon
                name={chipIcon}
                size={13}
                color={active ? "#fff" : colors.ink}
              />
              <Text style={[s.filterChipText, active && s.filterChipTextActive]}>
                {chipIcon ? stripLabelEmoji(chipText) : chipText}
              </Text>
              <Ionicons
                name="chevron-down"
                size={12}
                color={active ? "#fff" : colors.ink}
                style={{ marginLeft: 2 }}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Banner — hidden on the empty state so the message centers on screen */}
      {showBanner &&
        currentProfile &&
        myProfile &&
        !calculateProfileCompletion(myProfile).isComplete && (
          <View style={s.banner}>
            <View style={s.bannerText}>
              <Text style={s.bannerTitle}>Complete your profile</Text>
              <Text style={s.bannerSub} numberOfLines={1}>
                {calculateProfileCompletion(myProfile).missingText}
              </Text>
            </View>
            <TouchableOpacity
              style={s.bannerBtn}
              onPress={() => router.push("/(settings)/edit-profile")}
              activeOpacity={0.85}
            >
              <Text style={s.bannerBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.bannerClose}
              onPress={() => setShowBanner(false)}
            >
              <Ionicons name="close" size={14} color={colors.ink} />
            </TouchableOpacity>
          </View>
        )}

      {currentProfile && <View style={s.separator} />}
    </View>
  );

  return (
    <View style={s.screen}>
      {/* Topmost section — stays fixed while everything else scrolls */}
      <View style={[s.headerBlock, { paddingTop: insets.top + 12 }]}>
        <View style={s.topBar}>
        <View style={s.logoRow}>
          <View style={s.logoWrap}>
            <View
              style={[s.circle, { backgroundColor: colors.blue, left: 0 }]}
            />
            <View
              style={[
                s.circle,
                { backgroundColor: colors.violet, right: 0, opacity: 0.9 },
              ]}
            />
          </View>
          <Text style={s.wordmark}>Venn</Text>
        </View>
        <View style={s.topBarRight}>
          <View style={s.likesPill}>
            <Ionicons
              name="heart"
              size={12}
              color={remainingLikes > 0 ? "#22C55E" : "#FF4D6A"}
            />
            <Text
              style={[
                s.likesPillText,
                { color: remainingLikes > 0 ? "#22C55E" : "#FF4D6A" },
              ]}
            >
              {remainingLikes} {remainingLikes === 1 ? "like" : "likes"} left
            </Text>
          </View>
          <TouchableOpacity
            style={s.filterIconBtn}
            activeOpacity={0.8}
            onPress={() => { setPrefsSection(null); setPrefsVisible(true); }}
          >
            <Ionicons name="options-outline" size={18} color={colors.ink} />
          </TouchableOpacity>
        </View>
      </View>
      </View>

      {/* Feed Content */}
      <View style={[s.feedContent, { flex: 1 }, !currentProfile && { paddingTop: 0 }]}>
        {!currentProfile ? (
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}>
            {renderScrollTopSection()}
            <View style={[s.empty, { flex: 1 }]}>
              <Text style={s.emptyText}>
                No more profiles found. Come back tomorrow.
              </Text>
              <TouchableOpacity
                style={[s.refreshBtn, { marginTop: 16 }]}
                onPress={() => fetchFeed()}
              >
                <Text style={s.refreshBtnText}>Refresh Feed</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <>
            <Animated.View style={[s.cardOuter, { flex: 1, opacity: fadeIn }]}>
              {menuOpen && (
                <Modal
                  visible
                  transparent
                  animationType="fade"
                  onRequestClose={() => setMenuOpen(false)}
                >
                  <Pressable
                    style={s.menuBackdrop}
                    onPress={() => setMenuOpen(false)}
                  >
                    <View style={s.menuBox}>
                      <TouchableOpacity style={s.menuItem} onPress={handleReport}>
                        <Text style={s.menuItemText}>Report</Text>
                      </TouchableOpacity>
                      <View style={s.menuDivider} />
                      <TouchableOpacity style={s.menuItem} onPress={handleBlock}>
                        <Text style={s.menuItemText}>Block</Text>
                      </TouchableOpacity>
                    </View>
                  </Pressable>
                </Modal>
              )}

              {/* Scrollable Profile Content */}
              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 110 }}
              >
                {renderScrollTopSection()}

                {/* Card Header */}
                <View style={s.cardHeader}>
                  <View>
                    <View style={s.nameRow}>
                      <Text style={s.name}>{currentProfile.name}</Text>
                      {currentProfile.verified && (
                        <View style={s.verifiedBadge}>
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        </View>
                      )}
                      {overlapScore != null && (
                        <View style={s.overlapPill}>
                          <View style={s.overlapMark}>
                            <View style={[s.overlapCircle, { backgroundColor: colors.blue, left: 0 }]} />
                            <View style={[s.overlapCircle, { backgroundColor: colors.violet, right: 0, opacity: 0.9 }]} />
                          </View>
                          <Text style={s.overlapText}>{overlapScore}% overlap</Text>
                        </View>
                      )}
                    </View>
                    <View style={s.statusRow}>
                      <Text style={s.pronouns}>
                        {currentProfile.pronouns?.[0] || "-"}
                      </Text>
                      <Text style={s.dot}> • </Text>
                      <Text style={s.active}>Active now</Text>
                      <View
                        style={[
                          s.rolePill,
                          {
                            backgroundColor:
                              currentProfile.user_type === "owner"
                                ? colors.blue
                                : colors.violet,
                            marginLeft: 8,
                          },
                        ]}
                      >
                        <Text style={s.rolePillText}>
                          {currentProfile.user_type === "owner"
                            ? "Has a flat"
                            : "Looking for flat"}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={s.navBtns}>
                    <TouchableOpacity
                      style={s.navBtn}
                      onPress={() => setMenuOpen(true)}
                    >
                      <Ionicons
                        name="ellipsis-horizontal"
                        size={18}
                        color={colors.ink}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.photoWrap}>
                  {currentProfile.photos?.[0] ? (
                    <Image
                      source={{ uri: currentProfile.photos[0] }}
                      style={s.photo}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[s.photo, s.photoPlaceholder]}>
                      <Text style={{ color: "#9AA0B2" }}>No Photo</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[s.heartBtn, remainingLikes <= 0 && s.heartBtnDisabled]}
                    activeOpacity={0.9}
                    onPress={handleLike}
                  >
                    <Ionicons
                      name="heart"
                      size={24}
                      color={remainingLikes > 0 ? colors.violet : colors.placeholder}
                    />
                  </TouchableOpacity>
                </View>

                {/* Info Card */}
                <View style={s.infoCard}>
                  <View style={s.infoRow}>
                    <View style={s.infoItem}>
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color="#9AA0B2"
                      />
                      <Text style={s.infoItemText}>
                        {currentProfile.age || "-"}
                      </Text>
                    </View>
                    <View style={s.infoDivider} />
                    <View style={[s.infoItem, { paddingLeft: 12 }]}>
                      <Ionicons
                        name="person-outline"
                        size={16}
                        color="#9AA0B2"
                      />
                      <Text style={s.infoItemText}>
                        {toUI("gender", currentProfile.gender) || "-"}
                      </Text>
                    </View>
                  </View>
                  <View style={s.infoHorizDivider} />
                  <View style={s.infoRow}>
                    <View style={s.infoItem}>
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color="#9AA0B2"
                      />
                      <Text style={s.infoItemText}>
                        {currentProfile.location || "-"}
                      </Text>
                    </View>
                    <View style={s.infoDivider} />
                    <View style={[s.infoItem, { paddingLeft: 12 }]}>
                      <Ionicons name="cash-outline" size={16} color="#9AA0B2" />
                      <Text style={s.infoItemText}>
                        {currentProfile.budget_max
                          ? `₹${currentProfile.budget_max}/mo`
                          : currentProfile.budget
                            ? toUI("pref_budget", currentProfile.budget)
                            : "-"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Lifestyle traits — only the ones this profile has set */}
                {traits.length > 0 && (
                  <View style={s.traitCard}>
                    <Text style={s.traitTitle}>Lifestyle</Text>
                    <View style={s.traitChips}>
                      {traits.map((t) => (
                        <View key={t.group} style={s.traitChip}>
                          <OptionIcon name={t.icon} size={14} color="#9AA0B2" />
                          <Text style={s.traitChipText}>{t.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Prompts and remaining photos, interleaved — see cardBlocks */}
                {cardBlocks.map((block, i) =>
                  block.kind === "prompt" ? (
                    <View
                      key={`prompt-${i}`}
                      style={
                        block.accent
                          ? [s.promptAccent, { backgroundColor: colors.tintViolet }]
                          : s.promptWhite
                      }
                    >
                      <Text style={block.accent ? s.promptAccentQ : s.promptQ}>
                        {block.q}
                      </Text>
                      <Text style={s.promptA}>{block.a}</Text>
                      <TouchableOpacity
                        style={block.accent ? s.promptHeartViolet : s.promptHeartGray}
                        activeOpacity={0.9}
                        onPress={handleLike}
                      >
                        <Ionicons
                          name="heart"
                          size={20}
                          color={
                            block.accent
                              ? remainingLikes > 0
                                ? colors.violet
                                : colors.placeholder
                              : "#C0C5D0"
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View key={`photo-${i}`} style={s.flatPhotoWrap}>
                      <Image
                        source={{ uri: block.url }}
                        style={s.flatPhoto}
                        resizeMode="cover"
                      />
                      {block.label && (
                        <View style={s.flatLabel}>
                          <Text style={s.flatLabelText}>{block.label}</Text>
                        </View>
                      )}
                    </View>
                  ),
                )}
              </ScrollView>
            </Animated.View>
            <TouchableOpacity style={s.skipBtn} onPress={handlePass}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <PreferencesSheet
        visible={prefsVisible}
        prefs={userPrefs}
        city={myProfile?.city}
        housing={{
          budgetMin: myProfile?.budget_min ?? 0,
          budgetMax: myProfile?.budget_max ?? 20000,
          moveInDate: typeof myProfile?.move_in_date === "string" ? myProfile.move_in_date.split("T")[0] : "",
        }}
        only={prefsSection}
        onClose={() => setPrefsVisible(false)}
        onSave={handleSavePrefs}
      />

      {matchData && (
        <MatchCelebration
          visible={!!matchData}
          matchedName={matchData.name}
          matchedPhoto={matchData.photo}
          onDismiss={() => setMatchData(null)}
          onChat={() => {
            setMatchData(null);
            router.push("/(tabs)/messages");
          }}
        />
      )}

      {likeSent && (
        <MatchCelebration
          visible={!!likeSent}
          mode="like"
          matchedName={likeSent.name}
          matchedPhoto={likeSent.photo}
          onDismiss={() => setLikeSent(null)}
        />
      )}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  headerBlock: { backgroundColor: colors.header },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 6,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  // Slightly wider than the two 18px circles so the added borders still overlap.
  logoWrap: { width: 32, height: 20, position: "relative" },
  circle: {
    position: "absolute",
    top: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    // Separates the two overlapping circles from each other and the panel.
    borderWidth: 1.5,
    borderColor: colors.header,
  },
  wordmark: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    color: colors.headerText,
    letterSpacing: -0.4,
  },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  likesPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.tintGreen,
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  likesPillText: {
    fontFamily: "SpaceMono_400Regular",
    fontSize: 10,
    color: "#22C55E",
    letterSpacing: 0.3,
  },
  filterIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  filterScroll: {
    flexShrink: 0,
    flexGrow: 0,
    maxHeight: 44,
  },
  filterRow: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
    gap: 8,
    flexDirection: "row",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 50,
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  filterChipActive: { backgroundColor: colors.blue },
  filterChipText: {
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize: 13,
    color: colors.ink,
  },
  filterChipTextActive: { color: "#fff" },

  separator: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.07)",
    marginHorizontal: -20,
  },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
  },
  bannerText: { flex: 1 },
  bannerClose: { opacity: 0.4, padding: 2 },
  bannerTitle: {
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize: 12,
    color: colors.ink,
  },
  bannerSub: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize: 11,
    color: colors.placeholder,
    marginTop: 1,
  },
  bannerBtn: {
    backgroundColor: colors.blue,
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  bannerBtnText: {
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize: 12,
    color: "#fff",
  },

  feedContent: { paddingHorizontal: 16, paddingTop: 12 },

  skipBtn: {
    position: "absolute",
    left: 22,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },

  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 120,
    paddingRight: 20,
  },
  menuBox: {
    backgroundColor: colors.card,
    borderRadius: 14,
    minWidth: 160,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize: 14,
    color: colors.ink,
  },
  menuDivider: { height: 1, backgroundColor: colors.border },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyText: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize: 14,
    color: colors.slate,
    textAlign: "center",
  },
  refreshBtn: {
    backgroundColor: colors.blue,
    borderRadius: 50,
    paddingHorizontal: 26,
    paddingVertical: 12,
  },
  refreshBtnText: {
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },

  // Card Styles matching blueprint
  cardOuter: { backgroundColor: colors.canvas },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingTop: 14,
    paddingBottom: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  name: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.violet,
    alignItems: "center",
    justifyContent: "center",
  },
  rolePill: { borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3 },
  rolePillText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12,
    color: "#fff",
    letterSpacing: -0.2,
  },
  // The actual Venn-overlap indicator — how much this candidate matches my
  // stated preferences (see lib/prefs.js#calculateOverlapScore).
  overlapPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.tintViolet,
  },
  // Mini version of the app's own two-circle Venn mark (see logoWrap/circle
  // in the header) — reused here so "overlap" reads as the same idea.
  overlapMark: { width: 16, height: 11, position: "relative" },
  overlapCircle: {
    position: "absolute",
    top: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.tintViolet,
  },
  overlapText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12,
    color: colors.violet,
    letterSpacing: -0.2,
  },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  pronouns: {
    fontFamily: "HankenGrotesk_400Regular",
    fontSize: 13,
    color: colors.placeholder,
  },
  dot: { fontSize: 13, color: colors.placeholder },
  active: {
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize: 13,
    color: colors.blue,
  },

  navBtns: { flexDirection: "row", gap: 8 },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  photoWrap: {
    position: "relative",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 10,
    height: 400,
  },
  photo: { width: "100%", height: "100%" },
  photoPlaceholder: {
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },

  heartBtn: {
    position: "absolute",
    bottom: 14,
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  heartBtnDisabled: { backgroundColor: colors.mist, shadowOpacity: 0 },

  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 10,
  },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  infoItemText: {
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize: 14,
    color: colors.ink,
  },
  infoDivider: { width: 1, height: 20, backgroundColor: colors.divider },
  infoHorizDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 8,
  },

  traitCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 10,
  },
  traitTitle: {
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize: 13,
    color: colors.slate,
    marginBottom: 12,
  },
  traitChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  traitChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.mist,
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  traitChipText: {
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize: 13,
    color: colors.ink,
  },

  promptWhite: {
    position: "relative",
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    paddingBottom: 60,
    marginBottom: 10,
  },
  promptQ: {
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize: 14,
    color: colors.slate,
    marginBottom: 10,
  },
  promptA: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  promptHeartGray: {
    position: "absolute",
    bottom: 14,
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },

  promptAccent: {
    position: "relative",
    borderRadius: 20,
    padding: 24,
    paddingBottom: 60,
    marginBottom: 10,
  },
  promptAccentQ: {
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize: 14,
    color: colors.violet,
    marginBottom: 10,
  },
  promptHeartViolet: {
    position: "absolute",
    bottom: 14,
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.violet,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  flatPhotoWrap: {
    position: "relative",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 10,
    height: 280,
  },
  flatPhoto: { width: "100%", height: "100%" },
  flatLabel: {
    position: "absolute",
    bottom: 14,
    left: 14,
    backgroundColor: "rgba(0,0,0,0.42)",
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  flatLabelText: {
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize: 12,
    color: "#fff",
  },
});
