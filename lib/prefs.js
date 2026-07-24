import { ENUMS, toDb, toDbArray } from './enums';
import { ZONES_BY_CITY } from './locations';

// Every row here maps 1:1 to a key produced by mapDbPrefsToUI / consumed by
// mapUIPrefsToDb, so adding a preference means adding a row and its enum.
export const PREF_SECTIONS = [
  {
    title: 'The basics',
    rows: [
      { key: 'role', label: 'I am', enumKey: 'pref_role', placeholder: 'Any', roleOnly: true },
      { key: 'budget', label: 'Budget', enumKey: 'pref_budget', placeholder: 'Any budget' },
      { key: 'areas', label: 'Areas', zones: true, multi: true, placeholder: 'Any area' },
      { key: 'flatType', label: 'Flat type', enumKey: 'flat_type', multi: true, placeholder: 'Any type' },
      { key: 'moveIn', label: 'Move-in', enumKey: 'pref_move_in', placeholder: 'Anytime' },
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

export const PREF_ROWS = PREF_SECTIONS.flatMap((s) => s.rows);

export const getPrefRow = (key) => PREF_ROWS.find((r) => r.key === key);

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

  const budget = toDb('pref_budget', prefs.budget);
  const theirBudget = p.budget ?? p.pref_budget;
  if (budget && theirBudget && budget !== theirBudget) return false;

  const flatTypes = toDbArray('flat_type', prefs.flatType) || [];
  const theirFlatTypes = p.flat_type ? [p.flat_type] : (p.pref_flat_type || []);
  if (flatTypes.length && theirFlatTypes.length && !overlaps(flatTypes, theirFlatTypes)) return false;

  const moveIn = toDb('pref_move_in', prefs.moveIn);
  if (moveIn && p.pref_move_in && moveIn !== p.pref_move_in) return false;

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
