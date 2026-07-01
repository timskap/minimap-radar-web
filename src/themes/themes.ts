// The five watch faces as web palettes. Each theme drives the radar-face
// canvas colours, the background style, and the CSS custom properties for the
// surrounding chrome. Colours are drawn from Themes.swift + the theme map
// views (Vice neon, Phantasy parchment, Wasteland Pip-Boy CRT, Five, Pixel).

import type { ThemeId } from "../types.ts";

export type BackdropStyle = "grid" | "parchment" | "crt" | "clean" | "blocks";

export interface ThemePalette {
  id: ThemeId;
  displayName: string;
  blurb: string;
  swatch: string; // theme picker dot
  font: string;

  // Chrome / CSS
  bg: string; // page + frame background
  panel: string; // card / panel background
  text: string;
  textDim: string;
  accent: string;
  accent2: string;

  // Radar face
  mapBg: string; // face fill
  land: string;
  water: string;
  ring: string; // radar rings + grid lines
  ringStrong: string;
  player: string; // player arrow
  markerDefault: string;
  backdrop: BackdropStyle;
  clock: "digital" | "vault" | "phantasy" | "pixel";
}

export const THEMES: Record<ThemeId, ThemePalette> = {
  vice: {
    id: "vice",
    displayName: "Vice",
    blurb: "Neon night. Sleek and dynamic — perfect for city adventures.",
    swatch: "#ff40d0",
    font: `"Jura", system-ui, sans-serif`,
    bg: "#0a0618",
    panel: "rgba(255,64,208,0.08)",
    text: "#f4e9ff",
    textDim: "#a98fd0",
    accent: "#ff40d0",
    accent2: "#22e0ff",
    mapBg: "#120a2a",
    land: "#1c1140",
    water: "#0e2a4a",
    ring: "rgba(34,224,255,0.22)",
    ringStrong: "rgba(255,64,208,0.55)",
    player: "#22e0ff",
    markerDefault: "#ff40d0",
    backdrop: "grid",
    clock: "digital",
  },
  phantasy: {
    id: "phantasy",
    displayName: "Phantasy",
    blurb: "A magical, adventure-themed parchment map.",
    swatch: "#c8912f",
    font: `"HyliaSerif", Georgia, serif`,
    bg: "#241a10",
    panel: "rgba(210,180,130,0.12)",
    text: "#f3e6cc",
    textDim: "#c2ab84",
    accent: "#c8912f",
    accent2: "#5c8a3a",
    mapBg: "#e9d9b0",
    land: "#dcc794",
    water: "#8fb8c4",
    ring: "rgba(90,60,30,0.28)",
    ringStrong: "rgba(90,60,30,0.55)",
    player: "#7a2f1e",
    markerDefault: "#7a2f1e",
    backdrop: "parchment",
    clock: "phantasy",
  },
  wasteland: {
    id: "wasteland",
    displayName: "Wasteland",
    blurb: "Explore the real world after the bombs fell. Pip-Boy green.",
    swatch: "#38ff7a",
    font: `"Jura", "Courier New", monospace`,
    bg: "#040a04",
    panel: "rgba(56,255,122,0.08)",
    text: "#38ff7a",
    textDim: "#1f9c4c",
    accent: "#ff8a00",
    accent2: "#38ff7a",
    mapBg: "#031603",
    land: "#062606",
    water: "#043a1a",
    ring: "rgba(56,255,122,0.25)",
    ringStrong: "rgba(56,255,122,0.6)",
    player: "#38ff7a",
    markerDefault: "#ff8a00",
    backdrop: "crt",
    clock: "vault",
  },
  five: {
    id: "five",
    displayName: "Five",
    blurb: "It is happening again.",
    swatch: "#e7b74a",
    font: `"Jura", system-ui, sans-serif`,
    bg: "#0c0f0c",
    panel: "rgba(231,183,74,0.09)",
    text: "#f2efe6",
    textDim: "#b7b09c",
    accent: "#e7b74a",
    accent2: "#7ea6c8",
    mapBg: "#e7e2d4",
    land: "#d7d2c0",
    water: "#a9c4d2",
    ring: "rgba(40,45,40,0.22)",
    ringStrong: "rgba(40,45,40,0.5)",
    player: "#2f6f9f",
    markerDefault: "#c0392b",
    backdrop: "clean",
    clock: "digital",
  },
  pixel: {
    id: "pixel",
    displayName: "Pixel",
    blurb: "A blocky, sandbox-game world map.",
    swatch: "#5ba838",
    font: `"Jura", "Courier New", monospace`,
    bg: "#0f1a0c",
    panel: "rgba(91,168,56,0.12)",
    text: "#eaffea",
    textDim: "#9bc98a",
    accent: "#5ba838",
    accent2: "#8a5a2b",
    mapBg: "#3a6b2a",
    land: "#4d8a36",
    water: "#3a6ea5",
    ring: "rgba(0,0,0,0.25)",
    ringStrong: "rgba(0,0,0,0.45)",
    player: "#ffffff",
    markerDefault: "#c0392b",
    backdrop: "blocks",
    clock: "pixel",
  },
};

export const THEME_ORDER: ThemeId[] = ["vice", "phantasy", "wasteland", "five", "pixel"];
