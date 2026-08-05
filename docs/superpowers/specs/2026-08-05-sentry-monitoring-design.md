# Crash, error, and performance monitoring — design

## Context

The app has no monitoring today. `lib/log.js` already anticipates this — it's
a "sanctioned wrapper" around `console.*` with a `setLogReporter(fn)` hook
whose own doc comment says wiring up "Sentry (or any other crash service)"
should be a one-line change there, rather than a grep across every call site.
`components/ErrorBoundary.jsx` catches render-phase crashes and calls
`logError`, but notes there's "no crash reporter wired up either, no record
that it happened." Both were clearly built to have a reporter dropped in
later. This spec is that reporter.

The app ships to three targets from one Expo/expo-router codebase: web
(Vercel, the current primary surface), and Android/iOS later via EAS Build
(`eas.json` already has `development`/`preview`/`production` profiles for
all three, native builds just haven't happened yet). Backend is Supabase
(Postgres + two small Deno edge functions) — out of scope here per the
decision below.

## Goals

- Every crash (native, once Android/iOS ship) and unhandled JS error is
  captured with enough context to debug it, without code changes at the ~dozen
  existing `log.error`/`log.warn` call sites.
- Two categories of error `ErrorBoundary` and today's call sites don't cover
  — unhandled promise rejections and errors thrown in event handlers — get a
  safety net.
- Performance visibility into the journeys that matter: screen/route
  transitions, network calls (Supabase RPC/REST), and a few named critical
  flows (login, onboarding, feed load, sending a like/message).
- Works today on web-only, and requires zero re-architecture when Android
  ships later.
- No PII (message content, exact coordinates, photos, email) leaves the
  device in an error report.
- Free, for the long term, at this app's current traffic scale.

## Non-goals

- Supabase Edge Functions (`broadcast-waitlist`, `waitlist-unsubscribe`) are
  explicitly excluded from this pass — low traffic, already have Supabase's
  own function logs. Revisit if they start misbehaving.
- Database-level performance monitoring is already covered separately by
  `docs/PERFORMANCE.md` / `pg_stat_statements` — not duplicated here.
- No self-hosted monitoring infrastructure (Prometheus/Grafana/OTel
  collector) — there's no long-running backend process to scrape; the
  "server" here is Supabase's managed platform plus two edge functions
  already excluded above.

## Tool choice

**Sentry**, via the GitHub Student Developer Pack education offer (50K
errors/mo, 100K performance events/mo, 1GB attachments, 500 replays/mo, team
features, renewable annually) rather than the free Developer tier (5K/10K,
1 seat) — same integration path either way, just higher headroom and
multi-seat access from day one. If student status ever lapses, migrating
back to the free tier or a paid plan is a config change (new DSN), not a
re-architecture.

Chosen over Firebase Crashlytics because Crashlytics has no web
crash-reporting story at all — this app's primary surface today is web, and
Sentry is the only option that gives first-class browser error + performance
tracking _and_ native Android/iOS coverage from the same SDK.

## Architecture

**One SDK, one Sentry project, three platforms.** `@sentry/react-native`,
installed with its Expo config plugin. Because Expo Router compiles the same
JS for web/Android/iOS, Sentry's Expo integration is built to cover all
three from a single `Sentry.init()` call and a single DSN — not a split
native-SDK/browser-SDK setup. This is why turning it on now, web-only, costs
nothing when Android is added later: the config plugin's native wiring runs
at Expo's prebuild step regardless of which platforms are currently being
built, so nothing about this setup changes when a native build first
happens — only the verification step (§ Testing) needs re-running against a
real Android build.

**Verified against Sentry's live docs (2026-08-05):** package is
`@sentry/react-native`, installed via `npx expo install @sentry/react-native`;
the Expo config plugin is `@sentry/react-native/expo` (added to
`app.config.js`'s `plugins`, taking `organization`/`project`/`url`); the root
component is wrapped as `export default Sentry.wrap(RootLayout)`. Unhandled
promise rejections and top-level JS exceptions are captured **automatically**
by the SDK's default `reactNativeErrorHandlersIntegration` (on by default
since it's a default integration, engine-aware for Hermes/JSC/web since SDK
6.15+) — no custom global-handler code is needed, which simplifies the
Components table below versus this doc's first draft.

Web support inside this same package is real (Expo SDK 50+ / Sentry RN SDK
5.16+) with purpose-built tooling for the web-export source-map case
(`npx expo export --platform web --source-maps` +
`npx sentry-expo-upload-sourcemaps dist`), but has a known rough edge — see
Risks. The Testing section below treats web source-map resolution as
something to verify early, with a documented fallback, not something to
assume works.

**It plugs into the seam that already exists.** A new `lib/monitoring.js`
calls `Sentry.init()` at startup and registers a reporter via
`log.setLogReporter(fn)` that forwards `warn`/`error` calls into
`Sentry.captureMessage`. (`captureMessage`, not `captureException`: by the
time an error reaches `lib/log.js`, call sites have already normalized it
through `describeError()` into a plain `{ message, code, details, hint }`
object — there is no live stack trace left to attach, so fabricating one
would only point into `lib/log.js` itself and mislead. Real unhandled
exceptions with real stacks are already captured directly by the default
integration above, independent of this path.) Every existing call site
already routes through `lib/log.js`, and `ErrorBoundary.jsx` already calls
`logError` — **neither file needs to change**. That's the payoff of the seam
having been built ahead of time.

## Components & changes

| File                            | Change                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/monitoring.js` (new)       | `initMonitoring()`: calls `Sentry.init()` with DSN/environment/release from `config/env.js` and `expo-constants` (`extra.commitSha`, `extra.appEnv`); registers the `setLogReporter` callback (via `captureMessage`); applies the PII-scrubbing `beforeSend`/`beforeBreadcrumb` hooks (see below). Global unhandled-rejection/exception capture needs no code here — it's on by default via the SDK's `reactNativeErrorHandlersIntegration`. |
| `config/env.js`                 | Add `EXPO_PUBLIC_SENTRY_DSN` to `RAW`/validation, following the existing pattern (not in `REQUIRED` — monitoring must never be the reason the app fails to boot).                                                                                                                                                                                                                                                                            |
| `config/flags.js`               | Add `monitoringEnabled` to `FLAGS`, gated off in `development` by default — mirrors the existing `isDev` guard `lib/log.js` already uses for `debug()`. `preview` and `production` default on.                                                                                                                                                                                                                                               |
| `app.config.js`                 | Add the Sentry Expo config plugin to the `plugins` array; pass org/project/auth-token at build time for native symbolication. Reuses the `commitSha` already captured in `extra` as the Sentry `release` identifier — no new build-time data needed.                                                                                                                                                                                         |
| `app/_layout.jsx`               | Call `initMonitoring()` before anything else runs (alongside the existing `SplashScreen.preventAutoHideAsync()` call), and wrap the exported root component per Sentry's current Expo Router integration guidance (routing/performance instrumentation).                                                                                                                                                                                     |
| `.env.example`                  | Document `EXPO_PUBLIC_SENTRY_DSN` alongside the existing Supabase/VAPID vars.                                                                                                                                                                                                                                                                                                                                                                |
| EAS secrets                     | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` (`eas secret:create`) — read by the `@sentry/react-native/expo` config plugin during `eas build`, which handles native source-map upload itself. Never `EXPO_PUBLIC_*`: the token can create releases/upload source maps and must not ship in the client bundle.                                                                                                                         |
| `package.json` (`build` script) | Per `docs/CICD.md`, web ships via **Vercel's git integration running `npm run build`** — `.github/workflows/deploy.yml` never touches the web build at all (it only handles EAS native builds/OTA). So web source-map upload has to be part of the `build` script itself: `expo export -p web --source-maps` then `sentry-expo-upload-sourcemaps dist`, skipped when `SENTRY_AUTH_TOKEN` is unset so a local `npm run build` still succeeds. |
| Vercel project env vars         | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` added in the Vercel dashboard (Project Settings → Environment Variables) — GitHub Actions secrets are invisible to a Vercel-triggered build, so these live there separately from the EAS secrets above.                                                                                                                                                                                  |

## Data flow

```
existing call sites (log.error/log.warn)  ─┐
ErrorBoundary.componentDidCatch            ─┴─▶ lib/log.js report() ─▶ Sentry reporter ─▶ Sentry
                                                                        (captureMessage)

real unhandled exceptions / promise      ─▶ Sentry default integration ─▶ Sentry
rejections (uncaught by the above)          (reactNativeErrorHandlersIntegration,   (captureException,
                                              on by default, no code needed)          real stack trace)

expo-router navigation  ─▶ Sentry routing integration ─▶ performance transaction
fetch (Supabase calls)  ─▶ Sentry auto-instrumentation ─▶ performance span
hand-named spans: login, onboarding complete, feed load, send like/message
```

Every event carries: `environment` (`development`/`preview`/`production`,
matching `APP_ENV`), `release` (git SHA, from `extra.commitSha`), and a
non-reversible user UUID (`Sentry.setUser({ id })`) for correlating multiple
reports to one user — no email, name, or other identifying field attached.

Presence heartbeat (`touchPresence`, the app's highest-volume call by
construction per `docs/PERFORMANCE.md`) is explicitly **not** traced —
instrumenting the busiest call in the app would burn performance-event
quota for a call whose latency profile is already known and uninteresting.

## Privacy & PII scrubbing

This is a dating/roommate-matching app — location, photos, message content.
`beforeSend`/`beforeBreadcrumb` hooks in `lib/monitoring.js` strip:

- Any HTTP request/response body Sentry's fetch auto-instrumentation would
  otherwise capture as a breadcrumb (profile data, message text, coordinates
  all travel through Supabase's REST/RPC calls).
- Precise geolocation, if it ever appears in an error's `extra` context.

`lib/log.js#describeError` already normalizes thrown errors down to
`{ message, code, details, hint }` — it never carries full row objects — so
existing call sites are already scrubbed at the source; the `beforeSend`
hook is the backstop for anything auto-captured that bypasses that path
(navigation breadcrumbs, network breadcrumbs, native crash context).

If Session Replay (part of the education tier) is ever turned on, it stays
under Sentry's default privacy-safe masking (all text masked, all media
blocked) — not loosened, given the content this app handles.

