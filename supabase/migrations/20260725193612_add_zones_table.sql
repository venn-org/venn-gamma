-- ============================================================================
-- Move lib/locations.json (cities + their zones) into the database, mirroring
-- the option_groups/option_values pattern already used for enums: plain
-- lookup tables, RLS is read-only for anon/authenticated, and writes go
-- through the admin panel using the service_role key (which bypasses RLS) —
-- so new cities/zones need no client release.
--
-- `cities` already existed (seeded with just Bangalore) but nothing read
-- from it yet; this brings it up to the shape the client needs and adds the
-- `zones` table it was always missing.
-- ============================================================================

ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS country     text NOT NULL DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS sort_order  smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active      boolean NOT NULL DEFAULT true;

CREATE TABLE public.zones (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    city_id     bigint NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
    name        text NOT NULL,
    slug        text NOT NULL,                 -- matches lib/locations.js zone.id (e.g. 'koramangala')
    lat         double precision NOT NULL,
    lng         double precision NOT NULL,
    radius_km   double precision NOT NULL DEFAULT 6,
    sort_order  smallint NOT NULL DEFAULT 0,
    active      boolean NOT NULL DEFAULT true,
    UNIQUE (city_id, slug)
);

CREATE INDEX idx_zones_city ON public.zones USING btree (city_id, sort_order) WHERE active;

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY zones_select ON public.zones FOR SELECT USING (true);

-- Seed: 1:1 with the current lib/locations.json, which this table replaces.
UPDATE public.cities SET sort_order = 1 WHERE slug = 'bangalore';

INSERT INTO public.cities (name, slug, country, sort_order) VALUES
  ('Mumbai', 'mumbai', 'India', 2)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.zones (city_id, name, slug, lat, lng, radius_km, sort_order)
SELECT c.id, z.name, z.slug, z.lat, z.lng, z.radius_km, z.sort_order
FROM (VALUES
  ('bangalore', 'Koramangala', 'koramangala', 12.9352, 77.6245, 6, 1),
  ('bangalore', 'Indiranagar', 'indiranagar', 13.0347, 77.6410, 6, 2),
  ('bangalore', 'Whitefield',  'whitefield',  12.9698, 77.7499, 8, 3),
  ('bangalore', 'JP Nagar',    'jp-nagar',    12.9352, 77.5945, 6, 4),
  ('bangalore', 'HSR Layout',  'hsr-layout',  12.9250, 77.6245, 6, 5),
  ('bangalore', 'Bellandur',   'bellandur',   12.9698, 77.6854, 6, 6),
  ('mumbai',    'Andheri',     'andheri',     19.1197, 72.8468, 8, 1),
  ('mumbai',    'Bandra',      'bandra',      19.0596, 72.8295, 6, 2),
  ('mumbai',    'Powai',       'powai',       19.1176, 72.9060, 6, 3),
  ('mumbai',    'Dadar',       'dadar',       19.0178, 72.8478, 6, 4),
  ('mumbai',    'Thane',       'thane',       19.2183, 72.9781, 12, 5),
  ('mumbai',    'Navi Mumbai', 'navi-mumbai', 19.0330, 73.0297, 14, 6)
) AS z(city_slug, name, slug, lat, lng, radius_km, sort_order)
JOIN public.cities c ON c.slug = z.city_slug
ON CONFLICT (city_id, slug) DO NOTHING;
