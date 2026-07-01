// Page 3: the map theme picker — the watch's WatchThemePickerView. Locked
// themes show a lock; on the watch they unlock via iPhone purchases, here a
// tap unlocks them for free (there's no store on web).

import { el, clear, type Page } from "../dom.ts";
import { themeManager } from "../../state/themeManager.ts";
import { THEMES, THEME_ORDER } from "../../themes/themes.ts";

export function createThemePage(): Page {
  const list = el("div", { class: "theme-list" });
  const root = el("div", { class: "page scroll-page" }, [
    el("div", { class: "page-header" }, [el("h2", {}, ["Map Theme"])]),
    list,
  ]);

  function render(): void {
    clear(list);
    for (const id of THEME_ORDER) {
      const t = THEMES[id];
      const unlocked = themeManager.isUnlocked(id);
      const current = themeManager.current === id;
      const row = el("button", {
        class: `theme-row ${current ? "current" : ""}`,
        onclick: () => {
          if (unlocked) themeManager.select(id);
          else themeManager.unlock(id);
        },
      }, [
        el("span", { class: "theme-dot", style: `background:${t.swatch}` }),
        el("div", { class: "theme-meta" }, [
          el("span", { class: "theme-name" }, [t.displayName]),
          el("span", { class: "theme-blurb" }, [t.blurb]),
        ]),
        current
          ? el("span", { class: "theme-check" }, ["✓"])
          : unlocked
            ? el("span", { class: "theme-go" }, ["Select"])
            : el("span", { class: "theme-lock" }, ["🔒 Unlock"]),
      ]);
      list.append(row);
    }
    list.append(el("p", { class: "hint center" }, ["Free unlock on web · themed after the watch faces"]));
  }

  return { el: root, onShow: render, update: render };
}
