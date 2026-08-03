# CI/CD & Release Process

This is the operational counterpart to `docs/CONTRIBUTING.md`: that file
covers where code goes and how to write it, this one covers how a change
gets from a laptop to a phone in someone's hand — safely, repeatably, and
without waking anyone up at 2am. Written for whoever joins this team next.

## The shape of the system

Three moving parts ship independently, on different clocks:

| Part                 | Ships via                          | Review gate         | Speed                     |
| -------------------- | ---------------------------------- | ------------------- | ------------------------- |
| Mobile app (native)  | EAS Build → App Store / Play Store | Apple/Google review | days                      |
| Mobile app (JS only) | EAS Update (OTA)                   | none but this team  | minutes                   |
| Web build            | Vercel (git-integrated)            | none but this team  | minutes                   |
| Database             | `supabase db push`                 | none but this team  | seconds, irreversible-ish |

That last column is the whole reason this document exists. A native build
is self-throttling — Apple's review queue is a rollback button you don't
have to build. OTA updates and DB migrations have no such brake: they reach
every live user, or every row, the moment the command finishes. Most of
what follows is about putting a deliberate gate in front of exactly those
two, without slowing down the other two.

## Environments

|                     | Local                                                            | Preview                              | Production               |
| ------------------- | ---------------------------------------------------------------- | ------------------------------------ | ------------------------ |
| App config          | `APP_ENV=development`                                            | `APP_ENV=preview`                    | `APP_ENV=production`     |
| Bundle ID / package | `com.venn.app` (dev keeps prod's identity — see `app.config.js`) | `com.venn.app.preview`               | `com.venn.app`           |
| Supabase            | `supabase start` (local Docker Postgres)                         | **same project as production today** | `iahnrlgeivjzmzzqloan`   |
| EAS build profile   | `development` (dev client)                                       | `preview` (internal APK/IPA)         | `production`             |
| Web                 | `expo start --web`                                               | Vercel PR preview deploy             | Vercel production deploy |

The row to notice: **there is currently one Supabase project**, shared by
preview builds and production. That was a reasonable place to start; it
stops being one the day a preview build's test data, or a migration being
tried out on a preview install, touches real users' rows. Before this gets
much bigger, do one of:

- **Supabase branching** (paid tier) — an ephemeral Postgres branch per PR,
  auto-created/destroyed, closest to how Vercel previews already work.
- **A second, permanent "staging" project** — cheaper, more manual (you
  maintain two migration histories in sync), but zero new tooling.

Until then, treat the single project as production for every practical
purpose: don't point a preview build at it with test accounts you don't mind
becoming real rows, and don't try a migration against it without having just
run the replay-from-zero check (below) locally first.

## Git workflow

```
Star/feature-x  ──PR──▶  development  ──PR──▶  main
   (feature branch)      (integration)      (releasable)
```

- Feature branches PR into `development`. CI (`ci.yml`) runs lint, typecheck,
  tests, and the secret scan on every PR.
- `development` PRs into `main` when what's on it is ready to ship. This is
  the point that matters: **merging to `main` is what triggers deploys**
  (`deploy.yml` builds on push to `main`). Nothing should land on `main`
  that you are not prepared to see on a phone within the hour.
- Tag `main` after a release (`git tag v1.2.0`) so "what shipped when" is a
  `git log --tags` away, not an archaeology project.

**Before adopting this flow for real: `development` and `main` are currently
84 files apart.** Land a merge PR from `development` into `main` first — a
big one, reviewed like any other — so the two branches start this process in
sync. Doing the merge _as_ the first use of the new flow is a good forcing
function for reading through everything that's queued up.

## What CI checks, and why each one exists

`.github/workflows/ci.yml` — on every push to `main`/`development` and every
PR:

- **Lint, typecheck, test** — standard.
- **Secret scan** (`check:secrets`) — the app bundle only ever ships
  `EXPO_PUBLIC_*` values; this fails the build if a `service_role` key or
  similar server-only credential appears in client code. See the script's own
  comments for what it matches and why.

`.github/workflows/db-migrations.yml` — on any PR or push touching
`supabase/migrations/**`:

- **Replays every migration from zero** against a throwaway local Postgres
  (`supabase start && supabase db reset`). This automates what
  `docs/CONTRIBUTING.md` has asked a human to remember to do by hand — and
  that file documents two real incidents where a migration that had already
  run everywhere turned out to be silently unreplayable, discovered weeks
  later. This check makes that class of bug fail a PR instead.

Neither of these touches a real Supabase project. No secrets required, safe
to run on every PR without a second thought.

## Shipping a change

The decision that matters is **what kind of change is this**, because it
decides which of the four rows in the first table you're using:

```
Does it touch native code, a config plugin (app.json "plugins"), or bump
the Expo SDK?
  │
  ├─ YES → needs a native build. Ship via `deploy.yml` (mode: build).
  │        Days of lead time (store review) — plan accordingly.
  │
  └─ NO → JS-only (UI, screens, business logic, bugfixes)
           → ship via `deploy.yml` (mode: ota-update). Minutes, no review.

Does it also change the database?
  │
  └─ YES, in either case above → the DB change goes out via `db-deploy.yml`,
     SEPARATELY, and — this is the part that bites people — it must go out
     in the right order relative to the app change. See below.
```

### The rule that actually matters: version skew is permanent, not a rollout phase

Once OTA updates and phased store rollouts are both live, there is no moment
where "the new app" and "the old app" aren't both hitting the database at
once — a phased store rollout can sit at 1% for days, and a user can simply
not open the app for a week and skip an OTA update entirely. **Design every
DB change to work with the previous app version, not just the new one.**

In practice:

- Adding a column/table: safe any time. Ship the migration first, the app
  change whenever.
- Renaming or removing a column the old app reads or writes: never do this
  in one step. Add the new shape, ship an app version that writes both,
  wait out a release cycle, _then_ drop the old column in its own migration.
- Changing an RPC's return shape (like `like_profile()`'s `reason` column,
  added in `20260730090000_enforce_gender_pref_on_likes.sql`): only safe if
  every caller uses named/positional access that tolerates an extra column,
  or if you accept that old clients briefly ignore the new field. Check
  before assuming.

