# mesh-light-paint

[![Live](https://img.shields.io/badge/live-baditaflorin.github.io%2Fmesh--light--paint-FF8A4A?style=flat-square)](https://baditaflorin.github.io/mesh-light-paint/)
[![Version](https://img.shields.io/github/package-json/v/baditaflorin/mesh-light-paint?style=flat-square&color=FF8A4A)](https://github.com/baditaflorin/mesh-light-paint/blob/main/package.json)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![No backend](https://img.shields.io/badge/backend-none-050505?style=flat-square)](docs/adr/0001-deployment-mode.md)

> Synchronized phone-screen light painting. Wave the phones in front of a long-exposure camera and the patterns line up coherently in the photo.

**Live:** https://baditaflorin.github.io/mesh-light-paint/

Open the link on every phone. Pick a pattern (stripes / gradient / dots /
spiral). Set up a long exposure on your real camera (tripod, 4–10 s, bulb or
night mode). Wave the phones across the frame. Because every pattern is a
pure function of mesh time, the trails align: four phones running "stripes"
at the same speed produce a single continuous moving wave across the photo
rather than four desynced ones.

## How it works

1. Each phone joins a shared **Yjs document** over **y-webrtc**.
2. **Mesh time** comes from the same median-offset clock-sync used in
   `mesh-firefly-walk` (see ADR there). Settles to ~20 ms across a 4-phone
   mesh.
3. The renderer calls `drawPattern(id, { ctx, w, h, t, hue, speed, offset })`
   every frame. `t = meshNow()`. No state.
4. Per-phone `offset` shifts the same pattern in phase, so multiple phones
   don't show identical patterns — they show **complementary** ones.

See [ADR 0002 — Pattern functions are pure of mesh-time](docs/adr/0002-pure-mesh-time-patterns.md)
and [ADR 0003 — Why no in-browser long-exposure](docs/adr/0003-no-in-browser-long-exposure.md).

## Privacy threat model

See [docs/privacy.md](docs/privacy.md). The only payload is your brush
settings + clock samples + your `clientID`.

## Architecture

- **Mode A** — pure GitHub Pages.
- **WebRTC** — Yjs + y-webrtc with self-hosted signaling and TURN.
- **Patterns** — Canvas2D, pure of mesh time.

## Run it locally

```bash
git clone https://github.com/baditaflorin/mesh-light-paint.git
cd mesh-light-paint
npm install
npm run dev
```

## Self-hosted infrastructure

| Repo                                                                   | Endpoint                               | Role                      |
| ---------------------------------------------------------------------- | -------------------------------------- | ------------------------- |
| [signaling-server](https://github.com/baditaflorin/signaling-server)   | `wss://turn.0docker.com/ws`            | y-webrtc protocol fan-out |
| [turn-token-server](https://github.com/baditaflorin/turn-token-server) | `https://turn.0docker.com/credentials` | HMAC TURN creds           |
| [coturn-hetzner](https://github.com/baditaflorin/coturn-hetzner)       | `turn:turn.0docker.com:3479`           | TURN relay                |

## Settings

- **Room ID**
- **Pattern** — stripes / gradient / dots / spiral
- **Hue** — 0–359°
- **Speed** — 0–3× animation rate
- **Offset** — 0–1 per-phone phase shift

## ADRs

- [0001 — Deployment mode](docs/adr/0001-deployment-mode.md)
- [0002 — Pattern functions are pure of mesh-time](docs/adr/0002-pure-mesh-time-patterns.md)
- [0003 — Why no in-browser long-exposure](docs/adr/0003-no-in-browser-long-exposure.md)
- [0010 — GitHub Pages publishing](docs/adr/0010-pages-publishing.md)

## License

[MIT](LICENSE) © 2026 Florin Badita
