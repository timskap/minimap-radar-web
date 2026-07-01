// The top clock widget. Each theme has its own timepiece on the watch
// (TimeView, VaultTimeView, PhantasyTimeView, PixelTimeView); here the style
// switches via a CSS class + format.

import { themeManager } from "../state/themeManager.ts";
import { el } from "./dom.ts";

export function createClock(): { el: HTMLElement; update: () => void } {
  const time = el("span", { class: "clock-time" });
  const date = el("span", { class: "clock-date" });
  const root = el("div", { class: "clock" }, [time, date]);

  const update = () => {
    const p = themeManager.palette;
    root.className = `clock clock-${p.clock}`;
    const now = new Date();
    const hh = now.getHours();
    const mm = now.getMinutes();
    if (p.clock === "vault") {
      // 12-hour Pip-Boy style.
      const h12 = ((hh + 11) % 12) + 1;
      time.textContent = `${h12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
    } else {
      time.textContent = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    }
    date.textContent = now
      .toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })
      .toUpperCase();
  };

  update();
  return { el: root, update };
}