This project's migration history is already disciplined about this
(`supabase/migrations/*` consistently uses `ON CONFLICT`, `IF NOT EXISTS`,
and additive changes) — keep that habit going as the team grows.

### Step by step

1. Merge the app change into `main` (native build kicks off automatically;
   OTA and DB changes do not — see below).
2. If there's a DB migration: run `docs/CONTRIBUTING.md`'s local
   `supabase db reset` check yourself first (belt and suspenders — CI already
   did this on the PR, but confirm nothing changed underneath you), then
   trigger `db-deploy.yml` manually from the Actions tab. It requires
   approval from the `production` GitHub Environment — someone other than
   whoever clicked "run" should be the one to approve, even on a two-person
   team.
3. If it's JS-only: trigger `deploy.yml` with `mode: ota-update`. Same
   environment-approval gate. Watch adoption on the EAS dashboard — a bad OTA
   update is fixed by publishing another one immediately (see rollback,
   below), not by waiting for a store review cycle.
4. If it's native: `deploy.yml`'s `build` job already ran on the `main` push.
   Submit to the stores from the EAS dashboard (or wire up `eas submit` once
   `eas.json`'s `submit.production` has real store credentials — it doesn't
   yet).
5. Watch error rates / crash reports for the next hour. (See Monitoring,
   below, for what to watch — this is currently the weakest link.)

## Rollback

Write down the rollback command _before_ you need it, per change type:

**OTA update** — publish the previous good update back to the channel:

```bash
eas update:list --channel production        # find the last good group id
eas update:republish --group <good-group-id> --channel production
```

Faster than any app-store process by orders of magnitude — this is the whole
point of having OTA at all. A bad OTA update should be fixed in under five
minutes from the moment it's noticed.

**Native build** — you cannot "undo" a released store build. Options, in
order of speed:

- Halt a phased rollout in App Store Connect / Play Console (if one is in
  progress) — stops the bleeding without needing a new build.
- Ship a corrective OTA update on top of the bad native build, if the bug is
  in JS.
