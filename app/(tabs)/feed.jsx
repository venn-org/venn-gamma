import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Alert } from '../../lib/alert';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LikeLimitModal from '../../components/LikeLimitModal';
import MatchCelebration from '../../components/MatchCelebration';
import OptionIcon from '../../components/OptionIcon';
import PhotoLightbox from '../../components/PhotoLightbox';
import PreferencesSheet from '../../components/PreferencesSheet';
import { FeedCardSkeleton } from '../../components/Skeleton';
import RemoteImage from '../../components/RemoteImage';
import { getCurrentUserId } from '../../lib/auth';
import { blockUser, getBlockedIds } from '../../lib/blocks';
import {
  getRemainingLikes,
  grantExtraLikes,
  getTodayViewedProfileIds,
  recordProfileView,
} from '../../lib/dailyLimits';
import {
  formatBudgetRange,
  formatMoveInDate,
  mapDbPrefsToUI,
  mapUIPrefsToDb,
  optionDisplay,
  stripLabelEmoji,
  toDb,
  toUI,
} from '../../lib/enums';
import {
  PREF_ROWS,
  acceptingPrefGenders,
  buildFeedOrder,
  calculateOverlapScore,
  canReceiveLikeFrom,
  getPrefDisplay,
  interleaveByScore,
  isPrefSet,
  matchesPrefs,
} from '../../lib/prefs';
import { activeStatusText, isOnline } from '../../lib/presence';
import { REPORT_REASONS, reportUser } from '../../lib/reports';
import {
  buildFlatFacts,
  buildFlatGallery,
  buildProfileCardBlocks,
  buildProfileTraits,
  calculateProfileCompletion,
  isFeedReady,
} from '../../lib/profileUtils';
import { error as logError, describeError } from '../../lib/log';
import { FLAGS, LIMITS } from '../../config/flags';
import {
  attachFlatDetails,
  fetchFeedCandidates,
  fetchFeedPage,
  fetchMyProfile,
  updateMyProfile,
} from '../../services/profileService';
import { sendLike } from '../../services/likeService';
import { useTheme, useThemedStyles } from '../../lib/ThemeContext';

// Product switch, not implementation detail — see config/flags.js.
const VIEW_LIMIT_ON = FLAGS.dailyViewLimitEnabled;

// Role is deliberately absent — it's an identity switch, not a filter, so it
// only lives behind the options button.
const FILTER_CHIPS = PREF_ROWS.filter((row) => !row.roleOnly);

// Signature of the preferences a given feed list was built from. The same
// PreferencesSheet is also rendered by the Profile tab, so prefs can change
// while this screen is mounted but blurred; comparing this on focus catches
// that and re-filters, instead of leaving a stale list under chips that no
// longer describe it (an edit to "Women only" over there used to leave the
// already-fetched men on screen). Role is absent — it no longer filters.
const prefsKey = (p) =>
  JSON.stringify([
    p?.gender,
    p?.age,
    p?.areas,
    p?.flatType,
    p?.occupation,
    p?.food,
    p?.smoking,
    p?.drinking,
    p?.pets,
    p?.budgetMin,
    p?.budgetMax,
    p?.moveInDate,
  ]);

