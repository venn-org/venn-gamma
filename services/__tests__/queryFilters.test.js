import {
  assertFilterSafeId,
  isUuid,
  matchMembershipFilter,
  matchPairFilter,
} from '../queryFilters';

const A = '11111111-2222-3333-4444-555555555555';
const B = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('isUuid', () => {
  test('accepts a canonical uuid', () => {
    expect(isUuid(A)).toBe(true);
  });

  test('rejects non-uuid values', () => {
    expect(isUuid('nope')).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(123)).toBe(false);
  });
});

describe('assertFilterSafeId', () => {
  test('passes ids made of id-safe characters', () => {
    expect(assertFilterSafeId(A)).toBe(A);
    expect(assertFilterSafeId('auth0_user_42')).toBe('auth0_user_42');
  });

  // The whole point: these are the characters that would let a value break
  // out of the filter expression it is spliced into.
  test.each([
    ['comma', 'abc,def'],
    ['closing paren', 'abc)'],
    ['dot', 'abc.eq'],
    ['space', 'abc def'],
    ['quote', "abc'"],
    ['empty', ''],
  ])('rejects %s', (_label, value) => {
    expect(() => assertFilterSafeId(value)).toThrow(/Unsafe/);
  });

  test('rejects non-strings', () => {
    expect(() => assertFilterSafeId(null)).toThrow(/Unsafe/);
    expect(() => assertFilterSafeId(42)).toThrow(/Unsafe/);
  });
});

describe('matchMembershipFilter', () => {
  test('matches either column', () => {
    expect(matchMembershipFilter(A)).toBe(`user1_id.eq.${A},user2_id.eq.${A}`);
  });

  test('refuses to build a filter from an unsafe id', () => {
    expect(() => matchMembershipFilter('x,y')).toThrow();
  });
});

describe('matchPairFilter', () => {
  test('covers both column orderings', () => {
    expect(matchPairFilter(A, B)).toBe(
      `and(user1_id.eq.${A},user2_id.eq.${B}),and(user1_id.eq.${B},user2_id.eq.${A})`,
    );
  });

  test('an injected value cannot rewrite the expression', () => {
    // Without validation this would close the and(...) group early and append
    // an attacker-chosen predicate.
    expect(() => matchPairFilter(A, `${B}),or(id.neq.0`)).toThrow();
  });
});
