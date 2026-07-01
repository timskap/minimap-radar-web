import "./style.css";

import { el, clear, type Page } from "./ui/dom.ts";
import { registerNavigator } from "./ui/nav.ts";
import { locationManager } from "./state/location.ts";
import { themeManager } from "./state/themeManager.ts";
import { markerStore } from "./state/markers.ts";
import { missionManager } from "./game/missionManager.ts";
import { createRadarPage } from "./ui/pages/radarPage.ts";
import { createMarkersPage } from "./ui/pages/markersPage.ts";
import { createMissionsPage } from "./ui/pages/missionsPage.ts";
import { createThemePage } from "./ui/pages/themePage.ts";
import { createResultOverlay } from "./ui/resultOverlay.ts";

const appRoot = document.getElementById("app")!;

// Apply the active theme's palette as CSS custom properties + a data-theme
// hook for backdrop-specific chrome.
function applyTheme(): void {
  const p = themeManager.palette;
  const r = document.documentElement.style;
  r.setProperty("--bg", p.bg);
  r.setProperty("--panel", p.panel);
  r.setProperty("--text", p.text);
  r.setProperty("--text-dim", p.textDim);
  r.setProperty("--accent", p.accent);
  r.setProperty("--accent2", p.accent2);
  r.setProperty("--ring", p.ring);
  r.setProperty("--ring-strong", p.ringStrong);
  r.setProperty("--font", p.font);
  r.setProperty("--map-bg", p.mapBg);
  document.documentElement.dataset.theme = p.id;
}

function buildLocationGate(): HTMLElement {
  const enable = el("button", { class: "primary-btn wide", onclick: () => {
    void locationManager.requestReal();
  } }, ["Enable location"]);
  const sim = el("button", { class: "ghost-btn wide", onclick: () => {
    locationManager.startSimulator();
  } }, ["Use simulator (desktop)"]);

  const note = el("p", { class: "gate-note" }, []);
  const gate = el("div", { class: "gate" }, [
    el("div", { class: "gate-glyph" }, ["📍"]),
    el("h1", {}, ["MiniMap Radar"]),
    el("p", { class: "gate-sub" }, ["This app is built around where you are. Allow location to begin."]),
    enable,
    sim,
    note,
  ]);

  const refresh = () => {
    if (locationManager.status === "denied") {
      note.textContent =
        "Location was denied. Allow it in your browser's site settings, or use the simulator.";
    } else if (locationManager.status === "prompt") {
      note.textContent = "Waiting for permission…";
    } else {
      note.textContent = "";
    }
  };
  locationManager.subscribe(refresh);
  refresh();
  return gate;
}

function buildWatch(): { el: HTMLElement; pages: Page[]; goTo: (i: number) => void; tick: () => void } {
  const pages: Page[] = [
    createRadarPage(),
    createMarkersPage(),
    createMissionsPage(),
    createThemePage(),
  ];
  const labels = ["Radar", "Markers", "Missions", "Theme"];

  const track = el("div", { class: "pager-track" }, pages.map((p) => p.el));
  const pager = el("div", { class: "pager" }, [track]);

  const dots = el("div", { class: "dots" },
    labels.map((label, i) =>
      el("button", { class: "dot", title: label, onclick: () => goTo(i) }, []),
    ),
  );

  const result = createResultOverlay();
  const frame = el("div", { class: "watch-frame" }, [pager, dots, result.el]);
  const root = el("div", { class: "watch-shell" }, [frame]);

  let current = 0;

  function goTo(i: number): void {
    const next = Math.max(0, Math.min(pages.length - 1, i));
    if (next === current) return;
    pages[current].onHide?.();
    current = next;
    track.style.transform = `translateY(-${current * 100}%)`;
    dots.querySelectorAll(".dot").forEach((d, idx) => d.classList.toggle("on", idx === current));
    pages[current].onShow?.();
  }

  // Swipe (vertical) navigation on the radar; scroll pages handle their own.
  let startY = 0;
  let startX = 0;
  pager.addEventListener("touchstart", (e) => {
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
  }, { passive: true });
  pager.addEventListener("touchend", (e) => {
    const dy = e.changedTouches[0].clientY - startY;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 1.4) {
      // Only page-swipe from the radar (page 0); scroll pages scroll instead.
      if (current === 0 || Math.abs(dy) > 120) goTo(current + (dy < 0 ? 1 : -1));
    }
  }, { passive: true });

  // Keyboard: brackets / digits navigate; arrows drive the simulator.
  window.addEventListener("keydown", (e) => {
    if (e.key === "]") goTo(current + 1);
    else if (e.key === "[") goTo(current - 1);
    else if (e.key >= "1" && e.key <= "4") goTo(Number(e.key) - 1);
    else if (locationManager.simulated) {
      if (e.key === "ArrowUp") { locationManager.simStep(20); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { locationManager.simTurn(-15); e.preventDefault(); }
      else if (e.key === "ArrowRight") { locationManager.simTurn(15); e.preventDefault(); }
      else if (e.key === "ArrowDown") { locationManager.simStep(-20); e.preventDefault(); }
    }
  });

  dots.firstElementChild?.classList.add("on");
  pages[0].onShow?.();

  const tick = () => {
    result.update();
    pages[current].update?.();
  };

  registerNavigator(goTo);
  return { el: root, pages, goTo, tick };
}

// MARK: - Boot ---------------------------------------------------------------

let watch: ReturnType<typeof buildWatch> | null = null;

function render(): void {
  applyTheme();
  clear(appRoot);
  if (!locationManager.isAuthorized) {
    watch?.pages.forEach((p) => p.onHide?.());
    watch = null;
    appRoot.append(buildLocationGate());
  } else {
    if (!watch) watch = buildWatch();
    appRoot.append(watch.el);
  }
}

// Re-render the shell when auth flips; update chrome on theme change.
locationManager.subscribe(() => {
  const shouldShowWatch = locationManager.isAuthorized;
  const showingWatch = watch != null && appRoot.contains(watch.el);
  if (shouldShowWatch !== showingWatch) render();
});
themeManager.subscribe(() => {
  applyTheme();
  watch?.tick();
});
markerStore.subscribe(() => watch?.tick());
missionManager.subscribe(() => watch?.tick());

// A steady heartbeat keeps clocks, timers, energy and the mission tick fresh.
setInterval(() => watch?.tick(), 1000);

render();
