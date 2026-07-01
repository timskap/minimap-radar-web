# MiniMap Radar — Web

A browser port of the **MiniMap Radar** Apple Watch experience. It reproduces
the watch app's core loop — a themed radar mini-map centred on you, waypoint
markers, and the location-based **missions** game (orbs, XP, levels, energy,
streaks and daily/weekly/monthly challenges).

Built with **Vite + vanilla TypeScript**, no framework and **no map tiles**:
like the watch faces, the radar places markers and orbs by bearing + distance
around the player rather than drawing streets, so it runs anywhere with just
GPS + compass.

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
