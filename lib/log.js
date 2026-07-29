/**
 * Application logger.
 *
 * Direct `console.*` calls ship to production, where they cost performance on
 * Hermes and go nowhere useful. This is the one sanctioned path: debug output
 * is dropped outside development, and warnings/errors funnel through a single
 * reporter so wiring up Sentry (or any other crash service) is a one-line
 * change here rather than a grep across 60 files.
 */
import { isDev } from '../config/env';

let reporter = null;

/**
 * Install a crash/error reporter, e.g. from the root layout:
 *   setLogReporter((level, message, context) => Sentry.captureMessage(...))
 */
export function setLogReporter(fn) {
  reporter = typeof fn === 'function' ? fn : null;
}

function report(level, message, context) {
  if (!reporter) return;
  try {
    reporter(level, message, context);
  } catch {
    // A failing reporter must never take down the code it was observing.
  }
}

/** Development-only. Compiled out of a release bundle by the isDev guard. */
export function debug(message, context) {
  // eslint-disable-next-line no-console -- this module is the sanctioned wrapper
  if (isDev) console.log(`[venn] ${message}`, context ?? '');
}

/** Something recoverable went wrong: a fallback fired, a poll failed. */
export function warn(message, context) {
  if (isDev) console.warn(`[venn] ${message}`, context ?? '');
  report('warning', message, context);
}

/** Something the user will notice, or that should never happen. */
export function error(message, context) {
  console.error(`[venn] ${message}`, context ?? '');
  report('error', message, context);
}

/**
 * Normalises the shapes this codebase throws around — a supabase-js
 * `{ message, code }`, a real Error, or a bare string — into one loggable
 * object, so call sites stop doing `e?.message ?? e` by hand.
 */
export function describeError(e) {
  if (!e) return { message: 'unknown error' };
  if (typeof e === 'string') return { message: e };
  return {
    message: e.message ?? String(e),
    code: e.code ?? undefined,
    details: e.details ?? undefined,
    hint: e.hint ?? undefined,
  };
}

export const log = { debug, warn, error, describeError, setLogReporter };
