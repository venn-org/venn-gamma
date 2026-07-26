-- ============================================================================
-- Adds Navi Mumbai and Pune as cities.
--
-- Navi Mumbai becomes its own city rather than a single zone inside Mumbai.
-- It's a separate municipal region with its own nodes, and collapsing all of
-- it into one 14km-radius 'navi-mumbai' zone under Mumbai made every node
-- from Airoli to Panvel look like one neighbourhood for matching purposes.
-- ============================================================================

INSERT INTO public.cities (name, slug, country, sort_order) VALUES
  ('Navi Mumbai', 'navi-mumbai', 'India', 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.zones (city_id, name, slug, lat, lng, radius_km, sort_order)
SELECT c.id, z.name, z.slug, z.lat, z.lng, z.radius_km, z.sort_order
FROM (VALUES
  -- Central / established nodes
  ('Vashi',          'vashi',          19.0754, 73.0086, 5, 1),
  ('Nerul',          'nerul',          19.0330, 73.0297, 5, 2),
  ('CBD Belapur',    'belapur',        19.0234, 73.0353, 5, 3),
  ('Kharghar',       'kharghar',       19.0330, 73.0664, 6, 4),
  ('Kopar Khairane', 'kopar-khairane', 19.1058, 73.0080, 5, 5),
  ('Ghansoli',       'ghansoli',       19.1197, 73.0016, 5, 6),
  ('Airoli',         'airoli',         19.1554, 72.9986, 5, 7),
  -- Growing / newer areas
  ('Seawoods',       'seawoods',       19.0142, 73.0234, 4, 8),
  ('Panvel',         'panvel',         18.9894, 73.1175, 7, 9),
  ('Ulwe',           'ulwe',           18.9894, 73.0187, 5, 10),
  ('Kamothe',        'kamothe',        19.0176, 73.0980, 4, 11),
  ('Kalamboli',      'kalamboli',      19.0339, 73.1013, 5, 12),
  ('Taloja',         'taloja',         19.0819, 73.1004, 6, 13)
) AS z(name, slug, lat, lng, radius_km, sort_order)
CROSS JOIN public.cities c
WHERE c.slug = 'navi-mumbai'
ON CONFLICT (city_id, slug) DO NOTHING;


-- ----------------------------------------------------------------------------
-- Pune. Split between the IT-corridor nodes (Hinjewadi/Kharadi/Hadapsar belts,
-- where the demand is PG/1BHK from working professionals) and the college
-- belt around FC Road / Kothrud / Symbiosis.
-- ----------------------------------------------------------------------------

INSERT INTO public.cities (name, slug, country, sort_order) VALUES
  ('Pune', 'pune', 'India', 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.zones (city_id, name, slug, lat, lng, radius_km, sort_order)
SELECT c.id, z.name, z.slug, z.lat, z.lng, z.radius_km, z.sort_order
FROM (VALUES
  -- IT corridors / professional
  ('Hinjewadi',             'hinjewadi',        18.5912, 73.7389, 6, 1),
  ('Wakad',                 'wakad',            18.5978, 73.7621, 5, 2),
  ('Baner',                 'baner',            18.5590, 73.7868, 5, 3),
  ('Kharadi',               'kharadi',          18.5515, 73.9430, 5, 4),
  ('Magarpatta / Hadapsar', 'magarpatta',       18.5158, 73.9282, 5, 5),
  ('Pimple Saudagar',       'pimple-saudagar',  18.5983, 73.8005, 4, 6),
  ('Kalyani Nagar',         'kalyani-nagar',    18.5490, 73.9020, 4, 7),
  -- College belt / student-heavy
  ('Kothrud',               'kothrud',          18.5074, 73.8077, 5, 8),
  ('Karve Nagar',           'karve-nagar',      18.4906, 73.8195, 4, 9),
  ('Deccan / FC Road',      'deccan',           18.5195, 73.8348, 4, 10),
  ('Viman Nagar',           'viman-nagar',      18.5679, 73.9143, 5, 11),
  ('Wadgaon Sheri',         'wadgaon-sheri',    18.5484, 73.9109, 4, 12),
  ('Warje',                 'warje',            18.4756, 73.8079, 5, 13)
) AS z(name, slug, lat, lng, radius_km, sort_order)
CROSS JOIN public.cities c
WHERE c.slug = 'pune'
ON CONFLICT (city_id, slug) DO NOTHING;


-- ----------------------------------------------------------------------------
-- Re-home the profiles that picked the old Mumbai > "Navi Mumbai" zone before
-- deleting it, so they aren't left pointing at a zone that no longer exists.
-- Their specific node is unknown (the old zone covered all of them), so the
-- city moves across and the zone/location are cleared for the user to re-pick
-- from the profile screen. `location` holds the zone's display name and `zone`
-- its slug — the two are always written together (see edit-profile.jsx).
-- ----------------------------------------------------------------------------

UPDATE public.profile_core
SET city = 'navi-mumbai',
    zone = NULL,
    location = NULL
WHERE city = 'mumbai' AND zone = 'navi-mumbai';

-- Same name in the free-text `location` column but without the zone slug set.
UPDATE public.profile_core
SET city = 'navi-mumbai',
    location = NULL
WHERE city = 'mumbai' AND location = 'Navi Mumbai';

-- `areas` / `pref_areas` store zone display names, so drop the stale entry.
-- array_remove leaves an empty array rather than NULL; normalise that so
-- "no areas set" stays a single representation for the matching logic.
UPDATE public.profile_core
SET areas = NULLIF(array_remove(areas, 'Navi Mumbai'), '{}')
WHERE 'Navi Mumbai' = ANY(areas);

UPDATE public.profile_preferences
SET pref_areas = NULLIF(array_remove(pref_areas, 'Navi Mumbai'), '{}')
WHERE 'Navi Mumbai' = ANY(pref_areas);


-- Finally drop the zone itself from Mumbai.
DELETE FROM public.zones z
USING public.cities c
WHERE z.city_id = c.id
  AND c.slug = 'mumbai'
  AND z.slug = 'navi-mumbai';
