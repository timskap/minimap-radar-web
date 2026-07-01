// Ported from SharedFiles/Mission/MissionProfile.swift. Player progression:
// XP/level/title, the recharging energy system, day streaks and the
// daily/weekly/monthly challenge state. Persisted to localStorage.

import {
  MissionConstants,
  levelForXP,
  xpForLevel,
  titleForLevel,
  streakMilestoneBonus,
  CHALLENGE_DEFINITIONS,
  challengeDefinition,
  periodKey,
  type ChallengeGoal,
} from "./missionConstants.ts";

export interface ChallengeState {
  id: string;
  periodKey: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface ProfileData {
  totalXP: number;
  level: number;
  currentEnergy: number;
  lastEnergyUpdateMs: number;
  missionsCompleted: number;
  bestMissionXP: number;
  totalCollected: number;
  currentStreak: number;
  longestStreak: number;
  lastMissionDayMs: number | null;
  challenges: ChallengeState[];
}

const STORAGE_KEY = "missionProfile";

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function daysBetween(fromMs: number, toMs: number): number {
  return Math.round((startOfDay(toMs) - startOfDay(fromMs)) / 86_400_000);
}

export class MissionProfile {
  data: ProfileData;

  constructor(data?: Partial<ProfileData>) {
    this.data = {
      totalXP: 0,
      level: 1,
      currentEnergy: MissionConstants.maxEnergy,
      lastEnergyUpdateMs: Date.now(),
      missionsCompleted: 0,
      bestMissionXP: 0,
      totalCollected: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastMissionDayMs: null,
      challenges: [],
      ...data,
    };
  }

  // MARK: - Energy

  get liveEnergy(): number {
    const elapsed = (Date.now() - this.data.lastEnergyUpdateMs) / 1000;
    const recharged = Math.floor(elapsed / MissionConstants.energyRechargeSeconds);
    return Math.min(MissionConstants.maxEnergy, this.data.currentEnergy + recharged);
  }

  // Seconds until the next energy unit, or null at full.
  get timeUntilNextEnergy(): number | null {
    if (this.liveEnergy >= MissionConstants.maxEnergy) return null;
    const elapsed = (Date.now() - this.data.lastEnergyUpdateMs) / 1000;
    const remainder = elapsed % MissionConstants.energyRechargeSeconds;
    return MissionConstants.energyRechargeSeconds - remainder;
  }

  private normalizeEnergy(): void {
    const elapsed = (Date.now() - this.data.lastEnergyUpdateMs) / 1000;
    const recharged = Math.floor(elapsed / MissionConstants.energyRechargeSeconds);
    if (recharged <= 0) return;
    this.data.currentEnergy = Math.min(
      MissionConstants.maxEnergy,
      this.data.currentEnergy + recharged,
    );
    if (this.data.currentEnergy >= MissionConstants.maxEnergy) {
      this.data.lastEnergyUpdateMs = Date.now();
    } else {
      this.data.lastEnergyUpdateMs +=
        recharged * MissionConstants.energyRechargeSeconds * 1000;
    }
  }

  consumeEnergy(): void {
    this.normalizeEnergy();
    if (this.data.currentEnergy <= 0) return;
    if (this.data.currentEnergy >= MissionConstants.maxEnergy) {
      this.data.lastEnergyUpdateMs = Date.now();
    }
    this.data.currentEnergy -= 1;
  }

  // MARK: - XP / level

  addXP(xp: number, collected: number, countsAsCompleted = true): void {
    this.data.totalXP += xp;
    this.data.totalCollected += collected;
    if (countsAsCompleted) this.data.missionsCompleted += 1;
    if (xp > this.data.bestMissionXP) this.data.bestMissionXP = xp;
    this.data.level = levelForXP(this.data.totalXP);
  }

  addBonusXP(xp: number): void {
    if (xp <= 0) return;
    this.data.totalXP += xp;
    this.data.level = levelForXP(this.data.totalXP);
  }

  get level(): number {
    return this.data.level;
  }

  get title(): string {
    return titleForLevel(this.data.level);
  }

  get xpProgressInLevel(): number {
    const currentLevelXP = xpForLevel(this.data.level);
    const nextLevelXP = xpForLevel(this.data.level + 1);
    const range = nextLevelXP - currentLevelXP;
    if (range <= 0) return 1;
    return (this.data.totalXP - currentLevelXP) / range;
  }

  // MARK: - Streaks

  liveStreak(now = Date.now()): number {
    if (this.data.lastMissionDayMs == null) return 0;
    return daysBetween(this.data.lastMissionDayMs, now) <= 1 ? this.data.currentStreak : 0;
  }

  completedMissionToday(now = Date.now()): boolean {
    if (this.data.lastMissionDayMs == null) return false;
    return startOfDay(this.data.lastMissionDayMs) === startOfDay(now);
  }

  // Extends/resets the streak; returns milestone bonus XP earned (0 if none).
  registerStreakDay(now = Date.now()): number {
    const today = startOfDay(now);
    if (this.data.lastMissionDayMs != null) {
      const days = daysBetween(this.data.lastMissionDayMs, now);
      if (days === 0) return 0; // already counted today
      this.data.currentStreak = days === 1 ? this.data.currentStreak + 1 : 1;
    } else {
      this.data.currentStreak = 1;
    }
    this.data.lastMissionDayMs = today;
    this.data.longestStreak = Math.max(this.data.longestStreak, this.data.currentStreak);
    return streakMilestoneBonus(this.data.currentStreak);
  }

  // MARK: - Challenges

  refreshChallenges(now = Date.now()): void {
    const date = new Date(now);
    this.data.challenges = CHALLENGE_DEFINITIONS.map((def) => {
      const key = periodKey(def.period, date);
      const existing = this.data.challenges.find((c) => c.id === def.id);
      if (existing && existing.periodKey === key) return existing;
      return { id: def.id, periodKey: key, progress: 0, completed: false, claimed: false };
    });
  }

  recordChallengeEvent(
    opts: { missionCompleted: boolean; orbs: number; xp: number },
    now = Date.now(),
  ): void {
    this.refreshChallenges(now);
    for (const state of this.data.challenges) {
      if (state.completed) continue;
      const def = challengeDefinition(state.id);
      if (!def) continue;
      const delta = deltaForGoal(def.goal, opts);
      if (delta <= 0) continue;
      state.progress = Math.min(def.target, state.progress + delta);
      if (state.progress >= def.target) state.completed = true;
    }
  }

  claimChallenge(id: string): number {
    const state = this.data.challenges.find((c) => c.id === id);
    const def = challengeDefinition(id);
    if (!state || !def || !state.completed || state.claimed) return 0;
    state.claimed = true;
    this.addBonusXP(def.rewardXP);
    return def.rewardXP;
  }

  get unclaimedChallengeXP(): number {
    return this.data.challenges.reduce((sum, s) => {
      const def = challengeDefinition(s.id);
      if (!def || !s.completed || s.claimed) return sum;
      return sum + def.rewardXP;
    }, 0);
  }

  // MARK: - Persistence

  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      /* storage may be unavailable (private mode) */
    }
  }

  static load(): MissionProfile {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return new MissionProfile(JSON.parse(raw) as Partial<ProfileData>);
    } catch {
      /* fall through to a fresh profile */
    }
    return new MissionProfile();
  }
}

function deltaForGoal(
  goal: ChallengeGoal,
  opts: { missionCompleted: boolean; orbs: number; xp: number },
): number {
  switch (goal) {
    case "completeMissions": return opts.missionCompleted ? 1 : 0;
    case "collectOrbs": return opts.orbs;
    case "earnXP": return opts.xp;
  }
}
