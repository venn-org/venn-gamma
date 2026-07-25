import { supabase } from './supabase';

// City list and zones-by-city used to live in locations.json. They're now
// rows in the `cities` / `zones` tables (mirrors the option_values pattern
// used for enums) so an admin can add a city or neighbourhood without a
// client release. `export let` so existing call sites (`CITIES.map(...)`,
// `ZONES_BY_CITY[city]`) keep working unchanged — ES module bindings are
// live, so reassigning these inside loadLocations() propagates to every
// importer automatically.
export let CITIES = [];
export let ZONES_BY_CITY = {};

let loaded = false;
let inFlight = null;

export const locationsLoaded = () => loaded;

/**
 * Fetches cities + zones from Supabase into the CITIES / ZONES_BY_CITY cache.
 * Called once at app startup (see app/_layout.jsx), alongside fonts/auth, so
 * onboarding/edit-profile screens never see an empty city list. Safe to call
 * again later; concurrent calls share the in-flight request.
 */
export function loadLocations() {
  if (loaded) return Promise.resolve();
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const [{ data: cities, error: citiesError }, { data: zones, error: zonesError }] = await Promise.all([
      supabase.from('cities').select('id, name, slug, country').eq('active', true).order('sort_order'),
      supabase.from('zones').select('city_id, name, slug, lat, lng, radius_km').eq('active', true).order('sort_order'),
    ]);

    if (citiesError) console.error('loadLocations: failed to fetch cities:', citiesError);
    if (zonesError) console.error('loadLocations: failed to fetch zones:', zonesError);

    const citySlugById = new Map();
    CITIES = (cities ?? []).map((c) => {
      citySlugById.set(c.id, c.slug);
      return { id: c.slug, name: c.name, country: c.country };
    });

    const grouped = {};
    for (const z of zones ?? []) {
      const citySlug = citySlugById.get(z.city_id);
      if (!citySlug) continue;
      (grouped[citySlug] ??= []).push({
        id: z.slug,
        name: z.name,
        lat: z.lat,
        lng: z.lng,
        radiusKm: z.radius_km,
      });
    }
    ZONES_BY_CITY = grouped;

    loaded = true;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

// Given GPS coords, find which zone it falls into. Used by owners at signup.
export function findZoneByGPS(city, lat, lng) {
  const zones = ZONES_BY_CITY[city];
  if (!zones) return null;

  for (const zone of zones) {
    const dist = distanceKm(lat, lng, zone.lat, zone.lng);
    if (dist <= zone.radiusKm) return zone;
  }

  // Fallback: return nearest zone if outside all defined zones
  let nearest = null;
  let minDist = Infinity;
  zones.forEach((z) => {
    const dist = distanceKm(lat, lng, z.lat, z.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = z;
    }
  });
  return nearest;
}

export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
