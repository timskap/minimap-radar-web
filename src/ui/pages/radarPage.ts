// Page 0: the themed map face. Clock on top, the map face, the theme's button
// row (STAT/RADIO/TRACK for Wasteland/Five, CRAFT/TRACK for Pixel), a mission
// HUD capsule while a mission runs, zoom, and a desktop movement simulator.

import { el, clear, type Page } from "../dom.ts";
import { createClock } from "../clock.ts";
import { RadarFace } from "../radarFace.ts";
import { locationManager } from "../../state/location.ts";
import { missionManager } from "../../game/missionManager.ts";
import { themeManager } from "../../state/themeManager.ts";
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
  const zoomCol = el("div", { class: "zoom-col" }, [
    el("button", { class: "round-btn", onclick: () => face.zoomIn() }, ["+"]),
    el("button", { class: "round-btn", onclick: () => face.zoomOut() }, ["−"]),
  ]);
  const simPad = el("div", { class: "sim-pad" }, [
    el("button", { class: "round-btn", onclick: () => locationManager.simTurn(-20) }, ["↺"]),
    el("button", { class: "round-btn", onclick: () => locationManager.simStep(25) }, ["↑"]),
    el("button", { class: "round-btn", onclick: () => locationManager.simTurn(20) }, ["↻"]),
  ]);

  const faceWrap = el("div", { class: "face-wrap" }, [face.canvas, zoomCol, simPad, hud]);
  const buttonRow = el("div", { class: "face-buttons" });
  const root = el("div", { class: "page radar-page" }, [clock.el, faceWrap, buttonRow]);

  let lastTheme = "";

  const renderButtons = () => {
    const p = themeManager.palette;
    buttonRow.className = `face-buttons pos-${p.buttonPos} style-${p.buttonStyle}`;
    // Button row lives above or below the face; move it in the DOM.
    if (p.buttonPos === "top" && root.firstElementChild !== null) {
      root.insertBefore(buttonRow, faceWrap);
    } else {
      root.appendChild(buttonRow);
    }
    clear(buttonRow);
    if (p.buttonPos === "none" || p.buttons.length === 0) return;
    for (const b of p.buttons) {
      const btn = el("button", {
        class: `face-btn ${b.action === "track" && !face.trackNorthUp ? "active" : ""}`,
        onclick: () => {
          if (b.action === "missions") setPage(2);
          else if (b.action === "track") { face.trackNorthUp = !face.trackNorthUp; renderButtons(); }
          else if (b.action === "radio") flashRadio();
        },
      }, [b.label]);
      buttonRow.append(btn);
    }
  };

  const flashRadio = () => {
    const t = el("div", { class: "radio-toast" }, ["📻 no signal in the wasteland"]);
    faceWrap.append(t);
    setTimeout(() => t.remove(), 1400);
  };

  const layout = () => {
    const size = Math.min(faceWrap.clientWidth, faceWrap.clientHeight);
    if (size > 0) face.resize(size);
  };

  const update = () => {
    clock.update();
    if (themeManager.current !== lastTheme) {
      lastTheme = themeManager.current;
      renderButtons();
      layout();
    }
    simPad.classList.toggle("hidden", !locationManager.simulated);
    const s = missionManager.session;
    if (missionManager.isMissionActive && s) {
      hud.classList.remove("hidden");
      hud.innerHTML =
        `<span class="hud-timer">⏱ ${fmtTime(s.timeRemaining)}</span>` +
        `<span class="hud-orbs">◉ ${s.collectedCount}/${s.totalPoints}</span>`;
    } else {
      hud.classList.add("hidden");
    }
  };

  return {
    el: root,
    onShow: () => { renderButtons(); layout(); face.start(); update(); },
    onHide: () => face.stop(),
    update: () => { layout(); update(); },
  };
}
