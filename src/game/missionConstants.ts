// Ported 1:1 from SharedFiles/Mission/MissionConstants.swift — the rules of
// the game. Keeping the numbers identical to the native app so profiles feel
// the same on web.

export const MissionConstants = {
  maxEnergy: 8,
  energyRechargeSeconds: 4 * 3600, // 4 hours
  collectionRadius: 45, // metres — generous, absorbs GPS error
  minSpawnDistance: 80, // metres — dead zone around the user
  minOrbSpacing: 60, // metres between orbs
  completionBonus: 50,

  xpTiers: [
    { value: 10, weight: 0.6 },
    { value: 25, weight: 0.3 },
    { value: 50, weight: 0.1 },
  ] as const,

  streakMilestones: {
    3: 30,
    7: 70,
    14: 150,
    30: 300,
    60: 600,
    100: 1000,
  } as Record<number, number>,
};

// XP required to reach a level: 100·(L-1) + 15·(L-1)²
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  const l = level - 1;
  return Math.floor(100 * l + 15 * l * l);
}

export function levelForXP(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  return level;
}

export function randomXPValue(): number {
  const roll = Math.random();
  let cumulative = 0;
  for (const tier of MissionConstants.xpTiers) {
    cumulative += tier.weight;
    if (roll < cumulative) return tier.value;
  }
  return MissionConstants.xpTiers[MissionConstants.xpTiers.length - 1].value;
}

export function streakMilestoneBonus(streak: number): number {
  return MissionConstants.streakMilestones[streak] ?? 0;
}

export const LEVEL_TITLES: string[] = [
  "Street Rat", "Lookout", "Runner", "Courier", "Hustler", "Scout", "Wheelman",
  "Picker", "Smuggler", "Fixer", "Operator", "Collector", "Spotter", "Broker",
  "Negotiator", "Street Pro", "Veteran Runner", "Navigator", "Pathfinder",
  "Enforcer", "Senior Enforcer", "Lieutenant", "Field Captain", "Tactician",
  "Coordinator", "Planner", "Specialist", "Tracker", "Elite Tracker", "Captain",
  "District Captain", "Area Boss", "Advisor", "Fixer Elite", "Strategist",
  "Influencer", "Commander", "Senior Commander", "Executive", "Underboss",
  "Regional Boss", "Master Operator", "Power Broker", "Chief Fixer", "Kingmaker",
  "High Roller", "Elite Boss", "Syndicate Member", "Syndicate Veteran", "Capo",
  "Senior Capo", "Consigliere", "Chief Strategist", "Inner Circle", "Authority",
  "Powerhouse", "Elite Consigliere", "Regional Kingpin", "Chairman", "Kingpin",
  "Grand Kingpin", "Network Chief", "Supreme Operator", "Empire Builder",
  "Tycoon", "Mastermind", "Architect", "Shadow Boss", "Crime Baron", "Overseer",
  "Grand Overseer", "Supreme Boss", "Elite Baron", "Empire Lord", "The Authority",
  "The Controller", "The Director", "The Chairman", "The Don", "Crime Lord",
  "Grand Crime Lord", "Legendary Don", "Empire Master", "The Untouchable",
  "The Phantom", "The Shadow", "The Legend", "The Icon", "The Myth", "Vice Legend",
  "Urban Legend", "Living Legend", "Master of Vice", "King of the Streets",
  "City Ruler", "Empire Legend", "Supreme Legend", "The Boss of Bosses",
  "The Godfather", "Legend",
];

export function titleForLevel(level: number): string {
  const index = Math.min(level - 1, LEVEL_TITLES.length - 1);
  return LEVEL_TITLES[Math.max(0, index)];
}

// MARK: - Difficulty ---------------------------------------------------------

export type DifficultyId = "easy" | "normal" | "hard";

export interface Difficulty {
  id: DifficultyId;
  displayName: string;
  icon: string;
  maxSpawnRadius: number; // metres
  durationSeconds: number;
  orbCount: [number, number]; // inclusive range
  xpMultiplier: number;
}

export const DIFFICULTIES: Record<DifficultyId, Difficulty> = {
  easy: {
    id: "easy", displayName: "Easy", icon: "🐢",
    maxSpawnRadius: 300, durationSeconds: 15 * 60, orbCount: [18, 24], xpMultiplier: 0.8,
  },
  normal: {
    id: "normal", displayName: "Normal", icon: "🚶",
    maxSpawnRadius: 600, durationSeconds: 30 * 60, orbCount: [28, 36], xpMultiplier: 1.0,
  },
  hard: {
    id: "hard", displayName: "Hard", icon: "🔥",
    maxSpawnRadius: 1200, durationSeconds: 60 * 60, orbCount: [45, 60], xpMultiplier: 1.3,
  },
};

