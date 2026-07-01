// User waypoints, persisted to localStorage. Markers use the app's real icon
// sets (Vice PNG / Wasteland + Phantasy SVG) or a "Letter" marker (a coloured
// square with the name's first letter, like the native MarkerView).

import { Emitter } from "./emitter.ts";
import { locationManager } from "./location.ts";
import { destination } from "../geo/geo.ts";
import { ICON_SETS } from "../assets-icons.ts";
import type { Marker } from "../types.ts";
import type { IconSet } from "../themes/themes.ts";

const STORAGE_KEY = "markers";

export const LETTER_ICON = "Letter";
export const MARKER_COLORS = ["#ff3b6b", "#ffb300", "#33d17a", "#3cc8ff", "#b06bff", "#ffffff"];

// Full asset paths for a theme's icon set.
export function iconPathsFor(set: IconSet): string[] {
  return (ICON_SETS[set] ?? []).map((file) => `/assets/icons/${set}/${file}`);
}

class MarkerStore extends Emitter {
  markers: Marker[] = [];

  constructor() {
    super();
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.markers = JSON.parse(raw) as Marker[];
    } catch {
      this.markers = [];
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.markers));
    } catch {
      /* ignore */
    }
    this.emit();
  }

  // Drops a marker just ahead of the player so it's visible on the face.
  add(name: string, icon: string, color: string): Marker | null {
    const loc = locationManager.location;
    if (!loc) return null;
    const spot = destination(loc, locationManager.heading, 60);
    const marker: Marker = {
      id: `mk-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
      name: name.trim() || "Marker",
      lat: spot.lat,
      lon: spot.lon,
      icon,
      color,
    };
    this.markers.push(marker);
    this.persist();
    return marker;
  }

  update(id: string, patch: Partial<Omit<Marker, "id">>): void {
    const m = this.markers.find((x) => x.id === id);
    if (!m) return;
    Object.assign(m, patch);
    this.persist();
  }

  remove(id: string): void {
    this.markers = this.markers.filter((m) => m.id !== id);
    this.persist();
  }
}

export const markerStore = new MarkerStore();
