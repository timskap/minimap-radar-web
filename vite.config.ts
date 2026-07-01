import { defineConfig } from "vite";

// Base is set for GitHub Pages friendliness; override with --base when needed.
export default defineConfig({
  base: "./",
  server: {
    host: true,
    // Geolocation + DeviceOrientation require a secure context. On desktop
    // localhost counts as secure; to test on a phone over the LAN, run
    // `vite --host` behind an HTTPS tunnel (e.g. `cloudflared` / `ngrok`).
    port: 5173,
  },
});
