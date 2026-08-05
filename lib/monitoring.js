/**
 * Crash, error, and performance reporting (Sentry).
 *
 * This is the implementation of the hook lib/log.js was built around: it
 * installs a reporter so `warn()`/`error()` call sites — and the render
 * crashes components/ErrorBoundary.jsx catches — end up somewhere someone
 * will actually see them, without any of those ~dozen call sites changing.
 *
 * Two separate paths reach Sentry, and the difference matters when reading
 * an issue:
 *
 *   1. Real unhandled exceptions and promise rejections. Captured by the
 *      SDK's own `reactNativeErrorHandlersIntegration` (a default
 *      integration — no code here enables it), so they arrive with a real
 *      stack trace pointing at the code that actually threw.
 *   2. Everything routed through lib/log.js. By the time it gets here it has
 *      been flattened by describeError() into `{ message, code, ... }` with
 *      no Error object left, so these are sent with captureMessage. Sending
 *      them as exceptions would attach a stack trace pointing at this file,
 *      which is worse than no stack trace at all.
 *
 * See docs/superpowers/specs/2026-08-05-sentry-monitoring-design.md.
 */
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

import { env } from '../config/env';
import { FLAGS } from '../config/flags';
import { setLogReporter } from './log';

/** Maps lib/log.js's levels onto Sentry's severity scale. */
const SEVERITY = { warning: 'warning', error: 'error' };

let started = false;

/**
 * Fields that must never leave the device.
 *
 * This app handles message content, photos, and coordinates precise enough to
 * locate someone's home. Sentry's automatic instrumentation captures HTTP
 * activity as breadcrumbs, and every one of those things travels over
 * Supabase's REST/RPC endpoints — so the default behaviour has to be narrowed
 * rather than trusted. lib/log.js#describeError already keeps deliberate log
 * calls clean; this is the net under everything captured automatically.
 */
const SENSITIVE_KEYS = [
  'lat',
  'lng',
  'latitude',
  'longitude',
  'coords',
  'location',
  'body',
  'message_text',
  'content',
  'email',
  'phone',
  'password',
  'token',
  'access_token',
  'refresh_token',
];

function scrub(value, depth = 0) {
  // Bounded rather than fully recursive: a cyclic or very deep object would
  // otherwise hang the reporter, and a reporter must never be the thing that
  // breaks the app it is observing.
  if (depth > 4 || value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));

  const out = {};
  for (const [key, v] of Object.entries(value)) {
    out[key] = SENSITIVE_KEYS.includes(key.toLowerCase()) ? '[redacted]' : scrub(v, depth + 1);
  }
  return out;
}

/**
 * Strips request/response payloads from HTTP breadcrumbs.
 *
 * A `fetch` breadcrumb's `data` can carry the request body — i.e. the text of
 * a message someone just sent. The URL and status code are what make a
 * breadcrumb useful for debugging; the payload is not worth the exposure.
 */
function beforeBreadcrumb(breadcrumb) {
  if (breadcrumb?.category === 'fetch' || breadcrumb?.category === 'xhr') {
    return {
      ...breadcrumb,
      data: {
        url: breadcrumb.data?.url,
        method: breadcrumb.data?.method,
        status_code: breadcrumb.data?.status_code,
      },
    };
  }
  return breadcrumb;
}

function beforeSend(event) {
  if (event.request) {
    // Query strings on Supabase REST calls encode filter values — which, for
    // this app, includes user ids and location bounds.
    delete event.request.data;
    delete event.request.cookies;
    if (event.request.query_string) delete event.request.query_string;
  }
  if (event.extra) event.extra = scrub(event.extra);
  if (event.contexts) event.contexts = scrub(event.contexts);
  return event;
}

/**
 * Starts crash/error/performance reporting. Safe to call more than once.
 *
 * No-ops when disabled or unconfigured rather than throwing: a missing DSN is
 * a deployment oversight, not a reason to prevent the app from starting.
 */
export function initMonitoring() {
  if (started) return false;
  if (!FLAGS.monitoringEnabled || !env.sentryDsn) return false;

  const extra = Constants.expoConfig?.extra ?? {};

  Sentry.init({
    dsn: env.sentryDsn,
    environment: extra.appEnv ?? 'development',
    // Ties an issue back to the exact commit. app.config.js already captures
    // this from EAS_BUILD_GIT_COMMIT_HASH, so nothing new is needed at build
    // time — but it is null for a local build, and Sentry rejects an explicit
    // null release, hence the spread.
    ...(extra.commitSha ? { release: extra.commitSha } : {}),

    // Everything, for now. The app has no production traffic yet (see
    // docs/PERFORMANCE.md), so there is nothing to sample down from — and a
    // partial sample of near-zero traffic tells you nothing. Revisit against
    // the real event count before this approaches the monthly quota.
    tracesSampleRate: 1.0,

    // The SDK sends IP address and other identifying request data under this
    // flag. The only identity this app attaches is an opaque user id, set in
    // identifyUser() below.
    sendDefaultPii: false,

    beforeSend,
    beforeBreadcrumb,
  });

  // Every existing warn()/error() call site now reaches Sentry without being
  // touched. This is the one line lib/log.js's header was written for.
  setLogReporter((level, message, context) => {
    Sentry.captureMessage(message, {
      level: SEVERITY[level] ?? 'error',
      extra: context ? scrub(context) : undefined,
    });
  });

  started = true;
  return true;
}

/**
 * Attaches the signed-in user to subsequent events.
 *
 * The id alone — no email, no name. It is enough to see that eleven crashes
 * are one user hitting the same bug eleven times rather than eleven users,
 * which is the question worth answering, and it stays meaningless to anyone
 * reading the dashboard without database access.
 */
export function identifyUser(userId) {
  if (!started) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

/**
 * Times a critical user journey and reports failures with it.
 *
 * Wraps `fn` in a Sentry span so slow logins/feed loads show up as latency
 * data rather than only as complaints. Returns whatever `fn` returns, and
 * rethrows what it throws — instrumentation must not change behaviour.
 *
 * Deliberately not applied to the presence heartbeat: it is the highest-volume
 * call in the app (docs/PERFORMANCE.md) and tracing it would spend most of the
 * event quota re-measuring something already known.
 */
export function traceJourney(name, fn) {
  if (!started) return fn();
  return Sentry.startSpan({ name, op: 'app.journey' }, fn);
}
