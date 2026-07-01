// Mission result sheet — the watch's MissionResultWatchView. Presented over
// whatever page is showing when a mission ends (all orbs collected or time up).

import { el, clear } from "./dom.ts";
import { missionManager } from "../game/missionManager.ts";

export function createResultOverlay(): { el: HTMLElement; update: () => void } {
  const sheet = el("div", { class: "result-sheet" });
  const root = el("div", { class: "result-overlay hidden" }, [sheet]);

  const update = () => {
    if (!missionManager.showResult || !missionManager.lastResult) {
      root.classList.add("hidden");
      return;
    }
    root.classList.remove("hidden");
    const r = missionManager.lastResult;
    clear(sheet);

    const title = r.completed ? "Mission Complete!" : "Mission Ended";
    const rows: HTMLElement[] = [
      el("div", { class: "result-stat" }, [
        el("span", {}, ["Orbs collected"]),
        el("b", {}, [`${r.collectedCount}/${r.totalPoints}`]),
      ]),
      el("div", { class: "result-stat" }, [el("span", {}, ["Base XP"]), el("b", {}, [`${r.baseXP}`])]),
    ];
    if (r.streakBonus > 0)
      rows.push(el("div", { class: "result-stat bonus" }, [
        el("span", {}, [`Streak 🔥 ${r.streak}`]), el("b", {}, [`+${r.streakBonus}`]),
      ]));
    if (r.completed)
      rows.push(el("div", { class: "result-stat bonus" }, [
        el("span", {}, ["Completion bonus"]), el("b", {}, [`+${r.bonusXP - r.streakBonus}`]),
      ]));
    if (r.challengeBonus > 0)
      rows.push(el("div", { class: "result-stat bonus" }, [
        el("span", {}, ["Challenge reward ready"]), el("b", {}, [`+${r.challengeBonus}`]),
      ]));

    sheet.append(
      el("div", { class: `result-badge ${r.completed ? "win" : ""}` }, [r.completed ? "🎉" : "🏁"]),
      el("h2", { class: "result-title" }, [title]),
      el("div", { class: "result-total" }, [`+${r.totalXP} XP`]),
      r.leveledUp ? el("div", { class: "result-levelup" }, [`⬆ Level ${r.newLevel}!`]) : el("span", {}, []),
      el("div", { class: "result-stats" }, rows),
      el("button", { class: "primary-btn wide", onclick: () => missionManager.dismissResult() }, ["Continue"]),
    );
  };

  return { el: root, update };
}
