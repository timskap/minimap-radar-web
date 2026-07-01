// Orchestrates the mission lifecycle: start (spends energy, spawns orbs),
// a per-second tick that collects nearby orbs and detects expiry, and finish
// (folds XP/streak/challenge bonuses into the profile). Mirrors the parts of
// MissionManager.swift that matter without a watch to sync to.

import { Emitter } from "../state/emitter.ts";
import { locationManager } from "../state/location.ts";
import { MissionProfile } from "./missionProfile.ts";
import { MissionSession, type MissionResult } from "./missionSession.ts";
import {
  completionBonus,
  levelForXP,
  type Difficulty,
  type MissionType,
} from "./missionConstants.ts";

class MissionManager extends Emitter {
  profile = MissionProfile.load();
  session: MissionSession | null = null;
  lastResult: MissionResult | null = null;
  showResult = false;

  private tickHandle: number | null = null;

  constructor() {
    super();
    this.profile.refreshChallenges();
  }

  get isMissionActive(): boolean {
    return this.session != null && !this.session.ended;
  }

  canStart(): boolean {
    return this.profile.liveEnergy > 0 && locationManager.location != null;
  }

  start(type: MissionType, difficulty: Difficulty): boolean {
    if (this.isMissionActive) return false;
    const origin = locationManager.location;
    if (!origin || this.profile.liveEnergy <= 0) return false;

    this.profile.consumeEnergy();
    this.profile.save();
    this.session = new MissionSession(type, difficulty, origin);
    this.startTicking();
    this.emit();
    return true;
  }

  private startTicking(): void {
    this.stopTicking();
    this.tickHandle = window.setInterval(() => this.tick(), 1000);
    this.tick();
  }

  private stopTicking(): void {
    if (this.tickHandle != null) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  private tick(): void {
    const session = this.session;
    if (!session || session.ended) return;

    const loc = locationManager.location;
    if (loc) session.collectNear(loc);

    if (session.allCollected || session.isExpired) {
      this.finish(session.allCollected);
      return;
    }
    this.emit();
  }

  // Ends the mission and rolls rewards into the profile. `completed` means
  // every orb was collected (full clear); expiry finishes with partial XP.
  finish(completed: boolean): void {
    const session = this.session;
    if (!session || session.ended) return;
    session.ended = true;
    this.stopTicking();

    const beforeLevel = this.profile.level;
    const baseXP = Math.round(
      session.baseXP * session.difficulty.xpMultiplier * session.type.xpMultiplier,
    );
    const bonus = completed ? completionBonus(session.type) : 0;

    // A "completed mission" for streaks/challenges = the player collected at
    // least one orb (matches the native app's intent of rewarding activity).
    const didSomething = session.collectedCount > 0;

    this.profile.addXP(baseXP + bonus, session.collectedCount, didSomething);

    let streakBonus = 0;
    if (didSomething) streakBonus = this.profile.registerStreakDay();
    this.profile.addBonusXP(streakBonus);

    const beforeClaimable = this.profile.unclaimedChallengeXP;
    this.profile.recordChallengeEvent({
      missionCompleted: didSomething,
      orbs: session.collectedCount,
      xp: baseXP + bonus,
    });
    const challengeBonus = this.profile.unclaimedChallengeXP - beforeClaimable;

    this.profile.data.level = levelForXP(this.profile.data.totalXP);
    this.profile.save();

    const totalXP = baseXP + bonus + streakBonus;
    this.lastResult = {
      type: session.type,
      difficulty: session.difficulty,
      collectedCount: session.collectedCount,
      totalPoints: session.totalPoints,
      baseXP,
      bonusXP: bonus + streakBonus,
      totalXP,
      completed,
      leveledUp: this.profile.level > beforeLevel,
      newLevel: this.profile.level,
      streak: this.profile.liveStreak(),
      streakBonus,
      challengeBonus: Math.max(0, challengeBonus),
    };
    this.showResult = true;
    this.emit();
  }

  cancel(): void {
    // Cancelling still counts collected orbs (energy is already spent).
    this.finish(false);
  }

  dismissResult(): void {
    this.showResult = false;
    this.session = null;
    this.emit();
  }

  claimChallenge(id: string): void {
    const granted = this.profile.claimChallenge(id);
    if (granted > 0) {
      this.profile.save();
      this.emit();
    }
  }
}

export const missionManager = new MissionManager();
