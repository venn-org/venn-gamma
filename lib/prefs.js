import { ENUMS, toDb, toDbArray } from './enums';
import { ZONES_BY_CITY } from './locations';

// Every row here maps 1:1 to a key produced by mapDbPrefsToUI / consumed by
// mapUIPrefsToDb, so adding a preference means adding a row and its enum.
export const PREF_SECTIONS = [
  {
    title: 'The basics',
    rows: [
      { key: 'role', label: 'I am', enumKey: 'pref_role', placeholder: 'Any', roleOnly: true },
      { key: 'budget', label: 'Budget', type: 'range', placeholder: 'Any budget' },
      { key: 'areas', label: 'Areas', zones: true, multi: true, placeholder: 'Any area' },
      {
        key: 'flatType',
        label: 'Flat type',
        enumKey: 'flat_type',
        multi: true,
        placeholder: 'Any type',
      },
      { key: 'moveIn', label: 'Move-in', type: 'date', placeholder: 'Anytime' },
    ],
  },
  {
    title: 'Flatmate',
    rows: [
      { key: 'gender', label: 'Gender', enumKey: 'pref_gender', placeholder: 'Any gender' },
      { key: 'age', label: 'Age', enumKey: 'pref_age', placeholder: 'Any age' },
      {
        key: 'occupation',
        label: 'Occupation',
        enumKey: 'occupation',
        multi: true,
        placeholder: 'Any',
      },
    ],
  },
  {
    title: 'Lifestyle',
    rows: [
      { key: 'food', label: 'Food', enumKey: 'food_habit', multi: true, placeholder: 'Any' },
      { key: 'smoking', label: 'Smoking', enumKey: 'smoking_pref', placeholder: 'Any' },
      { key: 'drinking', label: 'Drinking', enumKey: 'drinking_pref', placeholder: 'Any' },
      { key: 'pets', label: 'Pets', enumKey: 'pets_pref', multi: true, placeholder: 'Any' },
    ],
  },
];

// Budget slider bounds, shared by onboarding and the preferences sheet so the
// two can't drift apart. BUDGET_DEFAULT_MAX doubles as the "untouched" marker
// (see formatBudgetRange in lib/enums.js).
export const BUDGET_MIN = 0;
export const BUDGET_MAX = 100000;
export const BUDGET_STEP = 1000;
export const BUDGET_DEFAULT_MAX = 20000;

export const PREF_ROWS = PREF_SECTIONS.flatMap((s) => s.rows);

/** UI-facing option strings for a row. Areas depend on the user's city. */
export function prefOptions(row, city) {
  if (row.zones) return (ZONES_BY_CITY[city] || []).map((z) => z.name);
  return Object.values(ENUMS[row.enumKey].dbToUI);
}

/** Chip/row label: the chosen value(s), or the row's placeholder when unset. */
export function getPrefDisplay(prefs, key, placeholder, multi) {
  const val = prefs?.[key];
  if (multi) {
    if (!val?.length) return placeholder;
    return val.length === 1 ? val[0] : `${val[0]} +${val.length - 1}`;
  }
  return val || placeholder;
}

export const isPrefSet = (prefs, key, multi) => (multi ? !!prefs?.[key]?.length : !!prefs?.[key]);

const AGE_BOUNDS = {
  '18_22': [18, 22],
  '22_26': [22, 26],
  '26_30': [26, 30],
  '30_35': [30, 35],
  '35_plus': [35, Infinity],
};

const overlaps = (a, b) => a.some((x) => b.includes(x));

// Move-in is now a precise date rather than a bucket, so exact equality
// would almost never match — dates within this many days of each other
// count as compatible.
const MOVE_IN_TOLERANCE_DAYS = 60;

/**
 * Whether a candidate profile satisfies my preferences.
 *
 * Gender is the ONLY hard filter — "men only" / "women only" is a strict,
 * non-negotiable policy, so it excludes anyone not positively confirmed as
 * the requested gender (an unstated gender is not a confirmation).
 *
 * Every other preference (budget, areas, flat type, move-in, age, occupation,
 * lifestyle) is scoring-only: it moves calculateOverlapScore's badge but never
 * hides a profile. Gating the feed on all of them at once made it trivial to
 * land on an empty screen at first login — a bad first impression — while
 * plenty of candidates existed. Those near-misses now stay visible, ranked
 * below the better matches by buildFeedOrder.
 */
