import { ENUMS, toDb, toUI, toDbArray, toUIArray, mapDbPrefsToUI, mapUIPrefsToDb } from '../enums';

describe('enum round-trips', () => {
  // Every dbToUI value must map back to its original db key through uiToDb.
  // This is the check that would have caught the pref_gender typo class of
  // bug — a label that displays fine but silently fails to save back.
  for (const category of Object.keys(ENUMS)) {
    test(`${category}: every db value round-trips through toUI -> toDb`, () => {
      for (const dbKey of Object.keys(ENUMS[category].dbToUI)) {
        const uiLabel = toUI(category, dbKey);
        expect(toDb(category, uiLabel)).toBe(dbKey);
      }
    });
  }
});

describe('toDb / toUI', () => {
  test('pass unknown strings through unchanged instead of dropping them', () => {
    expect(toDb('gender', 'Something Unmapped')).toBe('Something Unmapped');
    expect(toUI('gender', 'something_unmapped')).toBe('something_unmapped');
  });

  test('pass null/undefined/empty through unchanged', () => {
    expect(toDb('gender', null)).toBe(null);
    expect(toDb('gender', undefined)).toBe(undefined);
    expect(toDb('gender', '')).toBe('');
  });
});

describe('toDbArray / toUIArray', () => {
  test('maps every element and drops unmapped/falsy results', () => {
    expect(toUIArray('flat_type', ['1_bhk', '2_bhk'])).toEqual(['1 BHK', '2 BHK']);
    expect(toDbArray('flat_type', ['1 BHK', '2 BHK'])).toEqual(['1_bhk', '2_bhk']);
  });

  test('non-array input passes through unchanged', () => {
    expect(toDbArray('flat_type', null)).toBe(null);
    expect(toUIArray('flat_type', undefined)).toBe(undefined);
  });
});

describe('mapDbPrefsToUI', () => {
  test('returns null for a null profile', () => {
    expect(mapDbPrefsToUI(null)).toBe(null);
  });

  test('falls back to user_type/preferred_areas/flat_type when pref_* columns are unset', () => {
    const ui = mapDbPrefsToUI({
      user_type: 'owner',
      preferred_areas: ['Koramangala'],
      flat_type: '2_bhk',
    });
    expect(ui.role).toBe('🏠 Have a flat / room');
    expect(ui.areas).toEqual(['Koramangala']);
    expect(ui.flatType).toEqual(['2 BHK']);
  });

  test('budget/moveIn are formatted from budget_min/budget_max/move_in_date, not pref_budget/pref_move_in', () => {
    const ui = mapDbPrefsToUI({ budget_min: 20000, budget_max: 35000, move_in_date: '2026-08-01' });
    expect(ui.budget).toBe('₹20k – ₹35k');
    expect(ui.budgetMin).toBe(20000);
    expect(ui.budgetMax).toBe(35000);
    expect(ui.moveIn).toBe('Aug 1, 2026');
    expect(ui.moveInDate).toBe('2026-08-01');
  });

  test('the sheet\'s default budget range (0–20000) displays as unset', () => {
    const ui = mapDbPrefsToUI({ budget_min: 0, budget_max: 20000 });
    expect(ui.budget).toBe(null);
  });

  test('prefers explicit pref_* columns over the fallbacks', () => {
    const ui = mapDbPrefsToUI({
      user_type: 'owner',
      pref_role: 'seeking',
      preferred_areas: ['Koramangala'],
      pref_areas: ['Indiranagar'],
    });
    expect(ui.role).toBe('🔍 Looking for a flat');
    expect(ui.areas).toEqual(['Indiranagar']);
  });
});

describe('mapUIPrefsToDb', () => {
  test('returns {} for a null/undefined prefs object', () => {
    expect(mapUIPrefsToDb(null)).toEqual({});
    expect(mapUIPrefsToDb(undefined)).toEqual({});
  });

  test('empty arrays are stored as null, not []', () => {
    const db = mapUIPrefsToDb({ areas: [], flatType: [], occupation: [] });
    expect(db.pref_areas).toBe(null);
    expect(db.pref_flat_type).toBe(null);
    expect(db.pref_occupation).toBe(null);
  });

  test('a full round trip through mapDbPrefsToUI -> mapUIPrefsToDb preserves the shape', () => {
    const dbRow = {
      pref_role: 'owner',
      pref_areas: ['Indiranagar'],
      pref_flat_type: ['2_bhk'],
      pref_gender: 'any_gender',
      pref_age: '22_26',
      pref_occupation: ['student'],
      pref_food: ['veg_only'],
      pref_smoking: 'non_smoker',
      pref_drinking: 'fine_with_drinking',
      pref_pets: ['fine_with_pets'],
    };
    const roundTripped = mapUIPrefsToDb(mapDbPrefsToUI(dbRow));
    expect(roundTripped).toEqual(dbRow);
  });
});