export default function FeedScreen() {
  const s = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Drives the requested image width, so a phone doesn't download a
  // tablet-sized variant. Recomputed on rotation / web resize.
  const { width: windowW } = useWindowDimensions();
  const cardImageW = windowW - 32; // screen minus feedContent's horizontal pad
  const galleryTileW = (cardImageW - 8) / 2;

  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Starts true so the very first paint is the skeleton, never the "no more
  // profiles" empty state — that message used to show for the whole cold
  // fetch and read as "this app has nobody in it".
  const [feedLoading, setFeedLoading] = useState(true);
  // prefsKey of the preferences `profiles` was actually built from — null until
  // the first successful fetch, so the mount focus always loads.
  const lastFeedPrefs = useRef(null);
  // Bumped on every card advance so the entrance animation fires even when the
  // index itself lands back on the value it already had (see advanceIndex).
  const [cardNonce, setCardNonce] = useState(0);

  const [prefsVisible, setPrefsVisible] = useState(false);
  const [prefsSection, setPrefsSection] = useState(null); // which chip opened the sheet, or null for the full sheet
  const [userPrefs, setUserPrefs] = useState(null);
  const [myProfile, setMyProfile] = useState(null);

  const [menuOpen, setMenuOpen] = useState(false);
  // The profile a report is being filed against; null while the sheet is shut.
  const [reportTarget, setReportTarget] = useState(null);
  const [showBanner, setShowBanner] = useState(true);
  const [remainingLikes, setRemainingLikes] = useState(5);

  // Match celebration state
  const [matchData, setMatchData] = useState(null);
  const [likeSent, setLikeSent] = useState(null);
  const likeSentTimer = useRef(null);

  useEffect(() => () => clearTimeout(likeSentTimer.current), []);

  const [limitVisible, setLimitVisible] = useState(false);

  // Animation. The card cross-fades and slides a little so a like/pass reads as
  // one card leaving and the next arriving, rather than a flat opacity blink.
  const fadeIn = useRef(new Animated.Value(0)).current;
  const cardShift = useRef(new Animated.Value(0)).current;
  // The profile body scrolls; without an explicit reset the next card inherits
  // the previous one's offset and opens halfway down.
  const cardScrollRef = useRef(null);

  // Runs the exit animation, resets the scroll position while the card is
  // invisible, then hands off to `advance` — the enter animation is driven by
  // the currentIndex effect below.
  const transitionCard = (advance) => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(cardShift, {
        toValue: -24,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      cardScrollRef.current?.scrollTo({ y: 0, animated: false });
      advance();
    });
  };

  useEffect(() => {
    const uid = getCurrentUserId();
    if (!uid) return;
    getRemainingLikes(uid).then(setRemainingLikes);
  }, []);

  // Monotonic request id. Two focuses in quick succession (or a pref save
  // racing a refocus) used to resolve in whatever order the network returned,
  // so a stale list could overwrite a fresh one; and a response landing after
  // the screen blurred still wrote state. Both are settled by ignoring any
  // response that is no longer the newest request.
  const feedRequestSeq = useRef(0);

  // My own gender, needed to apply the *other* side of the gender rule (which
  // profiles would accept a like from me). Held in a ref, not read from
  // `myProfile`, because fetchFeed runs in the same tick as the prefs fetch
  // that sets it — the state has not landed yet, exactly as with `userPrefs`.
  const myGenderRef = useRef(null);

  // Prefs first, then the feed. Firing both in parallel meant the very first
  // fetch filtered against `userPrefs === null`, i.e. against nothing — which
  // is why an explicit "men only" still returned women until prefs were
  // re-saved. This also runs on every focus (which covers the initial mount),
  // so preferences edited on the Profile tab re-filter the list here; without
  // the key check a plain refocus would refetch and throw away the user's
  // place in the deck.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      fetchMyPrefs().then((prefs) => {
        if (!active || !prefs) return;
        if (prefsKey(prefs) !== lastFeedPrefs.current) fetchFeed(prefs);
      });

      return () => {
        active = false;
        // Invalidate anything in flight so it can't write into a blurred screen.
        feedRequestSeq.current += 1;
      };
      // Deps are deliberately empty: fetchMyPrefs/fetchFeed are redefined on
      // every render, so listing them would re-run this effect continuously and
      // refetch the deck. They read their inputs at call time, so nothing here
      // goes stale. Extracting a useFeed() hook is the real fix.
    }, []),
  );

  useEffect(() => {
    // The list is at the top before the fresh card paints, so a mid-list
    // remount (refresh, filter change) can't leave it scrolled either.
    cardScrollRef.current?.scrollTo({ y: 0, animated: false });
    fadeIn.setValue(0);
    cardShift.setValue(20);
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(cardShift, {
        toValue: 0,
        friction: 9,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();

    // Record profile view when a new profile is shown. TEMP: skipped while the
    // view limit is off — cycling re-shows every profile, so logging each pass
    // would write rows that only matter once the limit comes back.
    const uid = getCurrentUserId();
    if (!VIEW_LIMIT_ON && uid && currentProfile) {
      recordProfileView(uid, currentProfile.id);
    }
  }, [currentIndex, cardNonce, profiles]);

  const fetchMyPrefs = async () => {
    const uid = getCurrentUserId();
    if (!uid) return null;
    const data = await fetchMyProfile(uid);
    if (!data) return null;
    const prefs = mapDbPrefsToUI(data);
    myGenderRef.current = data.gender ?? null;
    setUserPrefs(prefs);
    setMyProfile(data);
    // Returned as well as set: fetchFeed needs the prefs in the same tick, and
    // the `userPrefs` state won't have landed yet.
    return prefs;
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
    const { error } = await updateMyProfile(uid, updates);
    if (error) {
      Alert.alert('Error', "Couldn't save your preferences. Please try again.");
      return;
    }
    if (housing) {
      setMyProfile((p) =>
        p
          ? {
              ...p,
              budget_min: housing.budgetMin,
              budget_max: housing.budgetMax,
              move_in_date: housing.moveInDate || null,
            }
          : p,
      );
    }
    fetchFeed(mergedPrefs);
  };

  /**
   * Gender is the only hard preference (see lib/prefs.js#matchesPrefs), so it
   * is pushed into the query rather than applied to the fetched page. With it
   * applied afterwards, a "women only" preference could have most of the row
   * budget spent on profiles that were then discarded, leaving a short deck
   * for no reason the user could see. matchesPrefs still runs below and
   * remains the single source of truth for the rule.
   */
  const genderColumnFilter = (prefs) => {
    const genderPref = toDb('pref_gender', prefs?.gender);
    if (!genderPref || genderPref === 'any_gender') return null;
    return genderPref === 'women_only' ? 'woman' : 'man';
  };

  const fetchFeed = async (currentPrefs = userPrefs) => {
    const uid = getCurrentUserId();
    if (!uid) {
      // Nothing to wait for — drop the skeleton rather than pulsing forever.
      setFeedLoading(false);
      return;
    }

    const seq = ++feedRequestSeq.current;
    const isCurrent = () => seq === feedRequestSeq.current;

    // Every path into fetchFeed either starts empty (cold load) or is about to
    // replace the whole list (pref/filter change, manual refresh), so there's
    // no content for the skeleton to yank out from under the user.
    setFeedLoading(true);
    try {
      setCurrentIndex(0);

      // Preferred path: the database ranks the entire eligible pool and returns
      // one page in score order. Everything the block below does — blocks,
      // viewed-today, incomplete profiles, both halves of the gender rule, and
      // the overlap scoring itself — is already applied in SQL, so there is
      // nothing to filter and nothing to re-sort. See
      // supabase/migrations/20260731000000_feed_ranking_rpc.sql.
      const page = await fetchFeedPage({
        limit: VIEW_LIMIT_ON ? LIMITS.feedPageSizeLimited : LIMITS.feedPageSize,
        excludeViewed: VIEW_LIMIT_ON,
      });
      if (!isCurrent()) return;

      if (page.ranked) {
        if (page.error) {
          logError('Feed query failed', describeError(page.error));
          Alert.alert('Error', 'Failed to load profiles. Please try again.');
          return;
        }
        // The RPC returns the badge as `overlap_score`; the card reads
        // `_overlap`, and interleaveByScore needs it under that name too.
        const ranked = page.data.map((p) => ({ ...p, _overlap: p.overlap_score ?? null }));
        const withFlats = await attachFlatDetails(ranked);
        if (!isCurrent()) return;

        setProfiles(interleaveByScore(withFlats));
        lastFeedPrefs.current = prefsKey(currentPrefs);
        return;
      }

      // Fallback: the migration has not been applied to this database. Fetch a
      // recency-ordered page and do all of the above on the client.
      const [blocked, viewedToday] = await Promise.all([
        getBlockedIds(uid),
        VIEW_LIMIT_ON ? getTodayViewedProfileIds(uid) : Promise.resolve(new Set()),
      ]);
      if (!isCurrent()) return;

      // Deliberately unfiltered beyond the essentials (not me, not paused,
      // onboarded, gender). Role used to invert here so seekers only saw
      // owners, but that halved an already-small pool and left new users
      // staring at an empty feed — everyone sees everyone for now, and role
      // still shows on the card via the "Has a flat" / "Looking for flat" pill.
      //
      // The cap keeps a day's view budget from being burned in one fetch; with
      // the view limit off it just bounds the cycle.
      const myGender = myGenderRef.current;

      const { data, error } = await fetchFeedCandidates({
        uid,
        limit: VIEW_LIMIT_ON ? LIMITS.feedPageSizeLimited : LIMITS.feedPageSize,
        genderFilter: genderColumnFilter(currentPrefs),
        // The other half of the gender rule: drop anyone whose own preference
        // would refuse a like from me, so the deck holds no cards whose like
        // button can only fail.
        acceptingPrefs: acceptingPrefGenders(myGender),
      });
      if (!isCurrent()) return;

      if (error) {
        logError('Feed query failed', describeError(error));
        Alert.alert('Error', 'Failed to load profiles. Please try again.');
        return;
      }

      const filtered = data.filter((p) => {
        if (blocked.has(p.id)) return false;
        if (viewedToday.has(p.id)) return false;

        // Skip incomplete profiles — they render as empty cards
        if (!isFeedReady(p)) return false;

        // Belt and braces against the two halves of the rule: mine about them,
        // and theirs about me. Both are already applied in SQL above; these
        // stay as the single source of truth for the semantics.
        if (!canReceiveLikeFrom(p, { gender: myGender })) return false;

        return matchesPrefs(currentPrefs, p);
      });

      const withFlats = await attachFlatDetails(filtered);
      if (!isCurrent()) return;

      // Ordered last, so the flat photos attached above ride along.
      setProfiles(buildFeedOrder(currentPrefs, withFlats));
      // Recorded only once a list actually lands, so a failed fetch doesn't
      // convince the next focus that these prefs are already applied.
      lastFeedPrefs.current = prefsKey(currentPrefs);
    } finally {
      if (isCurrent()) setFeedLoading(false);
    }
  };

  const currentProfile = profiles[currentIndex];
  // buildFeedOrder already scored every card; only fall back for profiles that
  // reached state some other way.
  const overlapScore = !currentProfile
    ? null
    : currentProfile._overlap !== undefined
      ? currentProfile._overlap
      : calculateOverlapScore(userPrefs, currentProfile);

  const cardBlocks = useMemo(() => buildProfileCardBlocks(currentProfile), [currentProfile]);
  const traits = useMemo(() => buildProfileTraits(currentProfile), [currentProfile]);
  const flatFacts = useMemo(() => buildFlatFacts(currentProfile), [currentProfile]);
  const flatGallery = useMemo(() => buildFlatGallery(currentProfile), [currentProfile]);
  // Which flat photo the lightbox opened on; null while it's closed. Reset on
  // card change so a pass/like never leaves the previous flat's photo open.
  const [lightboxIndex, setLightboxIndex] = useState(null);
  useEffect(() => setLightboxIndex(null), [currentIndex]);

  // TEMP: with the view limit off, wrap back to the start instead of
  // dead-ending once the list runs out, so profiles cycle like before.
  const advanceIndex = () => {
    setCurrentIndex((i) => {
      const next = i + 1;
      // Wrapping needs at least two profiles to be a cycle. With one, `% 1`
      // pins the index to the same card forever and a pass/like looks broken —
      // fall through to the exhausted state instead.
      if (VIEW_LIMIT_ON && profiles.length > 1) {
        return next % profiles.length;
      }
      return next;
    });
    // Wrapping a single-profile pool lands on the index it started from, and
    // React bails out of re-rendering an unchanged value — which would leave
    // the card stuck at the exit animation's opacity: 0. The nonce always
    // changes, so the entrance below always runs.
    setCardNonce((n) => n + 1);
  };

  const handlePass = async () => {
    const uid = getCurrentUserId();
    // Record the skip/pass as a view so it doesn't show up again today. TEMP:
    // skipped while the view limit is off, which also drops an awaited network
    // round-trip from the front of the pass animation.
    if (!VIEW_LIMIT_ON && uid && currentProfile) {
      await recordProfileView(uid, currentProfile.id);
    }

    transitionCard(advanceIndex);
  };

  // Guards against a second like being issued while the first is in flight.
  // The server rejects the overspend either way (like_profile holds a
  // per-user advisory lock), but without this the UI still animates the card
  // away for a like that was never accepted.
  const likeInFlight = useRef(false);

  const handleLike = async () => {
    const uid = getCurrentUserId();
    if (!uid || !currentProfile || likeInFlight.current) return;

    // Advisory pre-check so the paywall sheet opens immediately instead of
    // after a round-trip. Enforcement is the server's (see
    // supabase/migrations/20260729120000_like_profile_rpc.sql).
    if (remainingLikes <= 0) {
      setLimitVisible(true);
      return;
    }

    likeInFlight.current = true;

    // Snapshot what the celebration needs: the card advances below, so
    // `currentProfile` is a different person by the time this resolves.
    const target = {
      id: currentProfile.id,
      name: currentProfile.name,
      photo: currentProfile.photos?.[0] || null,
    };

    // Optimistic: decrement now so a fast second tap sees the lower number.
    setRemainingLikes((n) => Math.max(0, n - 1));
    transitionCard(advanceIndex);

    try {
      const result = await sendLike(uid, target.id);

      if (result.error) {
        logError('Failed to send like', describeError(result.error));
        Alert.alert('Error', 'Failed to send like');
        setRemainingLikes(await getRemainingLikes(uid));
        return;
      }

      if (!result.ok) {
        // Roll the counter back to whatever the server says is true — a
        // refused like is never charged.
        setRemainingLikes(result.remaining ?? 0);

        if (result.reason === 'limit_reached') {
          // Out of likes: offering more is the useful response.
          setLimitVisible(true);
          return;
        }

        // 'not_accepted' (the recipient's gender preference excludes this
        // profile) and 'blocked' are both permanent for this pair, so the
        // like-limit sheet would be actively misleading — no number of extra
        // likes changes the outcome. The card has already advanced, which is
        // the right outcome either way: it isn't coming back.
        //
        // Deliberately worded without revealing the recipient's preference or
        // that a block exists — both would leak something about them.
        Alert.alert('Not available', "You can't like this profile right now.");
        return;
      }

      // `remaining` comes back from the same transaction that spent the like,
      // so it needs no second query. The fallback path returns null.
      setRemainingLikes(result.remaining ?? (await getRemainingLikes(uid)));

      // create_match_on_mutual_like runs as part of the insert, so a match
      // completed by this like is already visible — tying the celebration to
      // this user's own action rather than to a broad realtime subscription
      // on every match event.
      if (result.matched) {
        setMatchData({ name: target.name, photo: target.photo, matchId: result.matchId });
      } else {
        // Quick feedback loop — auto-dismisses so it doesn't block swiping
        setLikeSent({ name: target.name, photo: target.photo });
        clearTimeout(likeSentTimer.current);
        likeSentTimer.current = setTimeout(() => setLikeSent(null), 1800);
      }
    } finally {
      likeInFlight.current = false;
    }
  };

  const handleReport = () => {
    setMenuOpen(false);
    // Capture the profile now — submitting advances the card, and the sheet
    // needs to know who it was filed against after that.
    setReportTarget(currentProfile);
  };

  const submitReport = async (reasonCode) => {
    const uid = getCurrentUserId();
    const target = reportTarget;
    setReportTarget(null);
    if (!uid || !target) return;

    const { error } = await reportUser(uid, target.id, reasonCode);
    if (error) {
      console.error('reportUser failed:', error);
      Alert.alert('Error', "Couldn't submit that report. Please try again.");
      return;
    }

    Alert.alert(
      'Report submitted',
      'Our safety team will review this. Thanks for keeping Venn safe.',
    );
    handlePass();
  };

  const handleBlock = async () => {
    setMenuOpen(false);
    const uid = getCurrentUserId();
    if (!uid || !currentProfile) return;

    // blockUser (lib/blocks) also closes any existing match, which a bare
    // insert into `blocks` did not — blocking someone left the conversation
    // open on both sides.
    const { error } = await blockUser(uid, currentProfile.id);

    if (error) {
      logError('Failed to block user', describeError(error));
      Alert.alert('Error', "Couldn't block that profile. Please try again.");
      return;
    }
    handlePass();
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
            : chip.multi
              ? userPrefs?.[chip.key]?.[0]
              : userPrefs?.[chip.key];
          const chipIcon = optionDisplay(chip.enumKey, chipValue).icon;
          const chipText = active
            ? getPrefDisplay(userPrefs, chip.key, chip.label, chip.multi)
            : chip.label;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[s.filterChip, active && s.filterChipActive]}
              activeOpacity={0.8}
              onPress={() => {
                setPrefsSection(chip.key);
                setPrefsVisible(true);
              }}
            >
              <OptionIcon name={chipIcon} size={13} color={active ? '#fff' : colors.ink} />
              <Text style={[s.filterChipText, active && s.filterChipTextActive]}>
                {chipIcon ? stripLabelEmoji(chipText) : chipText}
              </Text>
              <Ionicons
                name="chevron-down"
                size={12}
                color={active ? '#fff' : colors.ink}
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
              onPress={() => router.push('/(settings)/edit-profile')}
              activeOpacity={0.85}
            >
              <Text style={s.bannerBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.bannerClose} onPress={() => setShowBanner(false)}>
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
              <View style={[s.circle, { backgroundColor: colors.blue, left: 0 }]} />
              <View
                style={[s.circle, { backgroundColor: colors.violet, right: 0, opacity: 0.9 }]}
              />
            </View>
            <Text style={s.wordmark}>Venn</Text>
          </View>
          <View style={s.topBarRight}>
            <View style={s.likesPill}>
              <Ionicons name="heart" size={12} color={remainingLikes > 0 ? '#22C55E' : '#FF4D6A'} />
              <Text
                style={[s.likesPillText, { color: remainingLikes > 0 ? '#22C55E' : '#FF4D6A' }]}
              >
                {remainingLikes} {remainingLikes === 1 ? 'like' : 'likes'} left
              </Text>
            </View>
            <TouchableOpacity
              style={s.filterIconBtn}
              activeOpacity={0.8}
              onPress={() => {
                setPrefsSection(null);
                setPrefsVisible(true);
              }}
            >
              <Ionicons name="options-outline" size={18} color={colors.ink} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Feed Content */}
      <View
        style={[s.feedContent, { flex: 1 }, !feedLoading && !currentProfile && { paddingTop: 0 }]}
      >
        {feedLoading ? (
          // The chips stay live above the skeleton — they're driven by prefs,
          // not by this fetch, so hiding them would make the filter row pop in
          // a beat after the card.
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {renderScrollTopSection()}
            <FeedCardSkeleton />
          </ScrollView>
        ) : !currentProfile ? (
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
          >
            {renderScrollTopSection()}
            <View style={[s.empty, { flex: 1 }]}>
              <Text style={s.emptyText}>No more profiles found. Come back tomorrow.</Text>
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
            <Animated.View
              style={[
                s.cardOuter,
                { flex: 1, opacity: fadeIn, transform: [{ translateY: cardShift }] },
              ]}
            >
              {menuOpen && (
                <Modal
                  visible
                  transparent
                  animationType="fade"
                  onRequestClose={() => setMenuOpen(false)}
                >
                  <Pressable style={s.menuBackdrop} onPress={() => setMenuOpen(false)}>
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

              {reportTarget && (
                <Modal
                  visible
                  transparent
                  animationType="fade"
                  onRequestClose={() => setReportTarget(null)}
                >
                  <Pressable style={s.reportBackdrop} onPress={() => setReportTarget(null)}>
                    {/* Stop taps inside the sheet from dismissing it. */}
                    <Pressable style={s.reportBox} onPress={() => {}}>
                      <Text style={s.reportTitle}>
                        Report {reportTarget.name || 'this profile'}
                      </Text>
                      <Text style={s.reportSub}>What's going on? Your report is anonymous.</Text>
                      {REPORT_REASONS.map((r) => (
                        <TouchableOpacity
                          key={r.code}
                          style={s.menuItem}
                          onPress={() => submitReport(r.code)}
                        >
                          <Text style={s.menuItemText}>{r.label}</Text>
                        </TouchableOpacity>
                      ))}
                      <View style={s.menuDivider} />
                      <TouchableOpacity style={s.menuItem} onPress={() => setReportTarget(null)}>
                        <Text style={[s.menuItemText, { color: colors.slate }]}>Cancel</Text>
                      </TouchableOpacity>
                    </Pressable>
                  </Pressable>
                </Modal>
              )}

              {/* Scrollable Profile Content */}
              <ScrollView
                ref={cardScrollRef}
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
                            <View
                              style={[s.overlapCircle, { backgroundColor: colors.blue, left: 0 }]}
                            />
                            <View
                              style={[
                                s.overlapCircle,
                                { backgroundColor: colors.violet, right: 0, opacity: 0.9 },
                              ]}
                            />
                          </View>
                          <Text style={s.overlapText}>{overlapScore}% overlap</Text>
                        </View>
                      )}
                    </View>
                    <View style={s.statusRow}>
                      <Text style={s.pronouns}>{currentProfile.pronouns?.[0] || '-'}</Text>
                      <Text style={s.dot}> • </Text>
                      <Text
                        style={[
                          s.active,
                          !isOnline(currentProfile.last_active_at) && { color: colors.slate },
                        ]}
                      >
                        {activeStatusText(currentProfile.last_active_at)}
                      </Text>
                      <View
                        style={[
                          s.rolePill,
                          {
                            backgroundColor:
                              currentProfile.user_type === 'owner' ? colors.blue : colors.violet,
                            marginLeft: 8,
                          },
                        ]}
                      >
                        <Text style={s.rolePillText}>
                          {currentProfile.user_type === 'owner' ? 'Has a flat' : 'Looking for flat'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={s.navBtns}>
                    <TouchableOpacity style={s.navBtn} onPress={() => setMenuOpen(true)}>
                      <Ionicons name="ellipsis-horizontal" size={18} color={colors.ink} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.photoWrap}>
                  {currentProfile.photos?.[0] ? (
                    <RemoteImage
                      uri={currentProfile.photos[0]}
                      width={cardImageW}
                      style={s.photo}
                      priority="high"
                    />
                  ) : (
                    <View style={[s.photo, s.photoPlaceholder]}>
                      <Text style={{ color: '#9AA0B2' }}>No Photo</Text>
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
                      <Ionicons name="calendar-outline" size={16} color="#9AA0B2" />
                      <Text style={s.infoItemText}>{currentProfile.age || '-'}</Text>
                    </View>
                    <View style={s.infoDivider} />
                    <View style={[s.infoItem, { paddingLeft: 12 }]}>
                      <Ionicons name="person-outline" size={16} color="#9AA0B2" />
                      <Text style={s.infoItemText}>
                        {toUI('gender', currentProfile.gender) || '-'}
                      </Text>
                    </View>
                  </View>
                  <View style={s.infoHorizDivider} />
                  <View style={s.infoRow}>
                    <View style={s.infoItem}>
                      <Ionicons name="location-outline" size={16} color="#9AA0B2" />
                      {/* distance_km is only present on the ranked path, and
                          only when both sides have coordinates — the free-text
                          location stays the primary label either way. */}
                      <Text style={s.infoItemText}>
                        {currentProfile.distance_km != null
                          ? `${currentProfile.distance_km} km away`
                          : currentProfile.location || '-'}
                      </Text>
                    </View>
                    <View style={s.infoDivider} />
                    <View style={[s.infoItem, { paddingLeft: 12 }]}>
                      <Ionicons name="cash-outline" size={16} color="#9AA0B2" />
                      <Text style={s.infoItemText}>
                        {currentProfile.budget_max
                          ? `₹${currentProfile.budget_max}/mo`
                          : currentProfile.budget
                            ? toUI('pref_budget', currentProfile.budget)
                            : '-'}
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
                  block.kind === 'prompt' ? (
                    <View
                      key={`prompt-${i}`}
                      style={
                        block.accent
                          ? [s.promptAccent, { backgroundColor: colors.tintViolet }]
                          : s.promptWhite
                      }
                    >
                      <Text style={block.accent ? s.promptAccentQ : s.promptQ}>{block.q}</Text>
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
                              : '#C0C5D0'
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View key={`photo-${i}`} style={s.flatPhotoWrap}>
                      <RemoteImage uri={block.url} width={cardImageW} style={s.flatPhoto} />
                      {block.label && (
                        <View style={s.flatLabel}>
                          <Text style={s.flatLabelText}>{block.label}</Text>
                        </View>
                      )}
                    </View>
                  ),
                )}

                {/* Owners' flat: the facts, then every room photo as one
                    gallery — placed after the prompts so the six labelled
                    rooms don't swamp the prompt sequence. */}
                {(flatFacts.length > 0 || flatGallery.length > 0) && (
                  <View style={s.flatSection}>
                    <Text style={s.flatSectionTitle}>The flat</Text>
                    {flatFacts.map((f) => (
                      <View key={f.key} style={s.flatFactRow}>
                        <Ionicons name={f.icon} size={15} color="#9AA0B2" />
                        <Text style={s.flatFactText}>{f.text}</Text>
                      </View>
                    ))}
                    {currentProfile.flat_description ? (
                      <Text style={s.flatDescription}>{currentProfile.flat_description}</Text>
                    ) : null}

                    {flatGallery.length > 0 && (
                      <View style={s.galleryGrid}>
                        {flatGallery.map((photo, i) => (
                          <TouchableOpacity
                            key={`flat-${i}`}
                            style={s.galleryTile}
                            activeOpacity={0.85}
                            onPress={() => setLightboxIndex(i)}
                          >
                            <RemoteImage
                              uri={photo.url}
                              width={galleryTileW}
                              style={s.galleryPhoto}
                            />
                            {photo.label && (
                              <View style={[s.flatLabel, s.galleryLabel]}>
                                <Text style={s.flatLabelText}>{photo.label}</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
            </Animated.View>
            <TouchableOpacity style={s.skipBtn} onPress={handlePass}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <PhotoLightbox
        visible={lightboxIndex !== null}
        photos={flatGallery}
        startIndex={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
      />

      <PreferencesSheet
        visible={prefsVisible}
        prefs={userPrefs}
        city={myProfile?.city}
        housing={{
          budgetMin: myProfile?.budget_min ?? 0,
          budgetMax: myProfile?.budget_max ?? 20000,
          moveInDate:
            typeof myProfile?.move_in_date === 'string' ? myProfile.move_in_date.split('T')[0] : '',
        }}
        only={prefsSection}
        onClose={() => setPrefsVisible(false)}
        onSave={handleSavePrefs}
      />

      <LikeLimitModal
        visible={limitVisible}
        onClose={() => setLimitVisible(false)}
        onConfirm={async () => {
          const uid = getCurrentUserId();
          if (uid) {
            await grantExtraLikes(uid);
            setRemainingLikes(await getRemainingLikes(uid));
          }
          setLimitVisible(false);
        }}
      />

      {matchData && (
        <MatchCelebration
          visible={!!matchData}
          matchedName={matchData.name}
          matchedPhoto={matchData.photo}
          onDismiss={() => setMatchData(null)}
          onChat={() => {
            setMatchData(null);
            router.push('/(tabs)/messages');
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

const makeStyles = (colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.canvas },
    headerBlock: { backgroundColor: colors.header },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 6,
      paddingBottom: 6,
    },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    // Slightly wider than the two 18px circles so the added borders still overlap.
    logoWrap: { width: 32, height: 20, position: 'relative' },
    circle: {
      position: 'absolute',
      top: 0,
      width: 20,
      height: 20,
      borderRadius: 10,
      // Separates the two overlapping circles from each other and the panel.
      borderWidth: 1.5,
      borderColor: colors.header,
    },
    wordmark: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 18,
      color: colors.headerText,
      letterSpacing: -0.4,
    },
    topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    likesPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.tintGreen,
      borderRadius: 50,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    likesPillText: {
      fontFamily: 'SpaceMono_400Regular',
      fontSize: 10,
      color: '#22C55E',
      letterSpacing: 0.3,
    },
    filterIconBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
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
      flexDirection: 'row',
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 50,
      backgroundColor: colors.card,
      shadowColor: '#000',
      shadowOpacity: 0.07,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    filterChipActive: { backgroundColor: colors.blue },
    filterChipText: {
      fontFamily: 'HankenGrotesk_600SemiBold',
      fontSize: 13,
      color: colors.ink,
    },
    filterChipTextActive: { color: '#fff' },

    separator: {
      height: 1,
      backgroundColor: 'rgba(0,0,0,0.07)',
      marginHorizontal: -20,
    },

    banner: {
      flexDirection: 'row',
      alignItems: 'center',
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
      fontFamily: 'HankenGrotesk_600SemiBold',
      fontSize: 12,
      color: colors.ink,
    },
    bannerSub: {
      fontFamily: 'HankenGrotesk_400Regular',
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
      fontFamily: 'HankenGrotesk_600SemiBold',
      fontSize: 12,
      color: '#fff',
    },

    feedContent: { paddingHorizontal: 16, paddingTop: 12 },

    skipBtn: {
      position: 'absolute',
      left: 22,
      bottom: 32,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 5,
    },

    menuBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 120,
      paddingRight: 20,
    },
    menuBox: {
      backgroundColor: colors.card,
      borderRadius: 14,
      minWidth: 160,
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    menuItemText: {
      fontFamily: 'HankenGrotesk_400Regular',
      fontSize: 14,
      color: colors.ink,
    },
    menuDivider: { height: 1, backgroundColor: colors.border },

    // The report sheet is a centred dialog rather than the anchored popover
    // menuBackdrop positions, so it gets its own backdrop.
    reportBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    reportBox: {
      backgroundColor: colors.card,
      borderRadius: 18,
      width: '100%',
      maxWidth: 360,
      paddingVertical: 8,
      overflow: 'hidden',
    },
    reportTitle: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 17,
      color: colors.ink,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    reportSub: {
      fontFamily: 'HankenGrotesk_400Regular',
      fontSize: 13,
      color: colors.slate,
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 8,
    },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    emptyText: {
      fontFamily: 'HankenGrotesk_400Regular',
      fontSize: 14,
      color: colors.slate,
      textAlign: 'center',
    },
    refreshBtn: {
      backgroundColor: colors.blue,
      borderRadius: 50,
      paddingHorizontal: 26,
      paddingVertical: 12,
    },
    refreshBtnText: {
      fontFamily: 'HankenGrotesk_600SemiBold',
      fontSize: 14,
      color: '#fff',
    },

    // Card Styles matching blueprint
    cardOuter: { backgroundColor: colors.canvas },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
      paddingTop: 14,
      paddingBottom: 12,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    name: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 22,
      color: colors.ink,
      letterSpacing: -0.4,
    },
    verifiedBadge: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.violet,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rolePill: { borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3 },
    rolePillText: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 12,
      color: '#fff',
      letterSpacing: -0.2,
    },
    // The actual Venn-overlap indicator — how much this candidate matches my
    // stated preferences (see lib/prefs.js#calculateOverlapScore).
    overlapPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 50,
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: colors.tintViolet,
    },
    // Mini version of the app's own two-circle Venn mark (see logoWrap/circle
    // in the header) — reused here so "overlap" reads as the same idea.
    overlapMark: { width: 16, height: 11, position: 'relative' },
    overlapCircle: {
      position: 'absolute',
      top: 0,
      width: 11,
      height: 11,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.tintViolet,
    },
    overlapText: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 12,
      color: colors.violet,
      letterSpacing: -0.2,
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
    pronouns: {
      fontFamily: 'HankenGrotesk_400Regular',
      fontSize: 13,
      color: colors.placeholder,
    },
    dot: { fontSize: 13, color: colors.placeholder },
    active: {
      fontFamily: 'HankenGrotesk_600SemiBold',
      fontSize: 13,
      color: colors.blue,
    },

    navBtns: { flexDirection: 'row', gap: 8 },
    navBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },

    photoWrap: {
      position: 'relative',
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 10,
      height: 400,
    },
    photo: { width: '100%', height: '100%' },
    photoPlaceholder: {
      backgroundColor: colors.canvas,
      alignItems: 'center',
      justifyContent: 'center',
    },

    heartBtn: {
      position: 'absolute',
      bottom: 14,
      right: 14,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
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
    infoRow: { flexDirection: 'row', alignItems: 'center' },
    infoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoItemText: {
      fontFamily: 'HankenGrotesk_600SemiBold',
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
      fontFamily: 'HankenGrotesk_600SemiBold',
      fontSize: 13,
      color: colors.slate,
      marginBottom: 12,
    },
    traitChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    traitChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.mist,
      borderRadius: 50,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    traitChipText: {
      fontFamily: 'HankenGrotesk_600SemiBold',
      fontSize: 13,
      color: colors.ink,
    },

    promptWhite: {
      position: 'relative',
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      paddingBottom: 60,
      marginBottom: 10,
    },
    promptQ: {
      fontFamily: 'HankenGrotesk_600SemiBold',
      fontSize: 14,
      color: colors.slate,
      marginBottom: 10,
    },
    promptA: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 22,
      color: colors.ink,
      letterSpacing: -0.4,
      lineHeight: 30,
    },
    promptHeartGray: {
      position: 'absolute',
      bottom: 14,
      right: 14,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.canvas,
      alignItems: 'center',
      justifyContent: 'center',
    },

    promptAccent: {
      position: 'relative',
      borderRadius: 20,
      padding: 24,
      paddingBottom: 60,
      marginBottom: 10,
    },
    promptAccentQ: {
      fontFamily: 'HankenGrotesk_600SemiBold',
      fontSize: 14,
      color: colors.violet,
      marginBottom: 10,
    },
    promptHeartViolet: {
      position: 'absolute',
      bottom: 14,
      right: 14,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.violet,
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },

    flatPhotoWrap: {
      position: 'relative',
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 10,
      height: 280,
    },
    flatPhoto: { width: '100%', height: '100%' },

    flatSection: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 18,
      marginBottom: 10,
    },
    flatSectionTitle: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 18,
      color: colors.ink,
      letterSpacing: -0.3,
      marginBottom: 12,
    },
    flatFactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    flatFactText: {
      fontFamily: 'HankenGrotesk_600SemiBold',
      fontSize: 14,
      color: colors.ink,
    },
    flatDescription: {
      fontFamily: 'HankenGrotesk_400Regular',
      fontSize: 14,
      color: colors.slate,
      lineHeight: 21,
      marginTop: 4,
    },
    // Two-up tiles: flexBasis leaves room for the 8px gap, flexGrow lets a lone
    // trailing photo stretch to the full width instead of sitting half-empty.
    galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    galleryTile: {
      position: 'relative',
      flexGrow: 1,
      flexBasis: '47%',
      aspectRatio: 1,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: colors.mist,
    },
    galleryPhoto: { width: '100%', height: '100%' },
    galleryLabel: { bottom: 8, left: 8, paddingHorizontal: 10, paddingVertical: 4 },
    flatLabel: {
      position: 'absolute',
      bottom: 14,
      left: 14,
      backgroundColor: 'rgba(0,0,0,0.42)',
      borderRadius: 50,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    flatLabelText: {
      fontFamily: 'HankenGrotesk_600SemiBold',
      fontSize: 12,
      color: '#fff',
    },
  });