export function matchesPrefs(prefs, p) {
  if (!prefs) return true;
  return genderPrefAdmits(toDb('pref_gender', prefs.gender), p?.gender);
}

/**
 * The gender rule, in one place, expressed from the *holder of the preference*
 * outwards: does `prefGender` admit someone whose gender is `gender`?
 *
 * Both directions of the rule are this same question asked about different
 * people, so they must not be allowed to drift apart:
 *
 *   - "whose profiles do I see"  → my pref vs their gender (matchesPrefs)
 *   - "who may like me"          → my pref vs the liker's gender (canReceiveLikeFrom)
 *
 * `db` values, not UI labels: 'women_only' | 'men_only' | 'any_gender' | null
 * against 'man' | 'woman' | 'non_binary' | ... | null.
 *
 * An unset or unknown gender is NOT a confirmation, so a strict preference
 * excludes it. Note this also excludes non-binary, transgender and
 * "prefer not to say" users from a "men only" / "women only" audience — that is
 * the pre-existing semantic of the feed filter, now applied to likes as well.
 */
export function genderPrefAdmits(prefGender, gender) {
  if (!prefGender || prefGender === 'any_gender') return true;
  const wanted = prefGender === 'women_only' ? 'woman' : 'man';
  return gender === wanted;
}

/**
 * May `liker` send a like to `recipient`?
 *
 * The recipient's stated preference governs, which is the whole point: a user
 * who asked for men only should not receive likes from anyone else. Both
 * arguments are raw profile rows (db-valued `pref_gender` / `gender`).
 *
 * Advisory on the client — the database enforces this in like_profile() and in
 * the likes INSTEAD OF INSERT trigger (see
 * supabase/migrations/20260730090000_enforce_gender_pref_on_likes.sql). It
 * lives here so the feed can avoid showing cards that would be refused.
 */
export function canReceiveLikeFrom(recipient, liker) {
  if (!recipient || !liker) return true;
  return genderPrefAdmits(recipient.pref_gender, liker.gender);
}

/**
 * The `pref_gender` values that would accept a like from someone of `gender`.
 *
 * Used to push the reciprocal filter into the feed query instead of discarding
 * rows after they have already been paid for.
 */
export function acceptingPrefGenders(gender) {
  const accepting = ['any_gender'];
  if (gender === 'man') accepting.push('men_only');
  if (gender === 'woman') accepting.push('women_only');
  return accepting;
}

// Displayed overlap is squeezed into this band rather than spanning 0–100.
// A literal 0% reads as "this person is worthless to you" and kills the intent
// to swipe, and a literal 100% promises a perfect match the data can't back —
// so a raw 0 surfaces as OVERLAP_FLOOR and a raw 1 as OVERLAP_CEIL, keeping
// every badge strictly inside 15 < x < 100.
export const OVERLAP_FLOOR = 16;
export const OVERLAP_CEIL = 99;

// Not every criterion carries the same weight: where you can afford to live and
// where you want to live decide whether a flatshare is possible at all, while
// pets or food are preferences you can live around. The flat fraction this
// replaced treated "budget clashes" and "different coffee habits" as equal.
const OVERLAP_WEIGHTS = {
  areas: 3,
  budget: 3,
  flatType: 2,
  moveIn: 2,
  gender: 2,
  age: 1.5,
  occupation: 1,
  food: 1,
  pets: 1,
  smoking: 1,
  drinking: 1,
};

/**
 * How much a candidate overlaps with my stated preferences, as a percentage.
 * Mirrors matchesPrefs' criteria, but instead of gating on a single mismatch it
 * scores the weighted fraction of criteria — set on both sides — that agree,
 * then rescales that fraction into [OVERLAP_FLOOR, OVERLAP_CEIL].
 *
 * Returns null when neither side has enough data to compare, so callers can
 * hide the badge instead of showing a number backed by nothing.
 */
