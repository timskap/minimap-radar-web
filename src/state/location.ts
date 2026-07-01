// GPS position + compass heading, the two inputs everything on the radar
// depends on. Wraps the browser Geolocation and DeviceOrientation APIs and
// falls back to a keyboard-drivable simulator on desktop / when permission
// is unavailable, so the app is always testable.

import { Emitter } from "./emitter.ts";
import { destination, type Coord } from "../geo/geo.ts";

export type LocationStatus = "unknown" | "prompt" | "granted" | "denied" | "simulated";

const SIM_DEFAULT: Coord = { lat: 40.7580, lon: -73.9855 }; // Times Square

class LocationManager extends Emitter {
  location: Coord | null = null;
  heading = 0; // degrees, 0 = north, clockwise
  speed = 0; // m/s
  accuracy = 0; // metres
  status: LocationStatus = "unknown";
  simulated = false;

  private watchId: number | null = null;
  private headingHandler: ((e: DeviceOrientationEvent) => void) | null = null;

  get isAuthorized(): boolean {
    return this.status === "granted" || this.status === "simulated";
  }

  // Requests real GPS + orientation. Must be called from a user gesture on
  // iOS (DeviceOrientation permission gate).
  async requestReal(): Promise<void> {
    if (!("geolocation" in navigator)) {
      this.startSimulator();
      return;
    }
    this.status = "prompt";
    this.emit();

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.applyPosition(pos);
        this.status = "granted";
        this.simulated = false;
        this.startWatching();
        void this.requestHeading();
        this.emit();
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) this.status = "denied";
        else this.status = "denied";
        this.emit();
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  private startWatching(): void {
    if (this.watchId != null || !("geolocation" in navigator)) return;
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.applyPosition(pos);
        this.emit();
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 1000 },
    );
  }

  private applyPosition(pos: GeolocationPosition): void {
    this.location = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    this.accuracy = pos.coords.accuracy ?? 0;
    this.speed = Math.max(0, pos.coords.speed ?? 0);
    // Use GPS course while moving; the compass handles standing still.
    if (pos.coords.heading != null && !Number.isNaN(pos.coords.heading) && this.speed > 1) {
      this.heading = pos.coords.heading;
    }
  }

  private async requestHeading(): Promise<void> {
    const anyOrientation = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    try {
      if (typeof anyOrientation.requestPermission === "function") {
        const res = await anyOrientation.requestPermission();
        if (res !== "granted") return;
      }
    } catch {
      /* not iOS 13+; carry on with the plain event */
    }
    this.headingHandler = (e: DeviceOrientationEvent) => {
      // iOS exposes webkitCompassHeading (already true north).
      const webkit = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof webkit === "number" && !Number.isNaN(webkit)) {
        this.heading = webkit;
        this.emit();
      } else if (e.alpha != null) {
        this.heading = (360 - e.alpha) % 360;
        this.emit();
      }
    };
    window.addEventListener("deviceorientationabsolute", this.headingHandler, true);
    window.addEventListener("deviceorientation", this.headingHandler, true);
  }

  // MARK: - Simulator (desktop testing) --------------------------------------

  startSimulator(): void {
    this.stop();
    this.simulated = true;
    this.status = "simulated";
    this.location = this.location ?? { ...SIM_DEFAULT };
    this.speed = 0;
    this.accuracy = 5;
    this.emit();
  }

  // Move the simulated player forward along the current heading.
  simStep(meters: number): void {
    if (!this.simulated || !this.location) return;
    this.location = destination(this.location, this.heading, meters);
    this.speed = 1.4;
    this.emit();
  }

  simTurn(deltaDeg: number): void {
    if (!this.simulated) return;
    this.heading = (this.heading + deltaDeg + 360) % 360;
    this.emit();
  }

  stop(): void {
    if (this.watchId != null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.headingHandler) {
      window.removeEventListener("deviceorientationabsolute", this.headingHandler, true);
      window.removeEventListener("deviceorientation", this.headingHandler, true);
      this.headingHandler = null;
    }
  }
}

export const locationManager = new LocationManager();
