// The five watch faces, ported with the native app's real layout + assets:
// each theme carries its face shape, map-skin image, player-arrow image, the
// chrome (Vice pink ring, Phantasy vignette + north crest, Wasteland CRT noise,
// Five grayscale, Pixel blocks), the bottom/top button row and its clock.

import type { ThemeId } from "../types.ts";
import type { TileStyle } from "../ui/tileLayer.ts";

export type FaceShape = "circle" | "rect";
export type NorthStyle = "badge" | "image" | "edge";
export type ButtonStyle = "fallout" | "five" | "none";
export type ClockLayout = "time" | "dateTime" | "bar";
export type IconSet = "vice" | "wasteland" | "phantasy";

export interface FaceButton {
  label: string;
  action: "missions" | "track" | "radio";
}

export interface ThemePalette {
  id: ThemeId;
  displayName: string;
  blurb: string;
  swatch: string;

  // Chrome / CSS
  bg: string;
  panel: string;
  text: string;
  textDim: string;
  accent: string;
  accent2: string;
  font: string;

  // Radar face
  shape: FaceShape;
  mapBg: string; // fill behind the map while tiles load
  tileStyle: TileStyle; // OSM raster basemap (dark / light / voyager)
  tileFilter: string; // canvas filter giving the theme its colour treatment
  pixelate?: boolean; // Pixel: nearest-neighbour, chunky
  zoomBias?: number; // Pixel: -1 for bigger blocks
  arrow: string; // /assets/arrows/*.png (empty → procedural)
  arrowGlow?: string;
  arrowSize: number; // px
  arrowRotates: boolean; // Pixel is north-up: arrow rotates, map doesn't
  northUp: boolean; // Pixel: map never rotates
  ring?: { color: string; width: number }; // Vice pink ring
  vignette: boolean; // Phantasy / Wasteland / Five dark blurred edge
  edgeStroke?: string; // thin outer stroke
  tvNoise: boolean; // Wasteland CRT
  tint?: string; // multiply tint over the map (Wasteland green, Vice magenta)
  tintAlpha?: number;
  northStyle: NorthStyle;

  // Buttons + clock
  buttons: FaceButton[];
  buttonPos: "top" | "bottom" | "none";
  buttonStyle: ButtonStyle;
  clock: { layout: ClockLayout; family: string; color: string; barBg?: string; barBorder?: string };
  iconSet: IconSet;
  orbGlow: boolean;
}

const A = "/assets";