- Submit a new build with the fix and expedite review if the bug is native
  and severe (both stores have an expedited-review request path).

**Database migration** — migrations here are forward-only; there is no
`down.sql`. **Never run `supabase db reset` against production** — that's a
local/CI-only command that recreates the database from scratch, and it will
happily destroy every row. The only paths for a bad production migration are:

- **Roll forward**: write a new migration that undoes the damage
  (`docs/CONTRIBUTING.md`'s "an applied migration is a historical record, not
  source code" applies here too — fix forward, don't edit history).
- **Restore from backup**: this is why point-in-time recovery matters — see
  Monitoring below. If PITR isn't enabled yet, enabling it is the single
  highest-value pre-launch task left on this list.

## Secrets this pipeline needs

Set these as GitHub Actions repo secrets (Settings > Secrets and variables >
Actions), never as plain env vars in a workflow file:

| Secret                  | Used by                          | Where to get it                                                                         |
| ----------------------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| `EXPO_TOKEN`            | `deploy.yml` (build, ota-update) | expo.dev → account settings → access tokens                                             |
| `SUPABASE_ACCESS_TOKEN` | `db-deploy.yml`                  | supabase.com dashboard → account access tokens                                          |
| `SUPABASE_DB_PASSWORD`  | `db-deploy.yml`                  | the production project's DB password (Supabase dashboard → Project Settings → Database) |

And configure the `production` GitHub Environment (Settings > Environments)
with at least one required reviewer, so `db-deploy.yml` and the `ota-update`
job in `deploy.yml` cannot run without a second person's approval — that's
what actually enforces "no unattended production DB writes / instant pushes
to every live user," the YAML alone only requests it.

One-time setup still needed before OTA updates work at all: someone logged
into EAS needs to run `eas update:configure` once (wires up the branch↔channel
mapping `eas update` publishes against).

## Monitoring — the current gap

Today, the first sign of a production problem is a user complaint. Before
real users depend on this app, close at least these:

- **Crash reporting** (Sentry or similar). `lib/log.js`'s `warn`/`error`
  reporter is already the single seam this should plug into — see its
  comments.
- **Uptime/API health check** — a free pinger (UptimeRobot, Better Stack)
  hitting the Supabase REST URL on a schedule, alerting if it goes down.
- **Point-in-time recovery** on the Supabase project, for the DB-rollback
  path above.
- **EAS Update adoption metrics** (expo.dev dashboard) — so a bad OTA update
  is caught by a dip in adoption/crash-free rate, not by user reports.

None of these are CI/CD in the strict sense, but they're what turns "the
pipeline ran" into "the pipeline worked" — worth prioritizing before
onboarding more engineers, not after.

## Tips for doing this well as the team grows

- **Automate the check, don't schedule a reminder.** The migration-replay
  check exists because "remember to run `supabase db reset` before pushing"
  was a real instruction in this repo that got missed twice. If you catch
  yourself writing a checklist item a machine could verify, that's the next
  CI job, not the next Slack pin.
- **Decide the rollback before you ship, not during the incident.** If you
  can't say in one sentence how you'd undo a change, that's a sign to split
  it into a smaller one that you can undo.
- **Practice the DB restore once, before you need it.** Restore a backup to
  a scratch project and time it. The first time you do this should not be
  during an outage.
- **Alerts page a human only for things a human must act on right now.**
  Everything else goes to a log or a dashboard. A team that gets paged for
  noise stops trusting pages, and then misses the real one.
- **Keep a one-line-per-release changelog.** Cheap now (a line in the tag
  message is enough), and the first thing anyone reaches for once "when did
  we ship X" stops being answerable from memory.
- **Treat `main` as always-releasable, not as "done for now."** If something
  needs more baking, it stays on `development` or its own branch — not on
  `main` behind a feature flag someone forgot to check before merging.
- **When the team grows past two or three people, revisit the shared
  Supabase project first.** It's the one piece of this setup that scales
  worst with headcount, precisely because it's shared, unversioned-per-branch
  state — everything else here (branches, CI, environments) is designed to
  scale by adding more of the same thing; this one wants a different shape
  entirely (branching or a separate staging project) once more than one
  person can be mid-migration on it at once.
