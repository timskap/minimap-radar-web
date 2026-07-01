// Page 0: the themed radar face — the watch's main map page. Shows the clock,
// the radar canvas, a mission HUD capsule while a mission runs, zoom buttons,
// and (in simulator mode) movement controls so it works on a desktop.

import { el, type Page } from "../dom.ts";
import { createClock } from "../clock.ts";
import { RadarFace } from "../radarFace.ts";
import { locationManager } from "../../state/location.ts";
import { missionManager } from "../../game/missionManager.ts";
import { setPage } from "../nav.ts";

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function createRadarPage(): Page {
  const clock = createClock();
  const face = new RadarFace();

  const hud = el("button", { class: "mission-hud hidden", onclick: () => setPage(2) });

  const zoomIn = el("button", { class: "round-btn", onclick: () => face.zoomIn() }, ["+"]);
  const zoomOut = el("button", { class: "round-btn", onclick: () => face.zoomOut() }, ["−"]);
  const zoomCol = el("div", { class: "zoom-col" }, [zoomIn, zoomOut]);

  // Simulator D-pad (only shown when running on simulated location).
  const simPad = el("div", { class: "sim-pad" }, [
    el("button", { class: "round-btn", onclick: () => locationManager.simTurn(-20) }, ["↺"]),
    el("button", { class: "round-btn", onclick: () => locationManager.simStep(25) }, ["↑"]),
    el("button", { class: "round-btn", onclick: () => locationManager.simTurn(20) }, ["↻"]),
  ]);

  const faceWrap = el("div", { class: "face-wrap" }, [face.canvas, zoomCol, simPad, hud]);
  const root = el("div", { class: "page radar-page" }, [clock.el, faceWrap]);

  const layout = () => {
    const size = Math.min(faceWrap.clientWidth, faceWrap.clientHeight);
    if (size > 0) face.resize(size);
  };

  const update = () => {
    clock.update();
    simPad.classList.toggle("hidden", !locationManager.simulated);
    const s = missionManager.session;
    if (missionManager.isMissionActive && s) {
      hud.classList.remove("hidden");
      hud.innerHTML = `<span class="hud-timer">⏱ ${fmtTime(s.timeRemaining)}</span>` +
        `<span class="hud-orbs">◉ ${s.collectedCount}/${s.totalPoints}</span>`;
    } else {
      hud.classList.add("hidden");
    }
  };

  return {
    el: root,
    onShow: () => {
      layout();
      face.start();
      update();
    },
    onHide: () => face.stop(),
    update: () => {
      layout();
      update();
    },
  };
}