export const THEMES: Record<ThemeId, ThemePalette> = {
  vice: {
    id: "vice",
    displayName: "Vice",
    blurb: "Neon night. Sleek and dynamic — perfect for city adventures.",
    swatch: "#ff66ff",
    bg: "#0a0618",
    panel: "rgba(255,102,255,0.09)",
    text: "#f4e9ff",
    textDim: "#a98fd0",
    accent: "#ff66ff",
    accent2: "#60c1f1",
    font: `"Gtanum", "Jura", system-ui, sans-serif`,
    shape: "circle",
    mapBg: "#120a2a",
    tileStyle: "dark",
    tileFilter: "brightness(0.9) saturate(1.35) contrast(1.05)",
    arrow: `${A}/arrows/vice.png`,
    arrowSize: 40,
    arrowRotates: false,
    northUp: false,
    ring: { color: "#ff66ff", width: 0.05 },
    vignette: false,
    edgeStroke: "rgba(255,102,255,0.5)",
    tvNoise: false,
    tint: "#ff40d0",
    tintAlpha: 0.28,
    northStyle: "badge",
    buttons: [{ label: "TRACK", action: "track" }],
    buttonPos: "none",
    buttonStyle: "none",
    clock: { layout: "time", family: `"Gtanum", "Jura", sans-serif`, color: "#60c1f1" },
    iconSet: "vice",
    orbGlow: true,
  },

  phantasy: {
    id: "phantasy",
    displayName: "Phantasy",
    blurb: "A magical, adventure-themed parchment map.",
    swatch: "#c8912f",
    bg: "#241a10",
    panel: "rgba(210,180,130,0.14)",
    text: "#f3e6cc",
    textDim: "#c2ab84",
    accent: "#c8912f",
    accent2: "#5c8a3a",
    font: `"HyliaSerif", Georgia, serif`,
    shape: "circle",
    mapBg: "#e9d9b0",
    tileStyle: "light",
    tileFilter: "sepia(0.8) saturate(1.5) hue-rotate(-12deg) brightness(1.03) contrast(0.95)",
    arrow: `${A}/arrows/phantasy.png`,
    arrowGlow: `${A}/arrows/phantasy-glow.png`,
    arrowSize: 40,
    arrowRotates: false,
    northUp: false,
    vignette: true,
    edgeStroke: "#4f4f4f",
    tvNoise: false,
    northStyle: "image",
    buttons: [],
    buttonPos: "none",
    buttonStyle: "none",
    clock: { layout: "time", family: `"HyliaSerif", serif`, color: "#c8912f" },
    iconSet: "phantasy",
    orbGlow: true,
  },

  wasteland: {
    id: "wasteland",
    displayName: "Wasteland",
    blurb: "Explore the real world after the bombs fell. Pip-Boy green.",
    swatch: "#38ff7a",
    bg: "#040a04",
    panel: "rgba(56,255,122,0.08)",
    text: "#43e36a",
    textDim: "#1f9c4c",
    accent: "#43e36a",
    accent2: "#ff8a00",
    font: `"RobotoCondensed", "Jura", monospace`,
    shape: "rect",
    mapBg: "#031603",
    tileStyle: "dark",
    tileFilter: "grayscale(1) brightness(1.05) contrast(1.15)",
    arrow: `${A}/arrows/wasteland.png`,
    arrowSize: 24,
    arrowRotates: false,
    northUp: false,
    vignette: true,
    edgeStroke: "#4f4f4f",
    tvNoise: true,
    tint: "#43e36a",
    tintAlpha: 0.5,
    northStyle: "edge",
    buttons: [
      { label: "STAT", action: "missions" },
      { label: "RADIO", action: "radio" },
      { label: "TRACK", action: "track" },
    ],
    buttonPos: "bottom",
    buttonStyle: "fallout",
    clock: { layout: "dateTime", family: `"RobotoCondensed", monospace`, color: "#43e36a" },
    iconSet: "wasteland",
    orbGlow: true,
  },

  five: {
    id: "five",
    displayName: "Five",
    blurb: "It is happening again.",
    swatch: "#e7b74a",
    bg: "#0c0f0c",
    panel: "rgba(231,183,74,0.1)",
    text: "#f2efe6",
    textDim: "#b7b09c",
    accent: "#e7b74a",
    accent2: "#7ea6c8",
    font: `"RobotoCondensed", "Jura", sans-serif`,
    shape: "rect",
    mapBg: "#cfcabb",
    tileStyle: "light",
    tileFilter: "grayscale(1) contrast(1.15) brightness(0.82)",
    arrow: `${A}/arrows/five.png`,
    arrowSize: 44,
    arrowRotates: false,
    northUp: false,
    vignette: true,
    edgeStroke: "#000",
    tvNoise: false,
    northStyle: "edge",
    buttons: [
      { label: "STATS", action: "missions" },
      { label: "RADIO", action: "radio" },
      { label: "TRACK", action: "track" },
    ],
    buttonPos: "top",
    buttonStyle: "five",
    clock: { layout: "dateTime", family: `"RobotoCondensed", monospace`, color: "#3fa34d" },
    iconSet: "wasteland",
    orbGlow: true,
  },

  pixel: {
    id: "pixel",
    displayName: "Pixel",
    blurb: "A blocky, sandbox-game world map.",
    swatch: "#7fb238",
    bg: "#0f1a0c",
    panel: "rgba(127,178,56,0.14)",
    text: "#eaffea",
    textDim: "#9bc98a",
    accent: "#7fb238",
    accent2: "#e0c341",
    font: `"Jura", "Courier New", monospace`,
    shape: "rect",
    mapBg: "#4d8a36",
    tileStyle: "voyager",
    tileFilter: "saturate(1.9) contrast(1.2)",
    pixelate: true,
    zoomBias: -2,
    arrow: "", // procedural blocky arrow
    arrowSize: 22,
    arrowRotates: true,
    northUp: true,
    vignette: false,
    edgeStroke: "#2b2113",
    tvNoise: false,
    northStyle: "edge",
    buttons: [
      { label: "CRAFT", action: "missions" },
      { label: "TRACK", action: "track" },
    ],
    buttonPos: "top",
    buttonStyle: "five",
    clock: { layout: "bar", family: `"Jura", monospace`, color: "#3a2113", barBg: "#7fb238", barBorder: "#2b2113" },
    iconSet: "vice",
    orbGlow: false,
  },
};

export const THEME_ORDER: ThemeId[] = ["vice", "phantasy", "wasteland", "five", "pixel"];
