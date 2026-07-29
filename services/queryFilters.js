/**
 * Safe construction of PostgREST filter strings.
 *
 * `.or()` takes a filter expression as text, so building one by interpolation
 * splices caller data straight into query syntax. Today every interpolated
 * value is a session-owned id and nothing is exploitable — but a value
 * containing `,` or `)` would rewrite the filter, and that is a live injection
 * class the moment one of these ids comes from anywhere less trusted.
 * Validating at the boundary makes that impossible by construction.
 *
 * The check is "contains no PostgREST metacharacters" rather than "is a UUID":
 * `profile_core.id` is a `text` column holding auth subjects, and hard-failing
 * on a non-UUID id would break the app over a formatting assumption rather
 * than a security one. Metacharacter rejection is what actually stops the
 * injection.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Anything outside this set could terminate or extend a filter expression.
const SAFE_ID_RE = /^[A-Za-z0-9_-]+$/;

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * Throws unless `value` is safe to splice into a filter expression. A failure
 * here is a bug in the caller (or a tampered id), not something to surface.
 */
export function assertFilterSafeId(value, label = 'id') {
  if (typeof value !== 'string' || !SAFE_ID_RE.test(value)) {
    throw new Error(`Unsafe ${label} for a PostgREST filter: ${JSON.stringify(value)}`);
  }
  return value;
}

/** `user1_id.eq.<uid>,user2_id.eq.<uid>` — every match this user is part of. */
export function matchMembershipFilter(uid) {
  assertFilterSafeId(uid, 'uid');
  return `user1_id.eq.${uid},user2_id.eq.${uid}`;
}

/**
 * The match between two specific users, in either column order.
 * `and(...)` groups are needed because a match stores the pair unordered.
 */
export function matchPairFilter(a, b) {
  assertFilterSafeId(a, 'user id');
  assertFilterSafeId(b, 'user id');
  return `and(user1_id.eq.${a},user2_id.eq.${b}),and(user1_id.eq.${b},user2_id.eq.${a})`;
}
