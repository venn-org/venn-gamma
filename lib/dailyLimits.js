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

export async function getRemainingLikes(uid) {
  const used = await getTodayLikes(uid);
  return Math.max(0, DAILY_LIKES - used);
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

export async function canViewToday(uid) {
  const remaining = await getRemainingViews(uid);
  return remaining > 0;
}

export async function recordProfileView(uid, targetId) {
  if (!uid || !targetId) return;
  try {
    // Try to record in database
    await supabase.from("profile_views").insert({
      viewer_id: uid,
      viewed_id: targetId,
      viewed_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("recordProfileView DB failed, using localStorage:", e);
    // Fallback: use localStorage
    try {
      if (typeof localStorage !== "undefined") {
        const today = getTodayString();
        const key = `venn_views_${uid}_${today}`;
        const current = JSON.parse(localStorage.getItem(key) ?? "[]");
        if (!current.includes(targetId)) {
          current.push(targetId);
          localStorage.setItem(key, JSON.stringify(current));
        }
      }
    } catch (e2) {
      console.warn("localStorage fallback also failed:", e2);
    }
  }
}

export async function getTodayViewsFromStorage(uid) {
  if (typeof localStorage === "undefined") return 0;
  try {
    const today = getTodayString();
    const key = `venn_views_${uid}_${today}`;
    const views = JSON.parse(localStorage.getItem(key) ?? "[]");
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
    console.warn("getTodayViewedProfileIds failed, using localStorage fallback");
    if (typeof localStorage !== "undefined") {
      try {
        const today = getTodayString();
        const key = `venn_views_${uid}_${today}`;
        const views = JSON.parse(localStorage.getItem(key) ?? "[]");
        return new Set(views);
      } catch (e2) {
        return new Set();
      }
    }
    return new Set();
  }
}
