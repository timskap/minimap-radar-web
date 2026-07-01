// The live mission: a set of XP orbs spawned around the player, a countdown,
// and proximity collection. Mirrors MissionSession.swift + the spawn logic in
// MissionManager, without cross-device sync.

import { destination, distanceMeters, type Coord } from "../geo/geo.ts";
import type { MissionXPPoint, OrbTier } from "../types.ts";
import {
  MissionConstants,
  randomXPValue,
  type Difficulty,
  type MissionType,
} from "./missionConstants.ts";

let orbCounter = 0;
const nextOrbId = () => `orb-${Date.now().toString(36)}-${orbCounter++}`;

function tierForValue(value: number): OrbTier {
  if (value >= 50) return "large";
  if (value >= 25) return "medium";
  return "small";
}

function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export interface MissionResult {
  type: MissionType;
  difficulty: Difficulty;
  collectedCount: number;
  totalPoints: number;
  baseXP: number;
  bonusXP: number; // completion + streak + challenges
  totalXP: number;
  completed: boolean; // all orbs collected
  leveledUp: boolean;
  newLevel: number;
  streak: number;
  streakBonus: number;
  challengeBonus: number;
}

export class MissionSession {
  readonly type: MissionType;
  readonly difficulty: Difficulty;
  readonly durationSeconds: number;
  readonly startTimeMs: number;
  readonly origin: Coord;
  xpPoints: MissionXPPoint[] = [];
  ended = false;

  constructor(type: MissionType, difficulty: Difficulty, origin: Coord) {
    this.type = type;
    this.difficulty = difficulty;
    this.durationSeconds = difficulty.durationSeconds;
    this.startTimeMs = Date.now();
    this.origin = origin;
    this.spawnOrbs();
  }

  private spawnOrbs(): void {
    const [minCount, maxCount] = this.difficulty.orbCount;
    const base = randomInt(minCount, maxCount);
    const target = Math.max(
      3,
      Math.round(base * this.type.orbCountMultiplier),
    );

    const points: MissionXPPoint[] = [];
    const maxRadius = this.difficulty.maxSpawnRadius;
    const minRadius = MissionConstants.minSpawnDistance;
    let attempts = 0;

    while (points.length < target && attempts < target * 40) {
      attempts += 1;
      const bearing = Math.random() * 360;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      const coord = destination(this.origin, bearing, radius);

      // Respect minimum spacing so orbs don't cluster.
      const tooClose = points.some(
        (p) => distanceMeters({ lat: p.lat, lon: p.lon }, coord) < MissionConstants.minOrbSpacing,
      );
      if (tooClose) continue;

      const value = randomXPValue();
      points.push({
        id: nextOrbId(),
        lat: coord.lat,
        lon: coord.lon,
        value,
        tier: tierForValue(value),
        orderIndex: null,
        collected: false,
      });
    }

    // Chain missions: order the orbs by distance from the player and number
    // them so they must be collected in sequence.
    if (this.type.isOrdered) {
      points.sort(
        (a, b) =>
          distanceMeters(this.origin, { lat: a.lat, lon: a.lon }) -
          distanceMeters(this.origin, { lat: b.lat, lon: b.lon }),
      );
      points.forEach((p, i) => (p.orderIndex = i));
    }

    this.xpPoints = points;
  }

  get totalPoints(): number {
    return this.xpPoints.length;
  }

  get collectedCount(): number {
    return this.xpPoints.filter((p) => p.collected).length;
  }

  get allCollected(): boolean {
    return this.totalPoints > 0 && this.collectedCount === this.totalPoints;
  }

  get elapsedSeconds(): number {
    return (Date.now() - this.startTimeMs) / 1000;
  }

  get timeRemaining(): number {
    return Math.max(0, this.durationSeconds - this.elapsedSeconds);
  }

  get isExpired(): boolean {
    return this.timeRemaining <= 0;
  }

  // The next orb the player must collect in a chain mission (else null).
  get nextOrderIndex(): number | null {
    return this.type.isOrdered ? this.collectedCount : null;
  }

  // Attempts to collect any orb within range of `location`. For chain
  // missions only the next-in-order orb is collectable. Returns the XP of
  // orbs collected this tick (0 if none).
  collectNear(location: Coord): number {
    let gained = 0;
    for (const p of this.xpPoints) {
      if (p.collected) continue;
      if (this.type.isOrdered && p.orderIndex !== this.collectedCount) continue;
      const d = distanceMeters(location, { lat: p.lat, lon: p.lon });
      if (d <= MissionConstants.collectionRadius) {
        p.collected = true;
        gained += p.value;
        if (this.type.isOrdered) break; // one at a time, in order
      }
    }
    return gained;
  }

  get baseXP(): number {
    return this.xpPoints
      .filter((p) => p.collected)
      .reduce((sum, p) => sum + p.value, 0);
  }
}
