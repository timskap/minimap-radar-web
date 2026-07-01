// The top clock widget, styled per theme after the app's timepieces:
// Vice (Gtanum blue, time only), Wasteland/Five (RobotoCondensed green, date +
// time), Pixel (blocky green bar, brown mono), Phantasy (Hylia serif gold).

import { themeManager } from "../state/themeManager.ts";
import { el } from "./dom.ts";

export function createClock(): { el: HTMLElement; update: () => void } {
  const date = el("span", { class: "clock-date" });
  const time = el("span", { class: "clock-time" });
  const root = el("div", { class: "clock" }, [date, time]);

  const update = () => {
    const c = themeManager.palette.clock;
    root.className = `clock clock-${c.layout}`;
    root.style.setProperty("--clock-color", c.color);
    root.style.setProperty("--clock-font", c.family);
    if (c.barBg) {
      root.style.setProperty("--clock-bar-bg", c.barBg);
      root.style.setProperty("--clock-bar-border", c.barBorder ?? "transparent");
    }

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    time.textContent = `${hh}:${mm}`;
    date.textContent = now
      .toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })
      .toUpperCase();
    // Only dateTime / bar layouts show the date.
    date.style.display = c.layout === "time" ? "none" : "";
  };

  update();
  return { el: root, update };
}
