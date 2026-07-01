// User waypoints, persisted to localStorage. The watch app lets you create,
// edit and delete markers with an icon and a colour, positioned on the map —
// here new markers drop at the player's current position (or offset from it).

import { Emitter } from "./emitter.ts";
import { locationManager } from "./location.ts";
import { destination } from "../geo/geo.ts";
import type { Marker } from "../types.ts";

const STORAGE_KEY = "markers";

export const MARKER_ICONS = ["📍", "🏠", "⭐️", "🏁", "⚑", "💎", "🎯", "☕️", "🍔", "🅿️", "⛺️", "❤️"];
export const MARKER_COLORS = ["#ff3b6b", "#ffb300", "#33d17a", "#3cc8ff", "#b06bff", "#ffffff"];

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

  // Drops a marker just ahead of the player so it's visible on the radar.
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
