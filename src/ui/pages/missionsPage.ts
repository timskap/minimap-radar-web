// Page 2: the missions hub — the watch's MissionStartWatchView +
// MissionActiveWatchView + profile header. Profile ring, streak and energy;
// pick a type + difficulty and start; live mission controls; challenges with
// tap-to-claim "GET XP".

import { el, clear, type Page } from "../dom.ts";
import { setPage } from "../nav.ts";
import { missionManager } from "../../game/missionManager.ts";
import { locationManager } from "../../state/location.ts";
import {
  MISSION_TYPES,
  DIFFICULTIES,
  MissionConstants,
  challengeDefinition,
  challengeTitle,
  challengeIcon,
  type MissionTypeId,
  type DifficultyId,
} from "../../game/missionConstants.ts";

function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function createMissionsPage(): Page {
  let selectedType: MissionTypeId = "classic";
  let selectedDifficulty: DifficultyId = "normal";

  const header = el("div", { class: "profile-card" });
  const body = el("div", { class: "mission-body" });
  const challenges = el("div", { class: "challenges-card" });
  const root = el("div", { class: "page scroll-page" }, [header, body, challenges]);

  function renderHeader(): void {
    clear(header);
    const p = missionManager.profile;
    const pct = Math.max(0, Math.min(1, p.xpProgressInLevel));
    const deg = Math.round(pct * 360);

    const ring = el("div", { class: "level-ring", style:
      `background: conic-gradient(var(--accent) ${deg}deg, var(--ring) ${deg}deg)` }, [
      el("div", { class: "level-ring-inner" }, [
        el("span", { class: "level-num" }, [String(p.level)]),
        el("span", { class: "level-cap" }, ["LVL"]),
      ]),
    ]);

    const energy = p.liveEnergy;
    const bolts = el("div", { class: "energy-row" },
      Array.from({ length: MissionConstants.maxEnergy }, (_, i) =>
        el("span", { class: `bolt ${i < energy ? "on" : ""}` }, ["⚡"]),
      ),
    );

    const nextEnergy = p.timeUntilNextEnergy;
    const info = el("div", { class: "profile-info" }, [
      el("span", { class: "profile-title" }, [p.title]),
      el("span", { class: "profile-xp" }, [`${p.data.totalXP.toLocaleString()} XP`]),
      el("div", { class: "profile-badges" }, [
        el("span", { class: "streak" }, [`🔥 ${p.liveStreak()}`]),
        el("span", { class: "energy-count" }, [`⚡ ${energy}/${MissionConstants.maxEnergy}`]),
      ]),
      bolts,
      nextEnergy != null
        ? el("span", { class: "recharge" }, [`+1 ⚡ in ${fmtClock(nextEnergy)}`])
        : el("span", { class: "recharge" }, ["Energy full"]),
    ]);

    header.append(ring, info);
  }

  function renderStart(): void {
    clear(body);

    const typeRow = el("div", { class: "select-grid" },
      (Object.keys(MISSION_TYPES) as MissionTypeId[]).map((id) => {
        const t = MISSION_TYPES[id];
        return el("button", {
          class: `select-card ${id === selectedType ? "sel" : ""}`,
          onclick: () => { selectedType = id; renderStart(); },
        }, [
          el("span", { class: "sc-icon" }, [t.icon]),
          el("span", { class: "sc-name" }, [t.displayName]),
          el("span", { class: "sc-mult" }, [`×${t.xpMultiplier} XP`]),
        ]);
      }),
    );

    const diffRow = el("div", { class: "select-grid three" },
      (Object.keys(DIFFICULTIES) as DifficultyId[]).map((id) => {
        const d = DIFFICULTIES[id];
        return el("button", {
          class: `select-card ${id === selectedDifficulty ? "sel" : ""}`,
          onclick: () => { selectedDifficulty = id; renderStart(); },
        }, [
          el("span", { class: "sc-icon" }, [d.icon]),
          el("span", { class: "sc-name" }, [d.displayName]),
          el("span", { class: "sc-mult" }, [fmtDuration(d.durationSeconds)]),
        ]);
      }),
    );

    const blurb = el("p", { class: "blurb" }, [MISSION_TYPES[selectedType].blurb]);

    const p = missionManager.profile;
    const canStart = p.liveEnergy > 0 && locationManager.location != null;
    const startBtn = el("button", {
      class: "start-btn",
      onclick: () => {
        if (missionManager.start(MISSION_TYPES[selectedType], DIFFICULTIES[selectedDifficulty])) {
          setPage(0);
        }
      },
    }, [canStart ? "▶  START MISSION  (−1 ⚡)" : p.liveEnergy <= 0 ? "Out of energy" : "Waiting for GPS…"]);
    if (!canStart) startBtn.setAttribute("disabled", "");

    body.append(
      el("div", { class: "section-label" }, ["Mission type"]),
      typeRow,
      el("div", { class: "section-label" }, ["Difficulty"]),
      diffRow,
      blurb,
      startBtn,
    );
  }

  function renderActive(): void {
    clear(body);
    const s = missionManager.session;
    if (!s) return;
    const pct = s.totalPoints > 0 ? s.collectedCount / s.totalPoints : 0;
    const timePct = 1 - s.timeRemaining / s.durationSeconds;

    body.append(
      el("div", { class: "active-head" }, [
        el("span", { class: "active-type" }, [`${s.type.icon} ${s.type.displayName}`]),
        el("span", { class: "active-diff" }, [s.difficulty.displayName]),
      ]),
      el("div", { class: "big-timer" }, [`⏱ ${fmtClock(s.timeRemaining)}`]),
      el("div", { class: "bar" }, [el("div", { class: "bar-fill time", style: `width:${timePct * 100}%` })]),
      el("div", { class: "orb-count" }, [`◉ ${s.collectedCount} / ${s.totalPoints} orbs`]),
      el("div", { class: "bar" }, [el("div", { class: "bar-fill", style: `width:${pct * 100}%` })]),
      el("p", { class: "hint" }, ["Walk within 45 m of an orb to collect it. Watch the radar."]),
      el("button", { class: "danger-btn", onclick: () => {
        if (confirm("End this mission? Collected XP is kept.")) missionManager.cancel();
      } }, ["End mission"]),
    );
  }

  function renderChallenges(): void {
    clear(challenges);
    const p = missionManager.profile;
    p.refreshChallenges();
    challenges.append(el("div", { class: "section-label" }, ["Challenges"]));
    for (const state of p.data.challenges) {
      const def = challengeDefinition(state.id);
      if (!def) continue;
      const pct = Math.min(1, state.progress / def.target);
      const claimable = state.completed && !state.claimed;
      const row = el("div", { class: `challenge-row ${state.completed ? "done" : ""}` }, [
        el("span", { class: "ch-icon" }, [challengeIcon(def)]),
        el("div", { class: "ch-meta" }, [
          el("span", { class: "ch-title" }, [`${challengeTitle(def)} · ${def.period}`]),
          el("div", { class: "bar small" }, [el("div", { class: "bar-fill", style: `width:${pct * 100}%` })]),
          el("span", { class: "ch-prog" }, [`${Math.min(state.progress, def.target)}/${def.target}`]),
        ]),
        claimable
          ? el("button", { class: "claim-btn pulse", onclick: () => {
              missionManager.claimChallenge(state.id);
            } }, [`GET ${def.rewardXP}`])
          : el("span", { class: `ch-reward ${state.claimed ? "claimed" : ""}` }, [
              state.claimed ? "✓" : `+${def.rewardXP}`,
            ]),
      ]);
      challenges.append(row);
    }
  }

  const update = () => {
    renderHeader();
    if (missionManager.isMissionActive) renderActive();
    else renderStart();
    renderChallenges();
  };

  return { el: root, onShow: update, update };
}
