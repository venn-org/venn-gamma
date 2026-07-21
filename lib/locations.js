import locationsData from './locations.json';

// City list and zones-by-city both live in locations.json — edit that file to
// add/remove/rename cities and zones without touching this logic.
export const CITIES = locationsData.cities;
export const ZONES_BY_CITY = locationsData.zonesByCity;

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