// MARK: - Mission types ------------------------------------------------------

export type MissionTypeId = "sprint" | "classic" | "trek" | "chain";

export interface MissionType {
  id: MissionTypeId;
  displayName: string;
  blurb: string;
  icon: string;
  orbCountMultiplier: number;
  xpMultiplier: number;
  isOrdered: boolean;
}

export const MISSION_TYPES: Record<MissionTypeId, MissionType> = {
  sprint: {
    id: "sprint", displayName: "Sprint", blurb: "Fewer orbs, more XP each. Run!",
    icon: "🐇", orbCountMultiplier: 0.6, xpMultiplier: 1.5, isOrdered: false,
  },
  classic: {
    id: "classic", displayName: "Classic", blurb: "The standard orb hunt.",
    icon: "⭕️", orbCountMultiplier: 1.0, xpMultiplier: 1.0, isOrdered: false,
  },
  trek: {
    id: "trek", displayName: "Trek", blurb: "Extra orbs scattered everywhere.",
    icon: "🥾", orbCountMultiplier: 1.3, xpMultiplier: 1.2, isOrdered: false,
  },
  chain: {
    id: "chain", displayName: "Chain", blurb: "Collect orbs in order for double XP.",
    icon: "🔗", orbCountMultiplier: 0.4, xpMultiplier: 2.0, isOrdered: true,
  },
};

export function completionBonus(type: MissionType): number {
  return Math.round(MissionConstants.completionBonus * type.xpMultiplier);
}

// MARK: - Challenges ---------------------------------------------------------

export type ChallengePeriod = "daily" | "weekly" | "monthly";
export type ChallengeGoal = "completeMissions" | "collectOrbs" | "earnXP";

export interface ChallengeDefinition {
  id: string;
  period: ChallengePeriod;
  goal: ChallengeGoal;
  target: number;
  rewardXP: number;
}

export const CHALLENGE_DEFINITIONS: ChallengeDefinition[] = [
  { id: "daily.missions", period: "daily", goal: "completeMissions", target: 1, rewardXP: 20 },
  { id: "daily.orbs", period: "daily", goal: "collectOrbs", target: 15, rewardXP: 30 },
  { id: "daily.xp", period: "daily", goal: "earnXP", target: 150, rewardXP: 40 },
  { id: "weekly.missions", period: "weekly", goal: "completeMissions", target: 7, rewardXP: 100 },
  { id: "weekly.orbs", period: "weekly", goal: "collectOrbs", target: 80, rewardXP: 120 },
  { id: "weekly.xp", period: "weekly", goal: "earnXP", target: 1000, rewardXP: 150 },
  { id: "monthly.missions", period: "monthly", goal: "completeMissions", target: 25, rewardXP: 400 },
  { id: "monthly.orbs", period: "monthly", goal: "collectOrbs", target: 300, rewardXP: 500 },
  { id: "monthly.xp", period: "monthly", goal: "earnXP", target: 4000, rewardXP: 600 },
];

export function challengeDefinition(id: string): ChallengeDefinition | undefined {
  return CHALLENGE_DEFINITIONS.find((d) => d.id === id);
}

export function challengeTitle(def: ChallengeDefinition): string {
  switch (def.goal) {
    case "completeMissions":
      return def.target === 1 ? "Complete a mission" : `Complete ${def.target} missions`;
    case "collectOrbs":
      return `Collect ${def.target} orbs`;
    case "earnXP":
      return `Earn ${def.target} XP`;
  }
}

export function challengeIcon(def: ChallengeDefinition): string {
  switch (def.goal) {
    case "completeMissions": return "🏁";
    case "collectOrbs": return "⭕️";
    case "earnXP": return "⭐️";
  }
}

// A sortable key for the current period; when it changes, progress resets.
export function periodKey(period: ChallengePeriod, date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  switch (period) {
    case "daily":
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    case "weekly": {
      const { year, week } = isoWeek(date);
      return `${year}-W${String(week).padStart(2, "0")}`;
    }
    case "monthly":
      return `${y}-${String(m).padStart(2, "0")}`;
  }
}

// ISO-8601 week number (matches Calendar's yearForWeekOfYear/weekOfYear).
function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}
