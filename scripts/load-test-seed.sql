-- Load-test seed for local performance testing. NOT run automatically (it is
-- not named supabase/seed.sql on purpose — that file auto-runs on every
-- `supabase db reset`, including in CI, and this would make every reset take
-- a minute instead of a second). Run by hand against a local/throwaway DB:
--
--   supabase db reset   # start clean
--   docker exec -i supabase_db_venn-gamma psql -U postgres < scripts/load-test-seed.sql
--
-- Generates ~50k profiles spread across every real city/zone, then a social
-- graph on top: ~1.5M likes, ~5.4k matches (including one "power user" —
-- id 'seed-1' — with 400 matches, for stress-testing per-user aggregate
-- queries like the unread-message badge), ~300k+ messages, 100k
-- notifications, ~100k profile_views. See docs/PERFORMANCE.md for what this
-- was used to find.
--
-- After seeding, run the follow-up UPDATE in docs/PERFORMANCE.md before
-- benchmarking anything that reads "recent" activity (likes_log, etc.) — this
-- script alone packs all rows into the last 7 days, which is not what a
-- table that accumulates history for months actually looks like.

\timing on
SET session_replication_role = 'replica'; -- skip triggers (mutual-like matcher etc.) for bulk speed

INSERT INTO public.profile_core (
  id, name, bio, gender, user_type, city, zone, areas, lat, lng,
  coords_private, budget_min, budget_max, budget, move_in_date, flat_type,
  photos, onboarding_done, paused, last_active_at, age, birthday, created_at, updated_at
)
SELECT
  'seed-' || g,
  'User ' || g,
  'Bio for user ' || g,
  (ARRAY['man','woman','non_binary','prefer_not_to_say'])[1 + floor(random()*4)],
  (ARRAY['seeking','owner'])[1 + floor(random()*2)],
  z.city_name,
  z.slug,
  ARRAY[z.slug],
  z.lat + (random() - 0.5) * (z.radius_km / 111.0),
  z.lng + (random() - 0.5) * (z.radius_km / 111.0),
  (random() < 0.7),
  b.bmin, b.bmax,
  (ARRAY['under_10k','10k_20k','20k_35k','35k_50k','50k_plus'])[1 + floor(random()*5)],
  (current_date + (floor(random()*60))::int),
  (ARRAY['1_bhk','2_bhk','3_bhk','studio','private_room','shared_room','pg'])[1 + floor(random()*7)],
  ARRAY['https://picsum.photos/seed/' || g || '/400/600'],
  true,
  (random() < 0.05),
  now() - (random() * interval '30 days'),
  18 + floor(random()*40)::int,
  (current_date - ((18 + floor(random()*40))::int * 365)),
  now() - (random() * interval '365 days'),
  now()
FROM generate_series(1, 50000) AS g
JOIN LATERAL (
  SELECT c.name AS city_name, z2.slug, z2.lat, z2.lng, z2.radius_km
  FROM public.zones z2 JOIN public.cities c ON c.id = z2.city_id
  ORDER BY md5(g::text || z2.slug) LIMIT 1
) z ON true
JOIN LATERAL (
  SELECT * FROM (VALUES (5000,15000),(10000,25000),(15000,35000),(20000,50000),(30000,80000)) AS v(bmin,bmax)
  ORDER BY md5(g::text || 'b') LIMIT 1
) b ON true;

INSERT INTO public.profile_lifestyle (profile_id, drink, tobacco, weed)
SELECT id,
  (ARRAY['yes','sometimes','no','prefer_not_to_say'])[1+floor(random()*4)],
  (ARRAY['yes','sometimes','no','prefer_not_to_say'])[1+floor(random()*4)],
  (ARRAY['yes','sometimes','no','prefer_not_to_say'])[1+floor(random()*4)]
FROM public.profile_core WHERE id LIKE 'seed-%';

INSERT INTO public.profile_preferences (profile_id, pref_gender, pref_age, pref_budget, pref_move_in)
SELECT id,
  (ARRAY['women_only','men_only','any_gender'])[1+floor(random()*3)],
  (ARRAY['18_22','22_26','26_30','30_35','35_plus','flexible'])[1+floor(random()*6)],
  (ARRAY['under_10k','10k_20k','20k_35k','35k_50k','50k_plus'])[1+floor(random()*5)],
  (ARRAY['asap','flexible'])[1+floor(random()*2)]
