import { isFeedReady, calculateProfileCompletion } from '../profileUtils';

describe('isFeedReady', () => {
  test('rejects a missing profile', () => {
    expect(isFeedReady(null)).toBe(false);
  });

  test('rejects onboarding not done', () => {
    expect(isFeedReady({ onboarding_done: false, name: 'A', photos: ['x'] })).toBe(false);
  });

  test('rejects a blank/whitespace-only name', () => {
    expect(isFeedReady({ onboarding_done: true, name: '   ', photos: ['x'] })).toBe(false);
  });

  test('rejects no primary photo', () => {
    expect(isFeedReady({ onboarding_done: true, name: 'A', photos: [] })).toBe(false);
  });

  test('accepts a complete-enough profile', () => {
    expect(isFeedReady({ onboarding_done: true, name: 'A', photos: ['x'] })).toBe(true);
  });
});

describe('calculateProfileCompletion', () => {
  test('a null profile is 0% with the generic prompt', () => {
    // isComplete is part of the contract on every path: callers read it
    // directly, and it used to be absent here (undefined, i.e. accidentally
    // falsy) on the null branch only.
    expect(calculateProfileCompletion(null)).toEqual({
      percentage: 0,
      missingText: 'Complete your profile',
      isComplete: false,
    });
  });

  test('an empty profile reports the first missing item', () => {
    const { percentage, missingText, isComplete } = calculateProfileCompletion({});
    expect(percentage).toBe(0);
    expect(missingText).toBe('Add your name');
    expect(isComplete).toBe(false);
  });

  test('a fully filled-out profile is 100% complete', () => {
    const profile = {
      name: 'Alex',
      photos: ['p1', 'p2'],
      prompts: [{ a: 'answer 1' }, { a: 'answer 2' }],
      bio: 'hello',
      location: 'Indiranagar',
      gender: 'woman',
      birthday: '2000-01-01',
      job_title: 'Engineer',
      education_school: 'XYZ University',
      budget_max: 30000,
      pref_areas: ['Indiranagar'],
    };
    const { percentage, isComplete, missingText } = calculateProfileCompletion(profile);
    expect(percentage).toBe(100);
    expect(isComplete).toBe(true);
    expect(missingText).toBe('Profile complete');
  });

  test('missing prompts get a distinct nudge once photos are already in place', () => {
    const profile = {
      name: 'Alex',
      photos: ['p1', 'p2'],
      prompts: [],
      bio: 'hello',
      location: 'Indiranagar',
      gender: 'woman',
      birthday: '2000-01-01',
      job_title: 'Engineer',
      education_school: 'XYZ University',
      budget_max: 30000,
      pref_areas: ['Indiranagar'],
    };
    const { missingText } = calculateProfileCompletion(profile);
    expect(missingText).toBe('Add 2 more prompts to get seen by more people');
  });

  test('percentage never exceeds 100 and only counts the fixed item list', () => {
    const profile = { name: 'A', extraJunkField: 'should be ignored' };
    const { percentage } = calculateProfileCompletion(profile);
    expect(percentage).toBeGreaterThanOrEqual(0);
    expect(percentage).toBeLessThanOrEqual(100);
  });
});
