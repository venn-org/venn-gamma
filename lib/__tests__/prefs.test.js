// prefs.js imports lib/locations.js, which now imports the Supabase client
// (and transitively AsyncStorage) to fetch cities/zones — irrelevant to the
// pure matching/scoring functions under test here, so it's mocked out.
import {
  getPrefDisplay,
  isPrefSet,
  matchesPrefs,
  calculateOverlapScore,
  buildFeedOrder,
  OVERLAP_FLOOR,
  OVERLAP_CEIL,
} from '../prefs';

jest.mock('../supabase', () => ({ supabase: {} }));

describe('isPrefSet / getPrefDisplay', () => {
  test('single-value: unset falls back to placeholder', () => {
    expect(isPrefSet({}, 'budget', false)).toBe(false);
    expect(getPrefDisplay({}, 'budget', 'Any budget', false)).toBe('Any budget');
  });

  test('single-value: set shows the value', () => {
    const prefs = { budget: '₹20k – 35k' };
    expect(isPrefSet(prefs, 'budget', false)).toBe(true);
    expect(getPrefDisplay(prefs, 'budget', 'Any budget', false)).toBe('₹20k – 35k');
  });

  test('multi-value: empty array counts as unset', () => {
    expect(isPrefSet({ areas: [] }, 'areas', true)).toBe(false);
  });

  test('multi-value: one selection shows just the value, more shows a +N suffix', () => {
    expect(getPrefDisplay({ areas: ['Indiranagar'] }, 'areas', 'Any area', true)).toBe(
      'Indiranagar',
    );
    expect(
      getPrefDisplay({ areas: ['Indiranagar', 'Koramangala'] }, 'areas', 'Any area', true),
    ).toBe('Indiranagar +1');
  });
});

describe('matchesPrefs', () => {
  test('no preferences set at all: everyone matches', () => {
    expect(matchesPrefs(null, {})).toBe(true);
    expect(matchesPrefs({}, { budget_min: 0, budget_max: 10000 })).toBe(true);
  });

  // Gender is the only hard filter — every other preference only affects the
  // overlap score, never whether a profile is shown. Gating on all of them at
  // once made it trivial to end up staring at an empty feed on first login.
  test('a mismatched budget, area, age, or lifestyle preference does not exclude the candidate', () => {
    const prefs = {
      budgetMin: 20000,
      budgetMax: 35000,
      areas: ['Indiranagar'],
      age: '18–22',
      moveInDate: '2026-08-01',
      food: ['🥦 Veg only'],
    };
    const mismatched = {
      budget_min: 0,
      budget_max: 10000,
      pref_areas: ['Whitefield'],
      age: 60,
      move_in_date: '2027-03-01',
      pref_food: ['non_veg_ok'],
    };
    expect(matchesPrefs(prefs, mismatched)).toBe(true);
  });

  test("gender preference is matched against the candidate's actual gender", () => {
    const prefs = { gender: '👩 Women only' };
    expect(matchesPrefs(prefs, { gender: 'woman' })).toBe(true);
    expect(matchesPrefs(prefs, { gender: 'man' })).toBe(false);
  });

  test('men-only / women-only is strict: an unstated gender is not a confirmation', () => {
    // Gender is the one policy that never bends, so a candidate we can't
    // positively confirm is excluded rather than shown on a maybe.
    expect(matchesPrefs({ gender: '👨 Men only' }, {})).toBe(false);
    expect(matchesPrefs({ gender: '👨 Men only' }, { gender: null })).toBe(false);
    expect(matchesPrefs({ gender: '👨 Men only' }, { gender: 'man' })).toBe(true);
  });

  test('"any gender" does not filter anyone out, including unstated genders', () => {
    expect(matchesPrefs({ gender: '🌈 Any gender' }, {})).toBe(true);
    expect(matchesPrefs({ gender: '🌈 Any gender' }, { gender: 'woman' })).toBe(true);
    expect(matchesPrefs({}, { gender: null })).toBe(true);
  });
});

