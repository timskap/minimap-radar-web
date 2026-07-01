// The themed radar mini-map. No map tiles: the player sits at the centre and
// markers / mission orbs are placed by bearing + distance in a heading-up
// frame (forward = up), clamped to the rim — exactly how the watch faces
// position overlays with MapViewUtility's rotate + clamp math.

import { bearingDegrees, distanceMeters, toRad, formatDistance, type Coord } from "../geo/geo.ts";
import { locationManager } from "../state/location.ts";
import { markerStore } from "../state/markers.ts";
import { missionManager } from "../game/missionManager.ts";
import { themeManager } from "../state/themeManager.ts";
import type { ThemePalette } from "../themes/themes.ts";
import type { MissionXPPoint, OrbTier } from "../types.ts";

const RANGE_STEPS = [100, 150, 250, 400, 600, 1000, 1500]; // metres, radius of face

export class RadarFace {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rangeIndex = 2; // 250 m
  private raf = 0;
  private dpr = Math.min(window.devicePixelRatio || 1, 2);
  private size = 0;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "radar-canvas";
    this.ctx = this.canvas.getContext("2d")!;
  }

  get rangeMeters(): number {
    return RANGE_STEPS[this.rangeIndex];
  }

  zoomIn(): void {
    this.rangeIndex = Math.max(0, this.rangeIndex - 1);
  }

  zoomOut(): void {
    this.rangeIndex = Math.min(RANGE_STEPS.length - 1, this.rangeIndex + 1);
  }

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
    const loop = () => {
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
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
    const radius = size / 2 - 4;
    const scale = radius / this.rangeMeters; // px per metre
    const heading = locationManager.heading;

    // Clip everything to the round face.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    this.drawBackdrop(p, cx, cy, radius, heading);
    this.drawRings(p, cx, cy, radius);

    const loc = locationManager.location;
    if (loc) {
      this.drawMarkers(p, loc, heading, cx, cy, radius, scale);
      this.drawOrbs(p, loc, heading, cx, cy, radius, scale);
    }

    ctx.restore(); // remove clip

    this.drawFaceEdge(p, cx, cy, radius);
    this.drawNorth(p, cx, cy, radius, heading);
    this.drawPlayer(p, cx, cy);
    this.drawRangeLabel(p, cx, size, radius);

    ctx.restore();
  }

  // MARK: - Layers

  private drawBackdrop(p: ThemePalette, cx: number, cy: number, r: number, heading: number): void {
    const { ctx } = this;
    ctx.fillStyle = p.mapBg;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    switch (p.backdrop) {
      case "grid":
        this.drawGrid(p, cx, cy, r, heading, 26, false);
        break;
      case "clean":
        this.drawGrid(p, cx, cy, r, heading, 34, false);
        break;
      case "blocks":
        this.drawBlocks(p, cx, cy, r);
        break;
      case "parchment":
        this.drawParchment(p, cx, cy, r, heading);
        break;
      case "crt":
        this.drawGrid(p, cx, cy, r, heading, 30, false);
        this.drawScanlines(cx, cy, r);
        break;
    }
  }

  // A heading-up grid: lines rotate with the player so the world spins, not
  // the arrow (matching the watch's map rotation).
  private drawGrid(
    p: ThemePalette,
    cx: number,
    cy: number,
    r: number,
    heading: number,
    step: number,
    _strong: boolean,
  ): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-toRad(heading));
    ctx.strokeStyle = p.ring;
    ctx.lineWidth = 1;
    const reach = r * 1.6;
    for (let x = -reach; x <= reach; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, -reach);
      ctx.lineTo(x, reach);
      ctx.stroke();
    }
    for (let y = -reach; y <= reach; y += step) {
      ctx.beginPath();
      ctx.moveTo(-reach, y);
      ctx.lineTo(reach, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawBlocks(p: ThemePalette, cx: number, cy: number, r: number): void {
    const { ctx } = this;
    const cell = 18;
    for (let y = cy - r; y < cy + r; y += cell) {
      for (let x = cx - r; x < cx + r; x += cell) {
        const n = (Math.floor(x / cell) * 7 + Math.floor(y / cell) * 13) % 5;
        ctx.fillStyle = n === 0 ? p.water : n < 3 ? p.land : p.mapBg;
        ctx.fillRect(x, y, cell - 1, cell - 1);
      }
    }
  }

  private drawParchment(p: ThemePalette, cx: number, cy: number, _r: number, heading: number): void {
    const { ctx } = this;
    // Soft "ink" contour blobs so parchment doesn't read as empty.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-toRad(heading));
    ctx.strokeStyle = p.ring;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) {
      const rr = 22 + i * 26;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.3) {
        const wob = rr + Math.sin(a * 3 + i) * 6 + Math.cos(a * 5 - i) * 4;
        const px = Math.cos(a) * wob;
        const py = Math.sin(a) * wob;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawScanlines(cx: number, cy: number, r: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#000";
    for (let y = cy - r; y < cy + r; y += 3) {
      ctx.fillRect(cx - r, y, r * 2, 1.4);
    }
    ctx.restore();
  }

  private drawRings(p: ThemePalette, cx: number, cy: number, r: number): void {
    const { ctx } = this;
    ctx.strokeStyle = p.ring;
    ctx.lineWidth = 1;
    for (const frac of [0.33, 0.66]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * frac, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Cross-hair through centre.
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private project(
    loc: Coord,
    point: Coord,
    heading: number,
    cx: number,
    cy: number,
    radius: number,
    scale: number,
  ): { x: number; y: number; dist: number; clamped: boolean } {
    const dist = distanceMeters(loc, point);
    const rel = toRad(bearingDegrees(loc, point) - heading);
    let sx = dist * Math.sin(rel) * scale;
    let sy = -dist * Math.cos(rel) * scale;
    const rim = radius - 10;
    const mag = Math.hypot(sx, sy);
    let clamped = false;
    if (mag > rim && mag > 0) {
      const f = rim / mag;
      sx *= f;
      sy *= f;
      clamped = true;
    }
    return { x: cx + sx, y: cy + sy, dist, clamped };
  }

  private drawMarkers(
    p: ThemePalette,
    loc: Coord,
    heading: number,
    cx: number,
    cy: number,
    radius: number,
    scale: number,
  ): void {
    const { ctx } = this;
    for (const m of markerStore.markers) {
      const pr = this.project(loc, { lat: m.lat, lon: m.lon }, heading, cx, cy, radius, scale);
      const color = m.color || p.markerDefault;

      ctx.save();
      ctx.globalAlpha = pr.clamped ? 0.7 : 1;
      // dot
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.stroke();

      // icon + label just above the dot
      ctx.font = "11px " + p.font;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = p.text;
      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowBlur = 3;
      ctx.fillText(`${m.icon} ${m.name}`, pr.x, pr.y - 7);
      ctx.shadowBlur = 0;
      ctx.font = "9px " + p.font;
      ctx.fillStyle = p.textDim;
      ctx.textBaseline = "top";
      ctx.fillText(formatDistance(pr.dist), pr.x, pr.y + 7);
      ctx.restore();
    }
  }

  private orbColor(tier: OrbTier): string {
    switch (tier) {
      case "small": return "#3cc8ff";
      case "medium": return "#b06bff";
      case "large": return "#ffcf33";
    }
  }

  private drawOrbs(
    p: ThemePalette,
    loc: Coord,
    heading: number,
    cx: number,
    cy: number,
    radius: number,
    scale: number,
  ): void {
    const session = missionManager.session;
    if (!session || session.ended) return;
    const { ctx } = this;
    const nextIndex = session.nextOrderIndex;
    const t = performance.now() / 1000;
    const pulse = 1 + Math.sin(t * 4) * 0.12;

    for (const orb of session.xpPoints as MissionXPPoint[]) {
      if (orb.collected) continue;
      const pr = this.project(loc, { lat: orb.lat, lon: orb.lon }, heading, cx, cy, radius, scale);
      const isNext = nextIndex != null && orb.orderIndex === nextIndex;
      const base = orb.tier === "large" ? 6.5 : orb.tier === "medium" ? 5.5 : 4.5;
      const rad = base * (isNext ? pulse : 1);
      const color = this.orbColor(orb.tier);

      ctx.save();
      ctx.globalAlpha = pr.clamped ? 0.55 : 1;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
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

  private drawFaceEdge(p: ThemePalette, cx: number, cy: number, r: number): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = p.ringStrong;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawNorth(p: ThemePalette, cx: number, cy: number, r: number, heading: number): void {
    const { ctx } = this;
    const rel = toRad(-heading);
    const nx = cx + Math.sin(rel) * (r - 14);
    const ny = cy - Math.cos(rel) * (r - 14);
    ctx.save();
    ctx.fillStyle = p.accent;
    ctx.font = `bold 12px ${p.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("N", nx, ny);
    ctx.restore();
  }

  private drawPlayer(p: ThemePalette, cx: number, cy: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(cx, cy);
    // Arrow points up (forward) — heading-up frame.
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(7, 8);
    ctx.lineTo(0, 3);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fillStyle = p.player;
    ctx.shadowColor = p.player;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.stroke();
    ctx.restore();
  }

  private drawRangeLabel(p: ThemePalette, cx: number, size: number, radius: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = p.textDim;
    ctx.font = `10px ${p.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`◎ ${formatDistance(this.rangeMeters)}`, cx, size / 2 + radius - 6);
    ctx.restore();
  }
}
