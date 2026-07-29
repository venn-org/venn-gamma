# ADR 0001 — Gender is the only hard filter; everything else ranks

**Status:** accepted
**Date:** 2026-07-27

## Context

The feed originally gated on every stated preference at once: budget, areas,
flat type, move-in, age, occupation, and each lifestyle answer. With a small
early user base, the intersection of all of them was frequently empty, so a new
user's first experience was a blank feed while plenty of plausible candidates
existed.

Role (`seeking` vs `owner`) also used to invert, so seekers only saw owners.
That halved an already-small pool.

## Decision

`matchesPrefs` (lib/prefs.js) hard-filters on **gender only**. "Women only" /
"men only" is a strict, non-negotiable safety and comfort policy, so it excludes
anyone not positively confirmed as the requested gender — an unstated gender is
not a confirmation.

Every other preference is scoring-only: it moves the overlap badge via
`calculateOverlapScore` but never hides a profile. `buildFeedOrder` then
alternates the strongest remaining candidate with the weakest, so a high-overlap
profile is always one swipe away while the whole pool still surfaces.

Role no longer filters at all; it is shown on the card as a
"Has a flat" / "Looking for flat" pill.

Because gender is the only hard filter, it is also the only one pushed into the
SQL query (`services/profileService.js#fetchFeedCandidates`). Applying it after
the fetch meant a "women only" preference could have most of the row budget
spent on profiles that were then discarded.

## Consequences

- Near-misses stay visible, ranked below better matches, instead of emptying
  the feed.
- The overlap badge is squeezed into `[16, 99]` rather than `[0, 100]`: a
  literal 0% reads as "this person is worthless to you" and kills the intent to
  swipe, and 100% promises a perfect match the data cannot back.
- Overlap weights are not flat — areas and budget decide whether a flatshare is
  possible at all; pets and food are things you can live around.
- Revisit once the pool is large enough that a stricter intersection still
  returns a full deck.
