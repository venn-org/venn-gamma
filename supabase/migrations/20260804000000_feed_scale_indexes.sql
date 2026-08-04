-- ============================================================================
-- Two index fixes found under load testing (50k profiles, 1.5M likes with a
-- realistic 6-month history shape, 5.4k matches, 361k messages — see
-- docs/PERFORMANCE.md for the methodology and full before/after numbers).
--
-- Both are plain CREATE/DROP, not CONCURRENTLY: the app has no production
-- data yet, so there is nothing for a brief lock to block. Once real rows
-- exist, any future index change on these tables should use CONCURRENTLY —
-- there is no precedent for it in this migration history because it has
-- never been needed before now.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. feed_candidates()'s exposure term recomputes a "likes in the last 7
--    days" aggregate over the whole of likes_log on every call. likes_log is
--    history-preserving and never shrinks, so this cost was always going to
--    grow without bound — at 1.5M rows (6-month-history shape) it was a
--    Parallel Seq Scan costing ~62ms by itself, one of the largest single
--    contributors to feed latency. A time-ordered partial index turns it into
--    a bounded scan of just the recent slice: 62ms -> 20ms measured (3.2x),
--    and critically that cost stays flat as history accumulates instead of
--    growing with it — the property that actually matters here, since the
--    seq scan's cost is O(all-time row count) and this index's is
--    O(rows in the last 7 days).
-- ----------------------------------------------------------------------------

CREATE INDEX idx_likes_recent_by_time ON public.likes_log (created_at) WHERE revoked_at IS NULL;


-- ----------------------------------------------------------------------------
-- 2. idx_profiles_feed backed fetchFeedCandidates() (services/profileService.js),
--    the resilience fallback used only if the feed_candidates() RPC migration
--    is somehow missing — but its column order was wrong for that query from
--    the start. It leads with `user_type`, which that query has never
--    filtered by (confirmed: no service filters profile_core/profiles by
--    user_type — services/profileService.js only checks it client-side,
--    post-fetch, in attachFlatDetails). An index that leads with an
--    unfiltered column can't be used to satisfy `ORDER BY last_active_at
--    LIMIT N`, so this query has been doing a full Seq Scan + top-N sort of
--    the entire table since the index was created — 17.7ms at 50k rows,
--    touching every row (Buffers: shared hit=2149) every single call.
--
--    The replacement drops the redundant leading columns entirely: paused
--    and onboarding_done are already guaranteed by the index's own WHERE
--    predicate once it matches the query's WHERE clause, so repeating them
--    as index columns buys nothing. Measured: 17.7ms -> 0.31ms (57x), and
--    Buffers dropped from 2149 (whole table) to 202 (bounded by LIMIT) — the
--    same "cost stops scaling with table size" property as fix 1.
-- ----------------------------------------------------------------------------

DROP INDEX IF EXISTS public.idx_profiles_feed;
CREATE INDEX idx_profiles_feed_v2 ON public.profile_core (last_active_at DESC)
    WHERE (paused = false AND onboarding_done = true);
