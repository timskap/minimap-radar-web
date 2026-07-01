# MiniMap Radar — Web

A browser port of the **MiniMap Radar** Apple Watch experience. It reproduces
the watch app's core loop — a themed radar mini-map centred on you, waypoint
markers, and the location-based **missions** game (orbs, XP, levels, energy,
streaks and daily/weekly/monthly challenges).

Built with **Vite + vanilla TypeScript**, no framework. The face renders a
**real OpenStreetMap** basemap (CARTO keyless raster tiles) straight onto the
radar canvas — centred on you, scaled so map metres match the overlay, rotated
heading-up and clipped to the face shape — with markers and mission orbs placed
by bearing + distance on top, exactly like the watch faces.

Each theme gives the same map its own treatment, using the **native app's own
assets and per-face layout** — player-arrow art, TV-noise/north overlays,
marker icon sets and the Gtanum / Roboto Condensed / Hylia Serif fonts, all
copied from the Xcode project into `public/assets`:

- **Vice** — dark basemap + magenta tint, circular pink-neon ring, Gtanum clock.
- **Phantasy** — sepia parchment map, vignette + north crest, hero marker.
- **Wasteland** — grayscale + Pip-Boy green + CRT noise, STAT/RADIO/TRACK.
- **Five** — grayscale GTA-style map, STATS/RADIO/TRACK.
- **Pixel** — a real map rendered chunky/nearest-neighbour, north-up, CRAFT/TRACK.

Map data © OpenStreetMap contributors, tiles © CARTO. Tiles need a network
connection; offline, the face falls back to the theme's base colour.

## The watch, in the browser

A watch-shaped shell pages vertically through four screens (dots on the right,
or swipe / `[` `]` / keys `1`–`4`):

| Page | What it is |
| --- | --- |
| **Radar** | The themed face. Player arrow at centre (heading-up), markers and mission orbs around it, radar rings, live clock, zoom, mission HUD. |
| **Markers** | Create / edit / delete waypoints with an icon + colour; live distance, nearest first. |
| **Missions** | Level ring, title, streak and energy; pick a type + difficulty and start; live mission controls; challenges with tap-to-claim **GET XP**. |
| **Theme** | The five watch faces: **Vice**, **Phantasy**, **Wasteland**, **Five**, **Pixel**. |

The mission rules (XP tiers, level curve, energy recharge, difficulty radii,
streak milestones, challenge definitions) are ported 1:1 from the native app's
`MissionConstants` / `MissionProfile`. Progress is saved to `localStorage`.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
npm run preview  # serve the build
```

Geolocation and the compass need a **secure context**. `localhost` counts as
secure on desktop; to test on a phone over your LAN, put an HTTPS tunnel
(`cloudflared`, `ngrok`, …) in front of `npm run dev -- --host`.

### No GPS? Use the simulator

On the start screen choose **Use simulator**. A D-pad appears on the radar and
the arrow keys drive a virtual player (↑ forward, ←/→ turn) so you can walk
into orbs and test missions on a desktop.

## Not (yet) ported

This build targets the watch app only. Out of scope for now: the iPhone app,
the local vector-map / PMTiles engine, AR camera mode, Apple Watch ↔ iPhone
sync, HealthKit workouts, CloudKit / Game Center, and in-app purchases (all
themes unlock for free here).

## Layout

```
src/
  geo/geo.ts            great-circle distance, bearing, destination, offset math
  game/                 missionConstants · missionProfile · missionSession · missionManager
  state/                location (GPS + compass + simulator) · markers · themeManager
  themes/themes.ts      the five face palettes
  ui/                   radarFace (canvas) · pages/* · clock · resultOverlay · shell (main.ts)
```
