// The themed map face, rebuilt around the native app's real layout + assets.
// Each theme skins a rotating map image (heading-up, except Pixel which is
// north-up), clips it to a circle or rounded rect, overlays its chrome (Vice
// pink ring, Phantasy vignette + crest, Wasteland CRT noise + green tint, Five
// grayscale) and drops the real player-arrow image at the centre. Markers and
// mission orbs are still placed by bearing + distance, exactly like the app.

import { bearingDegrees, distanceMeters, toRad, type Coord } from "../geo/geo.ts";
import { locationManager } from "../state/location.ts";
import { markerStore } from "../state/markers.ts";
import { missionManager } from "../game/missionManager.ts";
import { themeManager } from "../state/themeManager.ts";
import type { ThemePalette, FaceShape } from "../themes/themes.ts";
import { getImage, isReady, preload } from "./imageCache.ts";
import type { MissionXPPoint, OrbTier } from "../types.ts";

const RANGE_STEPS = [100, 150, 250, 400, 600, 1000, 1500];

export class RadarFace {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rangeIndex = 2;
  private raf = 0;
  private dpr = Math.min(window.devicePixelRatio || 1, 2);
  private size = 0;
  // TRACK toggles heading-up vs north-up (mirrors the app's TRACK button).
  trackNorthUp = false;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "radar-canvas";
    this.ctx = this.canvas.getContext("2d")!;
    preload([
      "/assets/skins/vice.png", "/assets/skins/phantasy.png",
      "/assets/skins/wasteland.png", "/assets/skins/five.png",
      "/assets/arrows/vice.png", "/assets/arrows/phantasy.png",
      "/assets/arrows/phantasy-glow.png", "/assets/arrows/wasteland.png",
      "/assets/arrows/five.png", "/assets/overlays/tvnoise.png",
      "/assets/overlays/north-phantasy.png",
    ]);
  }

  get rangeMeters(): number {
    return RANGE_STEPS[this.rangeIndex];
  }
  zoomIn(): void { this.rangeIndex = Math.max(0, this.rangeIndex - 1); }
  zoomOut(): void { this.rangeIndex = Math.min(RANGE_STEPS.length - 1, this.rangeIndex + 1); }

  resize(cssSize: number): void {
    this.size = cssSize;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(cssSize * this.dpr);
    this.canvas.height = Math.round(cssSize * this.dpr);
    this.canvas.style.width = `${cssSize}px`;
    this.canvas.style.height = `${cssSize}px`;
  }

  start(): void {
    if (this.raf) return;
    const loop = () => { this.draw(); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }
  stop(): void { cancelAnimationFrame(this.raf); this.raf = 0; }

  // Effective rotation of the map (0 in north-up modes).
  private mapRotation(p: ThemePalette): number {
    if (p.northUp || this.trackNorthUp) return 0;
    return locationManager.heading;
  }

  private draw(): void {
    const { ctx, size, dpr } = this;
    if (size === 0) return;
    const p = themeManager.palette;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const shape = p.shape;
    const inset = shape === "circle" ? 4 : 6;
    const radius = size / 2 - inset; // circle radius / rect half-extent
    const half = radius;
    const scale = half / this.rangeMeters;
    const rot = this.mapRotation(p);

    // --- clip to the face shape, draw skin + overlays inside it ---
    ctx.save();
    this.pathShape(shape, cx, cy, radius);
    ctx.clip();

    this.drawSkin(p, cx, cy, radius, rot);

    const loc = locationManager.location;
    if (loc) {
      this.drawMarkers(p, loc, rot, cx, cy, half, scale, shape);
      this.drawOrbs(p, loc, rot, cx, cy, half, scale, shape);
    }

    if (p.tvNoise) this.drawTVNoise(cx, cy, radius);
    if (p.vignette) this.drawVignette(cx, cy, radius, shape);
    ctx.restore();

    // --- chrome on top of the clip ---
    this.drawEdge(p, cx, cy, radius, shape);
    this.drawNorth(p, cx, cy, radius, shape);
    this.drawPlayer(p, cx, cy);

    ctx.restore();
  }

  // MARK: - geometry

  private pathShape(shape: FaceShape, cx: number, cy: number, r: number): void {
    const { ctx } = this;
    ctx.beginPath();
    if (shape === "circle") {
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    } else {
      this.roundRect(cx - r, cy - r, r * 2, r * 2, 10);
    }
  }

  private roundRect(x: number, y: number, w: number, h: number, rad: number): void {
    const { ctx } = this;
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  // MARK: - skin

  private drawSkin(p: ThemePalette, cx: number, cy: number, r: number, rot: number): void {
    const { ctx } = this;
    ctx.fillStyle = p.mapBg;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    if (!p.skin) {
      this.drawPixelWorld(p, cx, cy, r, rot);
      return;
    }
    if (!isReady(p.skin)) return;
    const img = getImage(p.skin);

    // Cover the (rotating) face with the skin.
    const cover = (p.shape === "circle" ? 2 * r : Math.hypot(2 * r, 2 * r)) * 1.15;
    const s = Math.max(cover / img.naturalWidth, cover / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-toRad(rot));
    if (p.grayscale) ctx.filter = "grayscale(1) contrast(1.25) brightness(1.05)";
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.filter = "none";
    ctx.restore();

    // Wasteland green tint (colorMultiply).
    if (p.tint) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = p.tint;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
    }
  }

  // Minecraft-ish blocky ground for Pixel (no skin image, north-up).
  private drawPixelWorld(p: ThemePalette, cx: number, cy: number, r: number, _rot: number): void {
    const { ctx } = this;
    const cell = 20;
    const water = "#3a6ea5";
    const grass = "#4d8a36";
    const grass2 = "#5ba838";
    const dirt = "#8a5a2b";
    for (let y = cy - r; y < cy + r; y += cell) {
      for (let x = cx - r; x < cx + r; x += cell) {
        const n = (Math.floor(x / cell) * 7 + Math.floor(y / cell) * 13) % 11;
        ctx.fillStyle = n === 0 ? water : n === 1 ? dirt : n < 5 ? grass2 : grass;
        ctx.fillRect(Math.round(x), Math.round(y), cell, cell);
      }
    }
    void p;
  }

  // MARK: - projection

  private project(
    loc: Coord, point: Coord, rot: number,
    cx: number, cy: number, half: number, scale: number, shape: FaceShape,
  ): { x: number; y: number; dist: number; clamped: boolean } {
    const dist = distanceMeters(loc, point);
    const rel = toRad(bearingDegrees(loc, point) - rot);
    let sx = dist * Math.sin(rel) * scale;
    let sy = -dist * Math.cos(rel) * scale;
    const rim = half - 12;
    let clamped = false;
    if (shape === "circle") {
      const mag = Math.hypot(sx, sy);
      if (mag > rim && mag > 0) { const f = rim / mag; sx *= f; sy *= f; clamped = true; }
    } else {
      if (Math.abs(sx) > rim || Math.abs(sy) > rim) {
        const f = rim / Math.max(Math.abs(sx), Math.abs(sy));
        sx *= f; sy *= f; clamped = true;
      }
    }
    return { x: cx + sx, y: cy + sy, dist, clamped };
  }

  // MARK: - markers

  private drawMarkers(
    p: ThemePalette, loc: Coord, rot: number,
    cx: number, cy: number, half: number, scale: number, shape: FaceShape,
  ): void {
    const { ctx } = this;
    const iconSize = Math.max(20, half * 0.16);
    for (const m of markerStore.markers) {
      const pr = this.project(loc, { lat: m.lat, lon: m.lon }, rot, cx, cy, half, scale, shape);
      ctx.save();
      ctx.globalAlpha = pr.clamped ? 0.75 : 1;
      if (m.icon && m.icon !== "Letter" && isReady(m.icon)) {
        const img = getImage(m.icon);
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 3;
        ctx.drawImage(img, pr.x - iconSize / 2, pr.y - iconSize / 2, iconSize, iconSize);
      } else {
        // Letter marker: rounded square + first glyph (matches MarkerView).
        const s = iconSize;
        ctx.fillStyle = m.color || p.accent;
        ctx.beginPath();
        this.roundRect(pr.x - s / 2, pr.y - s / 2, s, s, 6);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.round(s * 0.7)}px ${p.font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText((m.name.trim()[0] || "?").toUpperCase(), pr.x, pr.y + 1);
      }
      ctx.restore();
    }
  }

  // MARK: - orbs

  private orbColor(tier: OrbTier): string {
    switch (tier) {
      case "small": return "#3cc8ff";
      case "medium": return "#b06bff";
      case "large": return "#ffcf33";
    }
  }

  private drawOrbs(
    p: ThemePalette, loc: Coord, rot: number,
    cx: number, cy: number, half: number, scale: number, shape: FaceShape,
  ): void {
    const session = missionManager.session;
    if (!session || session.ended) return;
    const { ctx } = this;
    const nextIndex = session.nextOrderIndex;
    const pulse = 1 + Math.sin(performance.now() / 250) * 0.12;

    for (const orb of session.xpPoints as MissionXPPoint[]) {
      if (orb.collected) continue;
      const pr = this.project(loc, { lat: orb.lat, lon: orb.lon }, rot, cx, cy, half, scale, shape);
      const isNext = nextIndex != null && orb.orderIndex === nextIndex;
      const base = orb.tier === "large" ? 6.5 : orb.tier === "medium" ? 5.5 : 4.5;
      const rad = base * (isNext ? pulse : 1);
      const color = this.orbColor(orb.tier);
      ctx.save();
      ctx.globalAlpha = pr.clamped ? 0.55 : 1;
      if (p.orbGlow) { ctx.shadowColor = color; ctx.shadowBlur = 8; }
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, rad, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = isNext ? 2 : 1;
      ctx.strokeStyle = isNext ? "#39ff88" : "rgba(255,255,255,0.85)";
      ctx.stroke();
      if (orb.orderIndex != null) {
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.round(rad)}px ${p.font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(orb.orderIndex + 1), pr.x, pr.y + 0.5);
      }
      ctx.restore();
    }
  }

  // MARK: - chrome

  private drawTVNoise(cx: number, cy: number, r: number): void {
    const src = "/assets/overlays/tvnoise.png";
    if (!isReady(src)) return;
    const { ctx } = this;
    const jitter = (performance.now() % 140 < 70 ? 0 : 2);
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.drawImage(getImage(src), cx - r, cy - r + jitter, r * 2, r * 2);
    ctx.restore();
  }

  private drawVignette(cx: number, cy: number, r: number, shape: FaceShape): void {
    const { ctx } = this;
    ctx.save();
    const g = ctx.createRadialGradient(cx, cy, r * 0.74, cx, cy, r * 1.02);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = g;
    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  private drawEdge(p: ThemePalette, cx: number, cy: number, r: number, shape: FaceShape): void {
    const { ctx } = this;
    if (p.ring) {
      ctx.save();
      this.pathShape(shape, cx, cy, r);
      ctx.strokeStyle = p.ring.color;
      ctx.lineWidth = Math.max(3, r * p.ring.width);
      ctx.shadowColor = p.ring.color;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    }
    if (p.edgeStroke) {
      ctx.save();
      this.pathShape(shape, cx, cy, r);
      ctx.strokeStyle = p.edgeStroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawNorth(p: ThemePalette, cx: number, cy: number, r: number, shape: FaceShape): void {
    const { ctx } = this;
    const rot = this.mapRotation(p);
    if (p.northStyle === "image") {
      const src = "/assets/overlays/north-phantasy.png";
      if (!isReady(src)) return;
      const img = getImage(src);
      const s = 26;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-toRad(rot));
      ctx.drawImage(img, -s / 2, -r + 6, s, s);
      ctx.restore();
      return;
    }
    // badge (Vice) or edge (Five/Pixel): compute N position.
    let nx: number, ny: number;
    if (shape === "circle") {
      const rel = toRad(-rot);
      nx = cx + Math.sin(rel) * (r - 16);
      ny = cy - Math.cos(rel) * (r - 16);
    } else {
      // clamp the north direction to the square edge (app's northPosition).
      const a = toRad(-rot);
      const dx = Math.sin(a);
      const dy = -Math.cos(a);
      const f = 1 / Math.max(Math.abs(dx), Math.abs(dy));
      nx = cx + dx * f * (r - 14);
      ny = cy + dy * f * (r - 14);
    }
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (p.northStyle === "badge") {
      ctx.beginPath();
      ctx.arc(nx, ny, 11, 0, Math.PI * 2);
      ctx.fillStyle = "#000";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `bold 13px ${p.font}`;
      ctx.fillText("N", nx, ny + 0.5);
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(nx - 9, ny - 9, 18, 18);
      ctx.fillStyle = "#fff";
      ctx.font = `bold 12px ${p.font}`;
      ctx.fillText("N", nx, ny + 1);
    }
    ctx.restore();
  }

  private drawPlayer(p: ThemePalette, cx: number, cy: number): void {
    const { ctx } = this;
    const rotate = p.arrowRotates ? locationManager.heading : 0;

    // Pixel: procedural blocky arrow.
    if (!p.arrow) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(toRad(rotate));
      ctx.fillStyle = p.accent2;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(8, 9);
      ctx.lineTo(0, 4);
      ctx.lineTo(-8, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (p.arrowGlow && isReady(p.arrowGlow)) {
      const glow = getImage(p.arrowGlow);
      const gs = p.arrowSize * 2.4;
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.drawImage(glow, cx - gs / 2, cy - gs / 2 - p.arrowSize * 0.5, gs, gs);
      ctx.restore();
    }
    if (!isReady(p.arrow)) return;
    const img = getImage(p.arrow);
    // Preserve aspect ratio of the arrow art.
    const aspect = img.naturalHeight / img.naturalWidth || 1;
    const w = p.arrowSize;
    const h = p.arrowSize * aspect;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(toRad(rotate));
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}
