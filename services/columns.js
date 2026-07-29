/**
 * Explicit column lists for every `profiles` read.
 *
 * `select('*')` meant each new column on the view shipped to every client the
 * moment it was added — which is how exact GPS coordinates and full dates of
 * birth were once readable by any signed-in user (see
 * supabase/migrations/20260727001000_enforce_coords_private.sql). The view masks
 * those now, but the failure mode repeats with the next column unless reads
 * name what they want. Naming columns also cuts the feed payload substantially:
 * 200 rows of full profile is a lot of mobile data for a card that renders a
 * fraction of it.
 *
 * Keep these in sync with the `profiles` view in supabase/schema.sql.
 */

/** Identity fields every profile surface needs. */
const IDENTITY = ['id', 'name', 'age', 'gender', 'pronouns', 'photos', 'verified'];

/** What the feed card and the profile sheet render. */
const CARD = [
  'bio',
  'location',
  'user_type',
  'city',
  'zone',
  'areas',
  'budget_min',
  'budget_max',
  'budget',
  'move_in_date',
  'flat_type',
  'prompts',
  'job_company',
  'job_title',
  'education_school',
  'education_level',
  'drink',
  'tobacco',
  'weed',
  'last_active_at',
  'onboarding_done',
  'paused',
];

/** Stated roommate preferences — needed to score overlap in both directions. */
const PREFERENCES = [
  'pref_role',
  'pref_gender',
  'pref_age',
  'pref_budget',
  'pref_move_in',
  'pref_smoking',
  'pref_drinking',
  'pref_occupation',
  'pref_food',
  'pref_pets',
  'pref_flat_type',
  'pref_areas',
];

/** A candidate in the feed / likes grid / profile sheet. */
export const PROFILE_CARD_COLUMNS = [...IDENTITY, ...CARD, ...PREFERENCES].join(', ');

/**
 * The signed-in user's own profile.
 *
 * `birthday` is included: the view masks it to NULL for everyone except the
 * row's owner (see the coords_private migration), so it is only meaningful —
 * and only readable — here. `lat`/`lng` are self-visible too but no screen
 * reads them, so they stay out.
 */
export const MY_PROFILE_COLUMNS = [
  ...IDENTITY,
  ...CARD,
  ...PREFERENCES,
  'birthday',
  'is_admin',
  'created_at',
  'updated_at',
].join(', ');

/** Just enough to render a conversation row or a match avatar. */
export const PROFILE_SUMMARY_COLUMNS = 'id, name, photos, last_active_at';

/** Message rows. `messages` is a real table, so this is its full shape. */
export const MESSAGE_COLUMNS = 'id, match_id, sender_id, content, read, created_at';
