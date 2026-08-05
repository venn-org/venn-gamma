/**
 * Feature flags and tunable product limits.
 *
 * These used to be `const TEMP_...` declarations inside the screens that read
 * them, which made a temporary product decision indistinguishable from
 * implementation detail and impossible to flip per environment. Anything that
 * product might want to change without a code review belongs here.
 *
 * Values are read once at module load — treat them as build-time constants.
 * When these move to remote config, only this file changes.
 */
import { isDev } from './env';

export const FLAGS = {
  /**
   * Daily view limit off: profiles cycle (wrap around) instead of dead-ending
   * at "come back tomorrow" once the deck is exhausted. While this is true the
   * feed also skips writing `profile_views` rows, since a cycling deck re-shows
   * every profile and those rows only mean anything once the limit is back.
   */
  dailyViewLimitEnabled: false,

  /**
   * Request resized images from Supabase Storage's `/render/image/` endpoint.
   *
   * OFF because it is a paid Storage add-on that is not enabled on this
   * project — every request returns
   * `403 FeatureNotEnabled: feature not enabled for this tenant`, which blanks
   * every photo in the app. Verify with:
   *
   *   curl -o /dev/null -w '%{http_code}\n' \
   *     "$SUPABASE_URL/storage/v1/render/image/public/photos/<a-real-object>?width=800"
   *
   * A 200 means it is safe to turn on. Until then photos are served at full
   * upload size; the cheaper fix that works on any plan is to downscale before
   * upload in lib/photos.js#uploadPhoto.
   */
  supabaseImageTransforms: false,

  /**
   * Send crashes, errors, and performance data to Sentry.
   *
   * Off in development on purpose: dev-time crashes are already visible in
   * Metro/the browser console, and reporting them only burns the monthly
   * event quota with noise from half-finished code. Mirrors the `isDev` guard
   * lib/log.js already applies to debug(). Set EXPO_PUBLIC_SENTRY_DSN and flip
   * this to `true` locally if you need to verify the wiring itself.
   *
   * `preview` and `production` builds report; see lib/monitoring.js.
   */
  monitoringEnabled: !isDev,
};

export const LIMITS = {
  /** Likes granted per user per day, before any bonus. */
  dailyLikes: 5,
  /** Profiles viewable per day when `dailyViewLimitEnabled` is true. */
  dailyViews: 10,
  /** Likes added by one "get more likes" grant. */
  bonusLikesGrant: 5,
  /**
   * Rows pulled per feed fetch. Larger while the deck cycles.
   *
   * Capped at 100 because feed_candidates() clamps p_limit to 100 server-side
   * (it is a "SELECT the user table" endpoint otherwise). Asking for 200 did
   * not fetch 200 — it fetched 100 and made the page size look bigger than it
   * was. Raise both together or neither.
   */
  feedPageSize: 100,
  feedPageSizeLimited: 30,
  /** Messages loaded when a chat opens; older ones page in on scroll. */
  chatInitialMessages: 50,
  /** Hard cap on a single message, mirrored by a CHECK constraint in the DB. */
  maxMessageLength: 500,
};

export const INTERVALS = {
  /**
   * Presence heartbeat. Every write touches the `profiles` view's INSTEAD OF
   * triggers, so this is the app's most frequent write by a wide margin.
   *
   * Do NOT raise this without raising ONLINE_WINDOW_MS in lib/presence.js to
   * match: the window has to stay comfortably above the beat or users blink
   * offline between heartbeats. The load reduction comes instead from pausing
   * the timer while the app is backgrounded (see app/_layout.jsx).
   */
  presenceHeartbeatMs: 30_000,
  /** Fallback poll for realtime gaps — realtime is the primary path. */
  chatPollMs: 10_000,
  /** Other participant's last_active_at refresh while a chat is open. */
  chatPresencePollMs: 10_000,
  /** Tab badge counts fallback poll. */
  badgePollMs: 15_000,
  /** Collapse bursts of realtime badge events into one refresh. */
  badgeRefreshDebounceMs: 400,
};
