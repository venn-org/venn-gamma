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
      { key: 'flatType', label: 'Flat type', enumKey: 'flat_type', multi: true, placeholder: 'Any type' },
      { key: 'moveIn', label: 'Move-in', type: 'date', placeholder: 'Anytime' },
    ],
  },
  {
    title: 'Flatmate',
    rows: [
      { key: 'gender', label: 'Gender', enumKey: 'pref_gender', placeholder: 'Any gender' },
      { key: 'age', label: 'Age', enumKey: 'pref_age', placeholder: 'Any age' },
      { key: 'occupation', label: 'Occupation', enumKey: 'occupation', multi: true, placeholder: 'Any' },
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

export const isPrefSet = (prefs, key, multi) =>
  multi ? !!prefs?.[key]?.length : !!prefs?.[key];

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
 * Whether a candidate profile satisfies my preferences. Every check is opt-in:
 * an unset preference — or an attribute the candidate hasn't filled in — never
 * excludes anyone, so a sparse profile stays visible instead of silently
 * dropping out of the feed.
 */
export function matchesPrefs(prefs, p) {
  if (!prefs) return true;

  const myAreas = prefs.areas || [];
  const theirAreas = p.pref_areas?.length ? p.pref_areas : (p.areas || []);
  if (myAreas.length && theirAreas.length && !overlaps(myAreas, theirAreas)) return false;

  // Budget is a precise ₹ range now (not a bucket) — gate on the two ranges
  // overlapping at all.
  if (prefs.budgetMin != null && prefs.budgetMax != null && p.budget_min != null && p.budget_max != null) {
    if (prefs.budgetMax < p.budget_min || p.budget_max < prefs.budgetMin) return false;
  }

  const flatTypes = toDbArray('flat_type', prefs.flatType) || [];
  const theirFlatTypes = p.flat_type ? [p.flat_type] : (p.pref_flat_type || []);
  if (flatTypes.length && theirFlatTypes.length && !overlaps(flatTypes, theirFlatTypes)) return false;

  // Move-in is a precise date now — exact equality would almost never match,
  // so treat dates within MOVE_IN_TOLERANCE_DAYS of each other as compatible.
  if (prefs.moveInDate && p.move_in_date) {
    const diffDays = Math.abs(new Date(prefs.moveInDate) - new Date(p.move_in_date)) / 86400000;
    if (diffDays > MOVE_IN_TOLERANCE_DAYS) return false;
  }

  // pref_gender is "who I want to live with", matched against their actual gender.
  const genderPref = toDb('pref_gender', prefs.gender);
  if (genderPref && genderPref !== 'any_gender' && p.gender) {
    const wanted = genderPref === 'women_only' ? 'woman' : 'man';
    if (p.gender !== wanted) return false;
  }

  const agePref = toDb('pref_age', prefs.age);
  const bounds = AGE_BOUNDS[agePref];
  if (bounds && p.age != null && (p.age < bounds[0] || p.age > bounds[1])) return false;

  // The rest have no corresponding profile column, so they're matched
  // preference-to-preference: we only rule someone out when we both stated
  // something and the two don't overlap.
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
      if (mine.length && theirs?.length && !overlaps(mine, theirs)) return false;
    } else {
      const mine = toDb(enumKey, prefs[key]);
      if (mine && theirs && mine !== theirs) return false;
    }
  }

  return true;
}

/**
 * How much a candidate overlaps with my stated preferences, as 0–100.
 * Mirrors matchesPrefs' criteria, but instead of gating on a single
 * mismatch it scores the fraction of criteria — set on both sides — that
 * agree. Returns null when neither side has enough data to compare, so
 * callers can hide the badge instead of showing a misleading number.
 */
export function calculateOverlapScore(prefs, p) {
  if (!prefs || !p) return null;

  const checks = [];

  const myAreas = prefs.areas || [];
  const theirAreas = p.pref_areas?.length ? p.pref_areas : (p.areas || []);
  if (myAreas.length && theirAreas.length) checks.push(overlaps(myAreas, theirAreas));

  if (prefs.budgetMin != null && prefs.budgetMax != null && p.budget_min != null && p.budget_max != null) {
    checks.push(prefs.budgetMax >= p.budget_min && p.budget_max >= prefs.budgetMin);
  }

  const flatTypes = toDbArray('flat_type', prefs.flatType) || [];
  const theirFlatTypes = p.flat_type ? [p.flat_type] : (p.pref_flat_type || []);
  if (flatTypes.length && theirFlatTypes.length) checks.push(overlaps(flatTypes, theirFlatTypes));

  if (prefs.moveInDate && p.move_in_date) {
    const diffDays = Math.abs(new Date(prefs.moveInDate) - new Date(p.move_in_date)) / 86400000;
    checks.push(diffDays <= MOVE_IN_TOLERANCE_DAYS);
  }

  const genderPref = toDb('pref_gender', prefs.gender);
  if (genderPref && genderPref !== 'any_gender' && p.gender) {
    const wanted = genderPref === 'women_only' ? 'woman' : 'man';
    checks.push(p.gender === wanted);
  }

  const agePref = toDb('pref_age', prefs.age);
  const bounds = AGE_BOUNDS[agePref];
  if (bounds && p.age != null) checks.push(p.age >= bounds[0] && p.age <= bounds[1]);

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
      if (mine.length && theirs?.length) checks.push(overlaps(mine, theirs));
    } else {
      const mine = toDb(enumKey, prefs[key]);
      if (mine && theirs) checks.push(mine === theirs);
    }
  }

  if (!checks.length) return null;
  const matched = checks.filter(Boolean).length;
  return Math.round((matched / checks.length) * 100);
}