## Sampling & environment gating

- `development`: monitoring off by default (`FLAGS.monitoringEnabled`),
  matching the existing `isDev` convention — dev-time crashes are visible in
  the terminal/Metro already and don't need to compete for quota.
- `preview`/`production`: on. `tracesSampleRate: 1.0` initially — the app
  has "no production data yet" per `docs/PERFORMANCE.md`, so there's no
  quota-pressure reason to sample down. Revisit once real traffic approaches
  the monthly performance-event quota (a dashboard check, not a guess).

## Testing / verification plan

Data collection gets verified end-to-end, not assumed from "the code
compiles":

1. A dev-menu-only test-crash trigger (stripped from release builds) to
   confirm an event actually reaches the Sentry dashboard.
2. A production-shaped web build's stack trace resolves to real source
   lines, not a minified bundle offset — proves the source-map upload step
   works, not just that it ran without erroring. This is the step most
   likely to surface the web source-map rough edge noted in Risks; if it
   does, the documented fallback is switching the `Platform.OS === 'web'`
   branch of `lib/monitoring.js` to `@sentry/react` (a mature, separately
   maintained browser SDK) reporting to the same Sentry project, rather than
   shipping unreadable production stack traces.
3. When Android/iOS builds are first produced (later, out of this spec's
   immediate scope but a required follow-up): repeat both checks against a
   real native build, since the native path can't be verified until a
   native build exists.

## Alerting

Minimal, to avoid the alert fatigue this skill explicitly warns against:

- One alert on crash-free session rate regression (Sentry's built-in
  Release Health metric).
- One alert on elevated error rate (not "alert on every error").

No alert rules beyond these two in this pass — add more only once real
traffic shows what's actually worth waking someone up for.

## Risks / open questions

- **Web source-map resolution is a known rough edge.** Sentry ships
  first-party tooling for it (`sentry-expo-upload-sourcemaps`), but there is
  an open upstream issue (getsentry/sentry-react-native#5857) about web
  source maps not resolving despite correctly-uploaded Debug IDs on some
  Metro/hosting combinations. Task 2's verification step (§ Testing) catches
  this early rather than discovering it after shipping; the fallback
  (`@sentry/react` for the web platform branch) is documented above, not
  left as an open question to solve mid-incident.
- **Education-tier renewal**: tied to student status; annual renewal with
  two available accounts as backup. Not a blocker, worth a calendar
  reminder outside this spec's scope.
- **Android/iOS verification is deferred** until a native build exists — the
  setup is forward-compatible by design, but "forward-compatible" is a claim
  this spec makes, not yet a measurement.
