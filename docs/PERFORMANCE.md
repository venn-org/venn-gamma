# Performance — methodology, findings, and what's still open

The app has no production data yet, so there was no real baseline to
profile. This documents how a synthetic one was built instead, what it
found, what was fixed (`20260804000000_feed_scale_indexes.sql`), and what's
a genuine open question rather than a solved problem — read the last
section before assuming "the database is optimized."

## Methodology

`scripts/load-test-seed.sql` generates, against a local `supabase db reset`
instance:

- 50,000 profiles spread across every real city/zone in `public.zones`
- ~1.5M likes (30 per profile), 5,400 matches, one "power user"
  (`seed-1`) with 400 matches
- ~300k+ messages, 100k notifications, ~100k profile views

That alone isn't enough to trust: a freshly-seeded `likes_log` has every row
packed into the same narrow time window, which is not what a table that
accumulates history for months actually looks like — and it turns out that
distinction changes which query plan wins (see finding 1). Before
benchmarking anything time-windowed, spread the data out to look like real
accumulated history:

```sql
UPDATE public.likes_log
SET created_at = now() - (random() * interval '180 days') - interval '7 days'
WHERE random() < 0.97;
```

All measurements below are `EXPLAIN (ANALYZE, BUFFERS)`, taken at steady
state (cache warmed by a throwaway run first — the first run after any bulk
write is dominated by disk reads and hint-bit setting, not the query itself).

**Caveat on absolute numbers**: the local test container runs with
`shared_buffers = 128MB` against a ~1GB seeded database — the working set
does not fully fit in cache, so absolute end-to-end timings here are
pessimistic compared to a properly sized production instance. The _relative_
improvements and the _architectural_ findings (below) are the reliable
takeaways; before trusting an absolute millisecond number in production,
check the project's actual `shared_buffers`/compute tier against its real
data size.

## Findings and fixes

### 1. `feed_candidates()`'s exposure term rescanned all of `likes_log` on every call

The exposure-damping term (`20260731000000_feed_ranking_rpc.sql`) aggregates
"likes received in the last 7 days" per candidate. With a realistic
accumulated-history shape (1.5M total rows, ~45k in the last 7 days — 3% of
the table), this was a **Parallel Seq Scan of the entire table**, because the
existing index (`idx_likes_to_user_recent`, keyed on `to_user_id` first) has
no equality filter to exploit here — the query groups by `to_user_id`, it
doesn't filter by it.

|                     | Seq scan (before)               | Indexed (after)        |
| ------------------- | ------------------------------- | ---------------------- |
| Time (steady state) | 62.5ms                          | 19.8ms                 |
| Buffers touched     | 27,635 (hit=14,367 read=13,268) | 13,627 (all cache-hit) |

**3.2x faster** — but the number that actually matters long-term is that the
seq scan's cost is `O(all-time row count)` and grows forever as `likes_log`
accumulates (it's a history-preserving, append-mostly log by design — see
`schema.sql`'s design notes), while the new index's cost is `O(rows in the
last 7 days)` and stays flat regardless of how much history has piled up.
This was going to get worse every month in production even if nothing else
changed.

**Fix**: `CREATE INDEX idx_likes_recent_by_time ON likes_log (created_at)
WHERE revoked_at IS NULL`.

### 2. `idx_profiles_feed` was unusable by the query it was built for

`fetchFeedCandidates()` (`services/profileService.js`) is the resilience
fallback used only if the `feed_candidates()` RPC is somehow missing. Its
query filters `paused`/`onboarding_done` and orders by `last_active_at` —
but the existing index led with `user_type`, a column that query (and every
other query in the codebase — confirmed by grep, `user_type` is only ever
filtered client-side) has never filtered on. An index can't serve an `ORDER
BY` past an unfiltered leading column, so this was a full `Seq Scan` +
top-N sort of the whole table, every call.

|                 | Before              | After                    |
| --------------- | ------------------- | ------------------------ |
| Time            | 17.7ms              | 0.31ms                   |
| Buffers touched | 2,149 (whole table) | 202 (bounded by `LIMIT`) |

**57x faster.** The replacement also drops the redundant `paused`/
`onboarding_done` columns from the index entirely — a partial index's own
`WHERE` clause already guarantees them once it matches the query's `WHERE`,
so repeating them as index columns only makes the index bigger for no
benefit.

**Fix**: replaced `idx_profiles_feed` with `idx_profiles_feed_v2 ON
profile_core (last_active_at DESC) WHERE (paused = false AND
onboarding_done = true)`.

### Write-side check

Both new indexes were checked against insert throughput, not just reads
(`MUST NOT DO: ignore write amplification caused by new indexes`): a 10,000-row
batch insert into `likes_log` with the new index in place completed in
2.25s (~4,400 rows/sec). A single `like_profile()` call inserts one row —
the marginal per-row index-maintenance cost is sub-millisecond and
negligible next to normal RPC/network latency.

## What was investigated and NOT changed

`feed_candidates()`'s eligibility filtering (the `eligible` CTE) costs
~135ms in isolation at this scale: `idx_profiles_geog` correctly narrows the
50km radius to ~23k geographically-eligible candidates, then
`gender_pref_admits()` is evaluated as a per-row function call twice (mine
about them, theirs about me), each needing a `profile_preferences` lookup.
This is real cost, but it is not a missing-index problem — it's the
inherent price of the whole-pool, reciprocal-scoring design documented in
`20260731000000_feed_ranking_rpc.sql`'s own header (scoring the _entire_
eligible pool instead of an arbitrary fetched page is the point of that
migration). No index shape changes that; the levers when this needs to move
are architectural — a smaller default search radius, geographic
sharding/partitioning once a city's active pool is large enough, or
pre-computing/caching the exposure and eligibility sets instead of
recomputing per request. Not needed yet; worth knowing before reaching for
another index that won't help.

## Open items — genuinely unvalidated, flagging rather than guessing

- **Autovacuum tuning for high-churn tables.** `likes_log` (revoked_at
  updates), `messages` (read-flag updates), and `profile_views` (constant
  inserts) are exactly the shape of table that benefits from a lower
  `autovacuum_vacuum_scale_factor` than Postgres's default — but bloat only
  shows up after sustained real traffic, which this one-shot synthetic seed
  can't produce. This is a reasoned recommendation, not a measured one;
  revisit with real `pg_stat_user_tables` numbers a few weeks after launch.
- **Production instance sizing.** Given the `shared_buffers` caveat above,
  confirm the production Supabase project's compute tier has enough memory
  to keep the active working set (recent profiles, recent likes, open
  matches) cached — `pg_stat_statements` (already enabled) plus
  `pg_stat_database.blks_hit / blks_read` after a week of real traffic is
  the way to check this for real, not another synthetic test.
- **`fetchUnreadMessageCount`'s poll cadence.** `INTERVALS.badgePollMs` is
  15 seconds (`config/flags.js`); the query itself is fast (27ms for a
  400-match power user, correctly indexed), but it's the single most
  frequently-executed query per active user in the app by construction. Not
  a database problem today — worth knowing which query that load-test
  finding actually is before optimizing something else instead.

## Reproducing this

```bash
supabase start
supabase db reset
docker exec -i supabase_db_venn-gamma psql -U postgres < scripts/load-test-seed.sql
# then the created_at UPDATE above, then EXPLAIN (ANALYZE, BUFFERS) whatever
# query you're checking, as the `authenticated` role with a real JWT claim
# (SET LOCAL ROLE authenticated; SET request.jwt.claims = '{"sub":"...",
# "role":"authenticated"}';) — RLS changes plans, so testing as postgres
# alone will lie to you.
```
