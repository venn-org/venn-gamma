import { acceptingPrefGenders, canReceiveLikeFrom, genderPrefAdmits, matchesPrefs } from '../prefs';

/**
 * The gender preference is a two-way rule: it decides both whose profiles I
 * see and who is allowed to like me. These pin the semantics that
 * gender_pref_admits() in
 * supabase/migrations/20260730090000_enforce_gender_pref_on_likes.sql must
 * mirror exactly — if the two ever disagree, the feed shows cards whose like
 * button always fails, or worse, hides ones that would have worked.
 */
describe('genderPrefAdmits', () => {
  test('no preference admits everyone', () => {
    for (const g of ['man', 'woman', 'non_binary', 'transgender', 'prefer_not_to_say', null]) {
      expect(genderPrefAdmits(null, g)).toBe(true);
      expect(genderPrefAdmits('any_gender', g)).toBe(true);
    }
  });

  test('men_only admits only men', () => {
    expect(genderPrefAdmits('men_only', 'man')).toBe(true);
    expect(genderPrefAdmits('men_only', 'woman')).toBe(false);
    expect(genderPrefAdmits('men_only', 'non_binary')).toBe(false);
  });

  test('women_only admits only women', () => {
    expect(genderPrefAdmits('women_only', 'woman')).toBe(true);
    expect(genderPrefAdmits('women_only', 'man')).toBe(false);
  });

  // "An unstated gender is not a confirmation" — the long-standing reading of
  // the feed filter, now also governing who may send a like.
  test('an unstated gender is not a confirmation', () => {
    expect(genderPrefAdmits('men_only', null)).toBe(false);
    expect(genderPrefAdmits('women_only', undefined)).toBe(false);
    expect(genderPrefAdmits('men_only', 'prefer_not_to_say')).toBe(false);
  });
});

describe('canReceiveLikeFrom', () => {
  const menOnly = { pref_gender: 'men_only' };
  const anyone = { pref_gender: 'any_gender' };
  const unset = {};

  test('the requested case: men_only receives no like from a woman', () => {
    expect(canReceiveLikeFrom(menOnly, { gender: 'woman' })).toBe(false);
  });

  test('men_only still receives likes from men', () => {
    expect(canReceiveLikeFrom(menOnly, { gender: 'man' })).toBe(true);
  });

  test('a recipient with no preference receives likes from anyone', () => {
    expect(canReceiveLikeFrom(anyone, { gender: 'woman' })).toBe(true);
    expect(canReceiveLikeFrom(unset, { gender: 'non_binary' })).toBe(true);
  });

  test('the rule is the recipient s, not the sender s', () => {
    // A woman who wants women only may still like a man whose own preference
    // is open — her preference governs her feed, not his inbox.
    const openMan = { pref_gender: 'any_gender', gender: 'man' };
    const womanWantingWomen = { pref_gender: 'women_only', gender: 'woman' };
    expect(canReceiveLikeFrom(openMan, womanWantingWomen)).toBe(true);
    // ...and he cannot like her, because hers excludes him.
    expect(canReceiveLikeFrom(womanWantingWomen, openMan)).toBe(false);
  });

  test('missing either side is permissive — the server is the real gate', () => {
    expect(canReceiveLikeFrom(null, { gender: 'woman' })).toBe(true);
    expect(canReceiveLikeFrom(menOnly, null)).toBe(true);
  });
});

describe('acceptingPrefGenders', () => {
  test('a man is accepted by any_gender and men_only', () => {
    expect(acceptingPrefGenders('man').sort()).toEqual(['any_gender', 'men_only']);
  });

  test('a woman is accepted by any_gender and women_only', () => {
    expect(acceptingPrefGenders('woman').sort()).toEqual(['any_gender', 'women_only']);
  });

  test('anyone else is only accepted where no preference is stated', () => {
    expect(acceptingPrefGenders('non_binary')).toEqual(['any_gender']);
    expect(acceptingPrefGenders(null)).toEqual(['any_gender']);
  });

  // The SQL side adds `pref_gender IS NULL` separately; this list only covers
  // the values that are actually set.
  test('every listed value really does admit that gender', () => {
    for (const gender of ['man', 'woman', 'non_binary', null]) {
      for (const pref of acceptingPrefGenders(gender)) {
        expect(genderPrefAdmits(pref, gender)).toBe(true);
      }
    }
  });
});

describe('matchesPrefs still delegates to the same rule', () => {
  test('men_only hides non-men from the feed', () => {
    expect(matchesPrefs({ gender: '👨 Men only' }, { gender: 'man' })).toBe(true);
    expect(matchesPrefs({ gender: '👨 Men only' }, { gender: 'woman' })).toBe(false);
  });

  test('no prefs at all matches everyone', () => {
    expect(matchesPrefs(null, { gender: 'woman' })).toBe(true);
    expect(matchesPrefs({}, { gender: 'woman' })).toBe(true);
  });
});
