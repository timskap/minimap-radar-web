// Loads and caches images for the canvas radar (skins, arrows, overlays,
// marker icons). Returns an HTMLImageElement immediately; the draw loop simply
// skips anything not decoded yet and picks it up on a later frame.

const cache = new Map<string, HTMLImageElement>();

export function getImage(src: string): HTMLImageElement {
  let img = cache.get(src);
  if (!img) {
    img = new Image();
    img.decoding = "async";
    img.src = src;
    cache.set(src, img);
  }
  return img;
}

export function isReady(src: string): boolean {
  const img = cache.get(src);
  return !!img && img.complete && img.naturalWidth > 0;
}

// Kick off decoding ahead of time (e.g. all theme skins/arrows at boot).
export function preload(srcs: string[]): void {
  for (const s of srcs) getImage(s);
}