describe('calculateOverlapScore', () => {
  test('returns null when there is nothing comparable on either side', () => {
    expect(calculateOverlapScore(null, {})).toBe(null);
    expect(calculateOverlapScore({}, {})).toBe(null);
  });

  test('full agreement tops out at the ceiling, never a literal 100', () => {
    const prefs = { budgetMin: 20000, budgetMax: 35000, moveInDate: '2026-08-01' };
    const candidate = { budget_min: 25000, budget_max: 40000, move_in_date: '2026-08-10' };
    expect(calculateOverlapScore(prefs, candidate)).toBe(OVERLAP_CEIL);
  });

  test('total disagreement bottoms out at the floor, never a literal 0', () => {
    const prefs = { budgetMin: 20000, budgetMax: 35000, moveInDate: '2026-08-01' };
    const candidate = { budget_min: 0, budget_max: 10000, move_in_date: '2027-03-01' };
    expect(calculateOverlapScore(prefs, candidate)).toBe(OVERLAP_FLOOR);
  });

  test('every score stays strictly inside 15 < x < 100', () => {
    const prefs = {
      budgetMin: 20000,
      budgetMax: 35000,
      moveInDate: '2026-08-01',
      gender: '👩 Women only',
    };
    const candidates = [
      { budget_min: 25000, budget_max: 40000, move_in_date: '2026-08-10', gender: 'woman' },
      { budget_min: 0, budget_max: 10000, move_in_date: '2027-03-01', gender: 'man' },
      { budget_min: 25000, budget_max: 40000, move_in_date: '2027-03-01', gender: 'man' },
    ];
    for (const c of candidates) {
      const score = calculateOverlapScore(prefs, c);
      expect(score).toBeGreaterThan(15);
      expect(score).toBeLessThan(100);
    }
  });

  test('only scores criteria set on both sides — an unset field is not counted', () => {
    // Only budget is comparable (moveInDate is only set on my side); it matches,
    // so the score is a clean ceiling, not diluted by the unset field.
    const prefs = { budgetMin: 20000, budgetMax: 35000, moveInDate: '2026-08-01' };
    const candidate = { budget_min: 25000, budget_max: 40000 };
    expect(calculateOverlapScore(prefs, candidate)).toBe(OVERLAP_CEIL);
  });

  test('heavier criteria move the score more than light ones', () => {
    // Budget (weight 3) vs food (weight 1): failing the heavy one has to hurt more.
    const prefs = { budgetMin: 20000, budgetMax: 35000, food: ['🥦 Veg only'] };
    const budgetFails = calculateOverlapScore(prefs, {
      budget_min: 0,
      budget_max: 10000,
      pref_food: ['veg_only'],
    });
    const foodFails = calculateOverlapScore(prefs, {
      budget_min: 25000,
      budget_max: 40000,
      pref_food: ['non_veg_ok'],
    });
    expect(budgetFails).toBeLessThan(foodFails);
  });
});

describe('buildFeedOrder', () => {
  const prefs = { budgetMin: 20000, budgetMax: 35000 };
  const strong = { id: 'a', budget_min: 25000, budget_max: 40000 };
  const weak = { id: 'b', budget_min: 0, budget_max: 10000 };

  test('alternates strongest and weakest remaining candidates', () => {
    const order = buildFeedOrder(prefs, [
      weak,
      strong,
      { ...weak, id: 'c' },
      { ...strong, id: 'd' },
    ]);
    const scores = order.map((p) => p._overlap);
    // High, low, high, low — never a run of one end of the pool.
    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[2]).toBeGreaterThan(scores[3]);
  });

  test('keeps every profile exactly once and attaches its score', () => {
    const order = buildFeedOrder(prefs, [weak, strong, { ...weak, id: 'c' }]);
    expect(order.map((p) => p.id).sort()).toEqual(['a', 'b', 'c']);
    order.forEach((p) => expect(typeof p._overlap).toBe('number'));
  });

  test('handles an empty pool', () => {
    expect(buildFeedOrder(prefs, [])).toEqual([]);
  });
});
