# RONIN ARCADE

One website. Four games. One comic. One clan.

A fully static arcade built around the RONIN shadow-samurai — no build step, no server, no dependencies. Open `index.html` or host the folder anywhere (Netlify, GitHub Pages, any static host) and it runs.

## What's inside

| Door | Path | What it is |
|---|---|---|
| THE DUEL | `duel/` | Street-Fighter-style best-of-3 duel vs THE RIVAL — 4 slash arts, guard, spirit meter, IAI CIRCLE super |
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
