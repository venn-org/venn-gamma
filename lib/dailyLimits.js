import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

const DAILY_LIKES = 5;
const DAILY_VIEWS = 10;

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

export async function getTodayLikes(uid) {
  if (!uid) return 0;
  const today = getTodayString();
  const { count, error } = await supabase
    .from("likes")
    .select("id", { count: "exact", head: true })
    .eq("from_user_id", uid)
    .gte("created_at", `${today}T00:00:00Z`)
    .lte("created_at", `${today}T23:59:59Z`);

  if (error) {
    console.error("getTodayLikes failed:", error);
    return 0;
  }
  return count ?? 0;
}

// TEMP: stands in for the premium "more likes" purchase. The allowance is a
// locally stored bonus rather than a delete of today's `likes` rows — resetting
// by deletion would wipe real likes and the matches they created.
const BONUS_LIKES_GRANT = 5;

function bonusKey(uid) {
  return `venn_like_bonus_${uid}_${getTodayString()}`;
}

export async function getBonusLikes(uid) {
  if (!uid) return 0;
  try {
    return parseInt((await AsyncStorage.getItem(bonusKey(uid))) ?? "0", 10) || 0;
  } catch (e) {
    return 0;
  }
}

export async function grantExtraLikes(uid, amount = BONUS_LIKES_GRANT) {
  if (!uid) return 0;
  const next = (await getBonusLikes(uid)) + amount;
  try {
    await AsyncStorage.setItem(bonusKey(uid), String(next));
  } catch (e) {
    console.warn("grantExtraLikes failed to persist:", e);
  }
  return next;
}

export async function getRemainingLikes(uid) {
  const [used, bonus] = await Promise.all([getTodayLikes(uid), getBonusLikes(uid)]);
  return Math.max(0, DAILY_LIKES + bonus - used);
}

export async function canLikeToday(uid) {
  const remaining = await getRemainingLikes(uid);
  return remaining > 0;
}

export async function getTodayViews(uid) {
  if (!uid) return 0;
  try {
    const today = getTodayString();
    const { count, error } = await supabase
      .from("profile_views")
      .select("id", { count: "exact", head: true })
      .eq("viewer_id", uid)
      .gte("viewed_at", `${today}T00:00:00Z`)
      .lte("viewed_at", `${today}T23:59:59Z`);

    if (error) throw error;
    return count ?? 0;
  } catch (e) {
    console.warn("getTodayViews DB failed, using localStorage fallback");
    return getTodayViewsFromStorage(uid);
  }
}

export async function getRemainingViews(uid) {
  const used = await getTodayViews(uid);
  return Math.max(0, DAILY_VIEWS - used);
}

export async function recordProfileView(uid, targetId) {
  if (!uid || !targetId) return;

  // supabase-js resolves with `{ error }` rather than throwing, so this has to
  // be checked explicitly — the try/catch this used to rely on never fired,
  // which meant the fallback below was unreachable and every failure was
  // swallowed silently.
  const { error } = await supabase.from("profile_views").insert({
    viewer_id: uid,
    viewed_id: targetId,
    viewed_at: new Date().toISOString(),
  });

  // A repeat view of the same profile on the same day trips
  // uq_profile_views_pair_day. That's the constraint working, not a failure.
  if (!error || error.code === "23505") return;

  console.warn("recordProfileView DB failed, using local fallback:", error.message ?? error);
  try {
    const today = getTodayString();
    const key = `venn_views_${uid}_${today}`;
    const current = JSON.parse((await AsyncStorage.getItem(key)) ?? "[]");
    if (!current.includes(targetId)) {
      current.push(targetId);
      await AsyncStorage.setItem(key, JSON.stringify(current));
    }
  } catch (e) {
    console.warn("local view fallback also failed:", e);
  }
}

export async function getTodayViewsFromStorage(uid) {
  try {
    const today = getTodayString();
    const key = `venn_views_${uid}_${today}`;
    const views = JSON.parse((await AsyncStorage.getItem(key)) ?? "[]");
    return views.length;
  } catch (e) {
    return 0;
  }
}

export async function getTodayViewedProfileIds(uid) {
  if (!uid) return new Set();
  try {
    const today = getTodayString();
    const { data, error } = await supabase
      .from("profile_views")
      .select("viewed_id")
      .eq("viewer_id", uid)
      .gte("viewed_at", `${today}T00:00:00Z`)
      .lte("viewed_at", `${today}T23:59:59Z`);

    if (error) throw error;
    return new Set((data ?? []).map(r => r.viewed_id));
  } catch (e) {
    console.warn("getTodayViewedProfileIds failed, using local fallback");
    try {
      const today = getTodayString();
      const key = `venn_views_${uid}_${today}`;
      const views = JSON.parse((await AsyncStorage.getItem(key)) ?? "[]");
      return new Set(views);
    } catch (e2) {
      return new Set();
    }
  }
}
