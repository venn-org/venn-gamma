import { getTodayString, localDayBounds } from '../dates';

/**
 * These cover the timezone bug the local-day helpers exist to fix: the
 * previous implementation used `toISOString().slice(0, 10)`, i.e. the UTC
 * date, so in IST (UTC+5:30) every daily allowance reset at 05:30 local time.
 */
describe('getTodayString', () => {
  test('uses the local calendar date, not the UTC one', () => {
    // 01:00 on the 15th in a UTC+5:30 zone is still the 14th in UTC. The
    // local date is what the user calls "today", so that is what must win.
    const localMidnightIsh = new Date(2026, 6, 15, 1, 0, 0);
    expect(getTodayString(localMidnightIsh)).toBe('2026-07-15');
  });

  test('zero-pads month and day', () => {
    expect(getTodayString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  test('is stable across a day, and changes across midnight', () => {
    const morning = new Date(2026, 6, 15, 9, 30);
    const night = new Date(2026, 6, 15, 23, 59);
    const nextDay = new Date(2026, 6, 16, 0, 1);

    expect(getTodayString(morning)).toBe(getTodayString(night));
    expect(getTodayString(nextDay)).not.toBe(getTodayString(night));
  });
});

describe('localDayBounds', () => {
  test('spans exactly one day', () => {
    const { startIso, endIso } = localDayBounds(new Date(2026, 6, 15, 13, 0));
    const span = new Date(endIso) - new Date(startIso);
    expect(span).toBe(24 * 60 * 60 * 1000);
  });

  test('starts at local midnight', () => {
    const { startIso } = localDayBounds(new Date(2026, 6, 15, 13, 0));
    const start = new Date(startIso);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
  });

  test('any instant in the day falls inside its own bounds', () => {
    for (const hour of [0, 6, 12, 18, 23]) {
      const at = new Date(2026, 6, 15, hour, 30);
      const { startIso, endIso } = localDayBounds(at);
      expect(at >= new Date(startIso)).toBe(true);
      expect(at < new Date(endIso)).toBe(true);
    }
  });
});
