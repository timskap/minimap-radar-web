import type { Coord } from "./geo/geo.ts";

export type ThemeId = "vice" | "phantasy" | "wasteland" | "five" | "pixel";

export interface Marker {
  id: string;
  name: string;
  lat: number;
  lon: number;
  icon: string; // emoji or glyph
  color: string; // hex
}

export type OrbTier = "small" | "medium" | "large";

export interface MissionXPPoint {
  id: string;
  lat: number;
  lon: number;
  value: number;
  tier: OrbTier;
  orderIndex: number | null; // set for chain missions
  collected: boolean;
}

export const coordOf = (p: { lat: number; lon: number }): Coord => ({
  lat: p.lat,
  lon: p.lon,
});