FROM public.profile_core WHERE id LIKE 'seed-%';

-- O(1)-per-pick array-index sampling — a correlated `ORDER BY md5(...) LIMIT
-- n` per outer row (an earlier draft of this script) re-sorts the entire
-- candidate table for every single row and takes 5+ minutes at this scale.
DO $do$
DECLARE
  ids text[];
  n int;
BEGIN
  SELECT array_agg(id), count(*) INTO ids, n FROM public.profile_core WHERE id LIKE 'seed-%';

  INSERT INTO public.likes_log (from_user_id, to_user_id, created_at)
  SELECT a.id, t.tid, now() - (random() * interval '7 days')
  FROM (SELECT id FROM public.profile_core WHERE id LIKE 'seed-%') a
  CROSS JOIN LATERAL (
    SELECT ids[1 + floor(random() * n)::int] AS tid FROM generate_series(1, 30)
  ) t
  WHERE t.tid <> a.id
  ON CONFLICT DO NOTHING;

  INSERT INTO public.profile_views (viewer_id, viewed_id, viewed_at)
  SELECT a.id, v.vid, now() - (random() * interval '7 days')
  FROM (SELECT id FROM public.profile_core WHERE id LIKE 'seed-%' ORDER BY random() LIMIT 20000) a
  CROSS JOIN LATERAL (
    SELECT ids[1 + floor(random() * n)::int] AS vid FROM generate_series(1, 5)
  ) v
  WHERE v.vid <> a.id
  ON CONFLICT DO NOTHING;
END
$do$;

INSERT INTO public.matches_log (user1_id, user2_id, created_at)
SELECT LEAST(from_user_id, to_user_id), GREATEST(from_user_id, to_user_id), now() - (random()*interval '30 days')
FROM (SELECT DISTINCT from_user_id, to_user_id FROM public.likes_log) x
ORDER BY random() LIMIT 5000
ON CONFLICT DO NOTHING;

-- Power user with a lot of matches, to stress-test per-user aggregate
-- queries like fetchUnreadMessageCount against a realistic worst case.
INSERT INTO public.matches_log (user1_id, user2_id, created_at)
SELECT 'seed-1', id, now() - (random()*interval '60 days')
FROM public.profile_core WHERE id LIKE 'seed-%' AND id <> 'seed-1'
ORDER BY random() LIMIT 400
ON CONFLICT DO NOTHING;

INSERT INTO public.messages (match_id, sender_id, content, read, created_at)
SELECT m.id,
  (CASE WHEN random() < 0.5 THEN m.user1_id ELSE m.user2_id END),
  'Message body ' || gs,
  (random() < 0.7),
  now() - (random() * interval '14 days')
FROM public.matches_log m
JOIN LATERAL generate_series(1, (5 + floor(random()*80))::int) AS gs ON true
WHERE m.status = 'active';

INSERT INTO public.notifications (user_id, type, actor_id, created_at)
SELECT to_user_id, 'like', from_user_id, created_at FROM public.likes_log ORDER BY random() LIMIT 100000;

SET session_replication_role = 'origin';

ANALYZE public.profile_core;
ANALYZE public.profile_lifestyle;
ANALYZE public.profile_preferences;
ANALYZE public.likes_log;
ANALYZE public.matches_log;
ANALYZE public.messages;
ANALYZE public.notifications;
ANALYZE public.profile_views;

SELECT 'profile_core' t, count(*) FROM public.profile_core WHERE id LIKE 'seed-%'
UNION ALL SELECT 'likes_log', count(*) FROM public.likes_log
UNION ALL SELECT 'matches_log', count(*) FROM public.matches_log
UNION ALL SELECT 'messages', count(*) FROM public.messages
UNION ALL SELECT 'notifications', count(*) FROM public.notifications
UNION ALL SELECT 'profile_views', count(*) FROM public.profile_views;