export function calculateOverlapScore(prefs, p) {
  if (!prefs || !p) return null;

  let total = 0;
  let earned = 0;
  const score = (key, ok) => {
    const w = OVERLAP_WEIGHTS[key];
    total += w;
    if (ok) earned += w;
  };

  const myAreas = prefs.areas || [];
  const theirAreas = p.pref_areas?.length ? p.pref_areas : p.areas || [];
  if (myAreas.length && theirAreas.length) score('areas', overlaps(myAreas, theirAreas));

  // [0, BUDGET_DEFAULT_MAX] is the slider's untouched default (see
  // formatBudgetRange in lib/enums.js), not a stated preference, so it's
  // skipped here the same way it's skipped for display.
  if (
    prefs.budgetMin != null &&
    prefs.budgetMax != null &&
    p.budget_min != null &&
    p.budget_max != null &&
    !(prefs.budgetMin === BUDGET_MIN && prefs.budgetMax === BUDGET_DEFAULT_MAX)
  ) {
    score('budget', prefs.budgetMax >= p.budget_min && p.budget_max >= prefs.budgetMin);
  }

  const flatTypes = toDbArray('flat_type', prefs.flatType) || [];
  const theirFlatTypes = p.flat_type ? [p.flat_type] : p.pref_flat_type || [];
  if (flatTypes.length && theirFlatTypes.length)
    score('flatType', overlaps(flatTypes, theirFlatTypes));

  if (prefs.moveInDate && p.move_in_date) {
    const diffDays = Math.abs(new Date(prefs.moveInDate) - new Date(p.move_in_date)) / 86400000;
    score('moveIn', diffDays <= MOVE_IN_TOLERANCE_DAYS);
  }

  const genderPref = toDb('pref_gender', prefs.gender);
  if (genderPref && genderPref !== 'any_gender' && p.gender) {
    const wanted = genderPref === 'women_only' ? 'woman' : 'man';
    score('gender', p.gender === wanted);
  }

  const agePref = toDb('pref_age', prefs.age);
  const bounds = AGE_BOUNDS[agePref];
  if (bounds && p.age != null) score('age', p.age >= bounds[0] && p.age <= bounds[1]);

  const pairwise = [
    ['occupation', 'occupation', p.pref_occupation, true],
    ['food', 'food_habit', p.pref_food, true],
    ['pets', 'pets_pref', p.pref_pets, true],
    ['smoking', 'smoking_pref', p.pref_smoking, false],
    ['drinking', 'drinking_pref', p.pref_drinking, false],
  ];
  for (const [key, enumKey, theirs, multi] of pairwise) {
    if (multi) {
      const mine = toDbArray(enumKey, prefs[key]) || [];
      if (mine.length && theirs?.length) score(key, overlaps(mine, theirs));
    } else {
      const mine = toDb(enumKey, prefs[key]);
      if (mine && theirs) score(key, mine === theirs);
    }
  }

  if (!total) return null;
  const raw = earned / total;
  return Math.round(OVERLAP_FLOOR + raw * (OVERLAP_CEIL - OVERLAP_FLOOR));
}

/**
 * Feed order: alternate the strongest remaining candidate with the weakest.
 *
 * A straight overlap-descending sort front-loads every good profile and leaves
 * a long tail of near-misses that reads as the feed running out of quality.
 * Zig-zagging from both ends of the sorted list keeps a high-overlap profile
 * always one swipe away while still surfacing the whole pool, and the varied
 * scores stop the badge from flatlining at one number.
 *
 * Each profile is returned with the score attached as `_overlap` so the card
 * doesn't have to recompute it.
 */
export function buildFeedOrder(prefs, profiles) {
  return interleaveByScore(
    profiles.map((p) => ({ ...p, _overlap: calculateOverlapScore(prefs, p) })),
  );
}

/**
 * The zig-zag alone, for rows that arrive already scored.
 *
 * feed_candidates() ranks the whole pool server-side and returns one page in
 * score order (see supabase/migrations/20260731000000_feed_ranking_rpc.sql), so
 * there is nothing left to compute — but a page delivered in flat descending
 * order has exactly the problem described above. Interleaving within the page
 * keeps the presentation without touching the ranking, and unlike a client-side
 * re-sort it can't contradict it.
 */
export function interleaveByScore(profiles) {
  // Unscorable profiles (no shared criteria) sort as mid-pack rather than
  // sinking to the bottom — there's no evidence they're a bad match.
  const scored = [...profiles].sort((a, b) => (b._overlap ?? 50) - (a._overlap ?? 50));

  const ordered = [];
  let head = 0;
  let tail = scored.length - 1;
  while (head <= tail) {
    ordered.push(scored[head++]);
    if (head <= tail) ordered.push(scored[tail--]);
  }
  return ordered;
}
