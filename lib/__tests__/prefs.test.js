import { getPrefDisplay, isPrefSet, matchesPrefs, calculateOverlapScore } from '../prefs';

describe('isPrefSet / getPrefDisplay', () => {
  test('single-value: unset falls back to placeholder', () => {
    expect(isPrefSet({}, 'budget', false)).toBe(false);
    expect(getPrefDisplay({}, 'budget', 'Any budget', false)).toBe('Any budget');
  });

  test('single-value: set shows the value', () => {
    const prefs = { budget: '₹20k–35k' };
    expect(isPrefSet(prefs, 'budget', false)).toBe(true);
    expect(getPrefDisplay(prefs, 'budget', 'Any budget', false)).toBe('₹20k–35k');
  });

  test('multi-value: empty array counts as unset', () => {
    expect(isPrefSet({ areas: [] }, 'areas', true)).toBe(false);
  });

  test('multi-value: one selection shows just the value, more shows a +N suffix', () => {
    expect(getPrefDisplay({ areas: ['Indiranagar'] }, 'areas', 'Any area', true)).toBe('Indiranagar');
    expect(getPrefDisplay({ areas: ['Indiranagar', 'Koramangala'] }, 'areas', 'Any area', true)).toBe('Indiranagar +1');
  });
});

describe('matchesPrefs', () => {
  test('no preferences set at all: everyone matches', () => {
    expect(matchesPrefs(null, {})).toBe(true);
    expect(matchesPrefs({}, { budget: 'under_10k' })).toBe(true);
  });

  test('a candidate missing the compared field is never excluded', () => {
    // I want a specific budget, but the candidate hasn't set theirs.
    expect(matchesPrefs({ budget: '₹20k–35k' }, {})).toBe(true);
  });

  test('budget mismatch excludes the candidate', () => {
    expect(matchesPrefs({ budget: '₹20k–35k' }, { budget: 'under_10k' })).toBe(false);
  });

  test('budget match includes the candidate', () => {
    expect(matchesPrefs({ budget: '₹20k–35k' }, { budget: '20k_35k' })).toBe(true);
  });

  test('areas: any overlap between the two lists is enough', () => {
    const prefs = { areas: ['Indiranagar', 'Koramangala'] };
    expect(matchesPrefs(prefs, { pref_areas: ['Koramangala'] })).toBe(true);
    expect(matchesPrefs(prefs, { pref_areas: ['Whitefield'] })).toBe(false);
  });

  test('gender preference is matched against the candidate\'s actual gender', () => {
    const prefs = { gender: '👩 Women only' };
    expect(matchesPrefs(prefs, { gender: 'woman' })).toBe(true);
    expect(matchesPrefs(prefs, { gender: 'man' })).toBe(false);
  });

  test('age preference respects the bucket bounds, including the open-ended 35+', () => {
    expect(matchesPrefs({ age: '18–22' }, { age: 21 })).toBe(true);
    expect(matchesPrefs({ age: '18–22' }, { age: 25 })).toBe(false);
    expect(matchesPrefs({ age: '35+' }, { age: 60 })).toBe(true);
  });

  test('multi-value pairwise prefs (e.g. food) only exclude on a stated, non-overlapping pair', () => {
    const prefs = { food: ['🥦 Veg only'] };
    expect(matchesPrefs(prefs, { pref_food: ['veg_only', 'non_veg_ok'] })).toBe(true);
    expect(matchesPrefs(prefs, { pref_food: ['non_veg_ok'] })).toBe(false);
    expect(matchesPrefs(prefs, {})).toBe(true); // candidate never stated a food pref
  });
});

describe('calculateOverlapScore', () => {
  test('returns null when there is nothing comparable on either side', () => {
    expect(calculateOverlapScore(null, {})).toBe(null);
    expect(calculateOverlapScore({}, {})).toBe(null);
  });

  test('returns 100 when every comparable criterion agrees', () => {
    const prefs = { budget: '₹20k–35k', moveIn: 'ASAP' };
    const candidate = { budget: '20k_35k', pref_move_in: 'asap' };
    expect(calculateOverlapScore(prefs, candidate)).toBe(100);
  });

  test('returns 0 when every comparable criterion disagrees', () => {
    const prefs = { budget: '₹20k–35k', moveIn: 'ASAP' };
    const candidate = { budget: 'under_10k', pref_move_in: 'flexible' };
    expect(calculateOverlapScore(prefs, candidate)).toBe(0);
  });

  test('only scores criteria set on both sides — an unset field is not counted', () => {
    // Only budget is comparable (moveIn is only set on my side); it matches,
    // so the score should be a clean 100, not diluted by the unset field.
    const prefs = { budget: '₹20k–35k', moveIn: 'ASAP' };
    const candidate = { budget: '20k_35k' };
    expect(calculateOverlapScore(prefs, candidate)).toBe(100);
  });

  test('partial agreement lands strictly between 0 and 100', () => {
    const prefs = { budget: '₹20k–35k', moveIn: 'ASAP' };
    const candidate = { budget: '20k_35k', pref_move_in: 'flexible' };
    const score = calculateOverlapScore(prefs, candidate);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });
});
