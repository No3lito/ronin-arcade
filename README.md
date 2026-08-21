# RONIN ARCADE

One website. Four games. One comic. One clan.

A fully static arcade built around the RONIN shadow-samurai — no build step, no server, no dependencies. Host the folder anywhere (GitHub Pages, Netlify, any static host) and it runs.

### 👉 New to this? Read [START-HERE.md](START-HERE.md) first
It walks you from zero to a live site you control, with no experience assumed. Experienced devs: [HANDOFF.md](HANDOFF.md) has the architecture.

**Heads up:** don't just double-click `index.html` — the games load code as ES modules, which browsers block over `file://`. Serve the folder instead (`npx serve .`, VS Code's Live Server, or GitHub Pages). START-HERE explains all three.

## What's inside

| Door | Path | What it is |
|---|---|---|
| THE SWARM | `swarm/` | Horde survivor — auto-swinging blade, 10 stacking timed powers, a WARLORD boss every 600 kills |
| BLADE DASH | `run/` | Endless forest run-dash — jump, double-jump, dash through sealed barriers, distance score |
| THE SHIFTING VALLEY | `adventure/` | Zelda-style flip-screen quest across 15 lands whose paths reshuffle every 30 seconds |
| THE FORGE | `forge/` | Layered character builder — body, garb, armor, weapons, hair, masks, headwear, full color dyes, SNAP to PNG |
| THE FIRST BLOOD | `comic/` | The full RONIN story — 14 pages, woodblock style. The scroll on the stones opens it |

`shared/` holds the sprite loader used by all games. All art was generated for this project; sprite strips are chroma-keyed at load time.

## The story

One clan, one castle, two daimyō. The clan stayed loyal to the very end — and the daimyō rode out with the treasury and never looked back. What was left in the dust became RONIN: masterless, but never brotherless. The comic tells it in full.

## Hosting

Everything is relative-path and iframe-safe. Drop the folder on any static host:

```bash
npx serve .
```

浪人 — a masterless blade bows to no one.
