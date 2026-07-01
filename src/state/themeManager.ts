// Selected theme + purchase gating. On the watch, Phantasy/Wasteland/Five are
// unlocked by iPhone purchases that sync over; here we persist an unlock set
// in localStorage (Vice + Pixel are free, matching the free faces).

import { Emitter } from "./emitter.ts";
import { THEMES, type ThemePalette } from "../themes/themes.ts";
import type { ThemeId } from "../types.ts";

const THEME_KEY = "selectedTheme";
const UNLOCK_KEY = "unlockedThemes";

const FREE: ThemeId[] = ["vice", "pixel"];

class ThemeManager extends Emitter {
  current: ThemeId = "vice";
  unlocked: Set<ThemeId> = new Set(FREE);

  constructor() {
    super();
    try {
      const saved = localStorage.getItem(THEME_KEY) as ThemeId | null;
      if (saved && saved in THEMES) this.current = saved;
      const unlocks = localStorage.getItem(UNLOCK_KEY);
      if (unlocks) for (const id of JSON.parse(unlocks) as ThemeId[]) this.unlocked.add(id);
    } catch {
      /* defaults */
    }
  }

  get palette(): ThemePalette {
    return THEMES[this.current];
  }

  isUnlocked(id: ThemeId): boolean {
    return this.unlocked.has(id);
  }

  select(id: ThemeId): void {
    if (!this.isUnlocked(id)) return;
    this.current = id;
    try {
      localStorage.setItem(THEME_KEY, id);
    } catch {
      /* ignore */
    }
    this.emit();
  }

  // Stands in for the iPhone in-app purchase (free on web).
  unlock(id: ThemeId): void {
    this.unlocked.add(id);
    try {
      localStorage.setItem(UNLOCK_KEY, JSON.stringify([...this.unlocked]));
    } catch {
      /* ignore */
    }
    this.emit();
  }
}

export const themeManager = new ThemeManager();
