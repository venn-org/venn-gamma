import * as Sentry from '@sentry/react-native';

import { error as logError, warn as logWarn, setLogReporter } from '../log';
import { initMonitoring, identifyUser } from '../monitoring';

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  startSpan: jest.fn(),
}));

// monitoringEnabled is `!isDev`, which is false under Jest. It is read once at
// module load, so it has to be mocked rather than assigned in a hook.
jest.mock('../../config/flags', () => ({
  ...jest.requireActual('../../config/flags'),
  FLAGS: { ...jest.requireActual('../../config/flags').FLAGS, monitoringEnabled: true },
}));

/**
 * These pin the two properties that make this module worth having, and that a
 * refactor could silently break without any test failing elsewhere:
 *
 *   1. Existing log.error()/log.warn() call sites reach Sentry without being
 *      modified — the whole premise of lib/log.js's setLogReporter seam.
 *   2. Nothing sensitive rides along. This app handles message text, photos,
 *      and home-accurate coordinates; a scrubbing regression would leak them
 *      to a third-party service silently, which no other test would catch.
 */
describe('monitoring', () => {
  let init;
  // Captured before afterEach's clearAllMocks() can wipe the call record.
  let initOptions;

  beforeAll(() => {
    // The DSN comes from jest.setup.js; the flag from the mock above.
    init = initMonitoring();
    initOptions = Sentry.init.mock.calls[0][0];
  });

  afterEach(() => jest.clearAllMocks());

  test('it actually started (the rest of this file is meaningless otherwise)', () => {
    expect(init).toBe(true);
    expect(Sentry.init).toHaveBeenCalled();
  });

  test('sendDefaultPii stays off', () => {
    // On, this ships IP addresses and request data for every event.
    expect(initOptions.sendDefaultPii).toBe(false);
  });

  test('an existing log.error() call site reaches Sentry unchanged', () => {
    logError('feed load failed', { code: 'PGRST116' });

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'feed load failed',
      expect.objectContaining({ level: 'error' }),
    );
  });

  test('log.warn() arrives as a warning, not an error', () => {
    logWarn('presence beat skipped');

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'presence beat skipped',
      expect.objectContaining({ level: 'warning' }),
    );
  });

  test('coordinates and message text are redacted from log context', () => {
    logError('send failed', {
      code: 'PGRST301',
      latitude: 19.076,
      longitude: 72.877,
      content: 'hey, want to see the flat on saturday?',
    });

    const { extra } = Sentry.captureMessage.mock.calls[0][1];
    expect(extra.code).toBe('PGRST301');
    expect(extra.latitude).toBe('[redacted]');
    expect(extra.longitude).toBe('[redacted]');
    expect(extra.content).toBe('[redacted]');
  });

  test('redaction reaches nested objects', () => {
    logError('profile save failed', { profile: { id: 'u1', location: { lat: 19.07 } } });

    const { extra } = Sentry.captureMessage.mock.calls[0][1];
    expect(extra.profile.id).toBe('u1');
    expect(extra.profile.location).toBe('[redacted]');
  });

  test('beforeSend strips request payloads and query strings', () => {
    const { beforeSend } = initOptions;

    const event = beforeSend({
      request: {
        url: 'https://x.supabase.co/rest/v1/messages',
        data: { body: 'private message text' },
        query_string: 'select=*&sender_id=eq.abc',
        cookies: { session: 'x' },
      },
    });

    expect(event.request.data).toBeUndefined();
    expect(event.request.query_string).toBeUndefined();
    expect(event.request.cookies).toBeUndefined();
    expect(event.request.url).toBe('https://x.supabase.co/rest/v1/messages');
  });

  test('beforeBreadcrumb keeps fetch metadata but drops the payload', () => {
    const { beforeBreadcrumb } = initOptions;

    const crumb = beforeBreadcrumb({
      category: 'fetch',
      data: {
        url: 'https://x.supabase.co/rest/v1/messages',
        method: 'POST',
        status_code: 201,
        body: 'private message text',
      },
    });

    expect(crumb.data.status_code).toBe(201);
    expect(crumb.data.method).toBe('POST');
    expect(crumb.data.body).toBeUndefined();
  });

  test('identifyUser attaches an id and nothing else', () => {
    identifyUser('user-123');
    expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'user-123' });
  });

  test('signing out clears the user', () => {
    identifyUser(null);
    expect(Sentry.setUser).toHaveBeenCalledWith(null);
  });

  afterAll(() => setLogReporter(null));
});

/**
 * fetchFeedPage() runs inside traceJourney(), so this helper sits on a path the
 * app cannot load the feed without. In development monitoring is disabled and
 * Sentry is never initialised — the exact configuration every contributor runs
 * — so the uninstrumented path has to be the safe one.
 */
describe('traceJourney without monitoring started', () => {
  let traceJourney;

  beforeAll(() => {
    jest.resetModules();
    jest.doMock('../../config/flags', () => ({
      ...jest.requireActual('../../config/flags'),
      FLAGS: { ...jest.requireActual('../../config/flags').FLAGS, monitoringEnabled: false },
    }));
    traceJourney = require('../monitoring').traceJourney;
  });

  test('still runs the work and returns its value', async () => {
    await expect(traceJourney('feed.load', async () => ({ data: [1, 2] }))).resolves.toEqual({
      data: [1, 2],
    });
  });

  test('still propagates failures rather than swallowing them', async () => {
    await expect(
      traceJourney('feed.load', async () => {
        throw new Error('rpc exploded');
      }),
    ).rejects.toThrow('rpc exploded');
  });
});
