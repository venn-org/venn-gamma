# ADR 0002 — Daily like limits move into the database

**Status:** accepted
**Date:** 2026-07-29

## Context

The daily like allowance was enforced entirely on the client:

```js
const canLike = await canLikeToday(uid);   // counts today's rows
if (!canLike) { showPaywall(); return; }
await supabase.from('likes').insert({ ... });
```

Two holes follow from that shape.

1. **Check-then-act across two round-trips.** A fast double-tap issues both
   likes while the first count is still in flight, so the cap is advisory under
   any real thumb.
2. **The bonus allowance lived in AsyncStorage** — `venn_like_bonus_<uid>_<day>`
   — i.e. in storage the user owns. Writing that key grants unlimited likes.
   Harmless while "get more likes" is a free placeholder; a revenue hole the day
   it becomes a purchase.

The day boundary was also computed with `toISOString().slice(0, 10)`, the UTC
date. In the app's only market (IST, UTC+5:30) that reset the allowance at
05:30 local time, and the bonus key rolled over at a different instant than the
like count it modified.

## Decision

`public.like_profile(p_target_id)` (migration `20260729120000`) performs the
allowance check and the insert in one transaction, under a per-user advisory
lock, and returns `{ ok, remaining, matched, match_id }`. Bonus grants move to a
`like_bonus_grants` table written only by `grant_extra_likes()`, which caps the
daily total. Both the RPC and the client compute "today" in `Asia/Kolkata`.

The client keeps a `remainingLikes` number purely to render the header pill and
open the paywall sheet without a round-trip. It is a display value, not a
control.

`services/likeService.js#sendLike` falls back to the legacy insert path when the
RPC is absent (PostgREST `PGRST202` / `42883`), so pulling the code does not
require a database push to keep liking working.

## Consequences

- The cap holds against double-taps, modified clients and direct API calls.
- One round-trip instead of three: the RPC returns the new remaining count and
  whether a match was created, so the feed no longer issues a separate count
  query and match lookup after each like.
- **Liking back from the Likes tab now spends from the allowance.** It was
  effectively unlimited before, because that path inserted directly and
  `like_profile` cannot distinguish a reciprocal like from a first one. If
  reciprocating should stay free, add a branch to `like_profile` that skips the
  allowance when an active like from the target already exists — do not re-add a
  client-side bypass.
- Changing the base allowance now means a migration, not a constant. It is
  duplicated in `config/flags.js` (`LIMITS.dailyLikes`) for display only; the two
  must be kept in step.
