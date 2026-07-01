// Geodesy helpers — the pieces of CoreLocation / MapViewUtility the radar
// needs, in plain TypeScript. Distances in metres, angles in degrees.

export interface Coord {
  lat: number;
  lon: number;
}

const EARTH_RADIUS = 6_371_000; // metres

export const toRad = (d: number): number => (d * Math.PI) / 180;
export const toDeg = (r: number): number => (r * 180) / Math.PI;

// Great-circle distance between two coordinates (metres).
export function distanceMeters(a: Coord, b: Coord): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Initial bearing from a to b, degrees clockwise from north (0..360).
export function bearingDegrees(a: Coord, b: Coord): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Destination coordinate given a start, a bearing (deg) and a distance (m).
export function destination(from: Coord, bearingDeg: number, meters: number): Coord {
  const d = meters / EARTH_RADIUS;
  const brg = toRad(bearingDeg);
  const lat1 = toRad(from.lat);
  const lon1 = toRad(from.lon);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brg),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brg) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { lat: toDeg(lat2), lon: ((toDeg(lon2) + 540) % 360) - 180 };
}

// Screen-space offset of `point` relative to `center`, in pixels, mirroring
// MapViewUtility: x grows east, y grows *down* (screen coords). `spanLat` /
// `spanLon` are the lat/lon degrees covered across the face's height/width.
export function rawOffset(
  center: Coord,
  point: Coord,
  spanLat: number,
  spanLon: number,
  mapWidth: number,
  mapHeight: number,
): { x: number; y: number } {
  const x = ((point.lon - center.lon) / spanLon) * mapWidth;
  const y = ((center.lat - point.lat) / spanLat) * mapHeight;
  return { x, y };
}

// Rotate an offset so the map faces the heading direction (heading-up).
export function rotateOffset(
  off: { x: number; y: number },
  headingDeg: number,
): { x: number; y: number } {
  const r = toRad(headingDeg);
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return {
    x: off.x * cos + off.y * sin,
    y: -off.x * sin + off.y * cos,
  };
}

// Clamp an offset to a circle of the given radius (keeps off-screen markers
// pinned to the rim, like the watch faces do).
export function clampToRadius(
  off: { x: number; y: number },
  radius: number,
): { x: number; y: number; clamped: boolean } {
  const dist = Math.hypot(off.x, off.y);
  if (dist > radius && dist > 0) {
    const f = radius / dist;
    return { x: off.x * f, y: off.y * f, clamped: true };
  }
  return { ...off, clamped: false };
}

// Metres → span in degrees at a given latitude, for both axes.
export function metersToSpan(
  meters: number,
  lat: number,
): { spanLat: number; spanLon: number } {
  const spanLat = meters / 111_320;
  const spanLon = meters / (111_320 * Math.cos(toRad(lat)) || 1);
  return { spanLat, spanLon };
}

// Human distance label, matching the watch's compact style.
export function formatDistance(meters: number): string {
  if (meters < 0) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}
