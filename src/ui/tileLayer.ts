// A tiny slippy-map renderer: draws OpenStreetMap raster tiles onto the radar
// canvas, centred on the player, scaled so 1 metre on the map == 1 metre in the
// overlay math (so markers/orbs line up), rotated heading-up and clipped by the
// caller. Tiles come from CARTO's keyless basemaps (© OpenStreetMap © CARTO).

import { getImage, isReady } from "./imageCache.ts";
import { toRad, type Coord } from "../geo/geo.ts";

const TILE = 256;
const SUBDOMAINS = ["a", "b", "c", "d"];

export type TileStyle = "dark" | "light" | "voyager";

const STYLE_PATH: Record<TileStyle, string> = {
  dark: "dark_all",
  light: "light_all",
  voyager: "rastertiles/voyager",
};

// Web-Mercator: coordinate → fractional tile index at zoom z.
function lonToTileX(lon: number, z: number): number {
  return ((lon + 180) / 360) * 2 ** z;
}
function latToTileY(lat: number, z: number): number {
  const r = toRad(lat);
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
}
// Metres per screen pixel at the equator scaled by latitude, for a zoom level.
function metersPerTilePx(lat: number, z: number): number {
  return (156_543.033_92 * Math.cos(toRad(lat))) / 2 ** z / 1; // per tile pixel
}

export interface TileDrawOpts {
  ctx: CanvasRenderingContext2D;
  center: Coord;
  cx: number;
  cy: number;
  pxPerMeter: number; // face px per metre (must match the overlay scale)
  rotationDeg: number; // 0 for north-up
  coverPx: number; // radius from centre that must be covered
  style: TileStyle;
  filter: string; // canvas filter applied to the tiles
  pixelate?: boolean;
  retina?: boolean; // default true (@2x); false → low-res tiles for chunky look
  zoomBias?: number; // e.g. -2 for a chunkier Pixel look
}

export class TileLayer {
  // Returns true if at least one covering tile was ready (drawn).
  draw(o: TileDrawOpts): boolean {
    const { ctx, center, cx, cy, pxPerMeter, rotationDeg, coverPx, style } = o;

    // Pick the integer zoom whose native resolution is closest to ours, so
    // tiles render near 1:1 (sharp). metresPerScreenPx = 1 / pxPerMeter.
    const targetMpp = 1 / pxPerMeter;
    let z = Math.round(
      Math.log2((156_543.033_92 * Math.cos(toRad(center.lat))) / targetMpp),
    );
    z = Math.max(2, Math.min(19, z + (o.zoomBias ?? 0)));

    const mpp = metersPerTilePx(center.lat, z); // metres per tile pixel
    const s = mpp * pxPerMeter; // face px per tile pixel
    const n = 2 ** z;
    const gx = lonToTileX(center.lon, z) * TILE; // player position in global px
    const gy = latToTileY(center.lat, z) * TILE;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-toRad(rotationDeg));
    ctx.scale(s, s);
    ctx.translate(-gx, -gy);
    ctx.imageSmoothingEnabled = !o.pixelate;
    if (o.filter) ctx.filter = o.filter;

    const halfTiles = coverPx / s / TILE + 1;
    const cTileX = gx / TILE;
    const cTileY = gy / TILE;
    const minX = Math.floor(cTileX - halfTiles);
    const maxX = Math.floor(cTileX + halfTiles);
    const minY = Math.floor(cTileY - halfTiles);
    const maxY = Math.floor(cTileY + halfTiles);

    let any = false;
    for (let ty = minY; ty <= maxY; ty++) {
      if (ty < 0 || ty >= n) continue;
      for (let tx = minX; tx <= maxX; tx++) {
        const wx = ((tx % n) + n) % n; // wrap longitude
        const sub = SUBDOMAINS[(wx + ty) % SUBDOMAINS.length];
        const res = o.retina === false ? "" : "@2x";
        const url =
          `https://${sub}.basemaps.cartocdn.com/${STYLE_PATH[style]}/${z}/${wx}/${ty}${res}.png`;
        if (isReady(url)) {
          ctx.drawImage(getImage(url, true), tx * TILE, ty * TILE, TILE, TILE);
          any = true;
        } else {
          getImage(url, true); // kick off the fetch for a later frame
        }
      }
    }

    ctx.filter = "none";
    ctx.restore();
    return any;
  }
}
