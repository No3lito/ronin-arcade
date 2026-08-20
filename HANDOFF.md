# RONIN ARCADE — Developer Handoff

Everything you need to run, modify, and extend this project. Last updated 2026-08-20.

## The short version

- **Live site**: https://ronin-arcade.netlify.app
- **This repo is the entire site.** Pure static files — no build step, no framework, no server, no package.json. `index.html` at the root is the hub; every game is a folder. Host it anywhere that serves static files.
- Run locally: `npx serve .` (or any static server). Open the served URL.

## Structure

```
index.html        the hub — blood-moon menu, banner doors, the scroll
assets/           hub art (hub.png), title lettering, the comic scroll icon
duel/             THE DUEL — 1v1 fighter (best-of-3 vs THE RIVAL)
run/              BLADE DASH — endless forest runner
adventure/        THE SHIFTING VALLEY — Zelda-style flip-screen quest
forge/            THE FORGE — layered character builder
comic/            THE FIRST BLOOD — the 14-page story reader
shared/           sprites.js (strip loader + chroma keyer) and cdn.js (fallback URLs)
```

Every game is self-contained: one `index.html` + `js/` + `assets/`. All paths are relative, so the site is iframe-safe and can be embedded on another domain.

## How the rendering works (the one thing to understand)

All character art is **sprite strips**: grids of animation frames in a single webp
(e.g. 8 columns x 6 rows = 48 frames, each cell 532x300 in the duel, 266x300 in the
runner). Strips are stored on a chroma-green or transparent background;
`shared/sprites.js` keys the green out at load time in a canvas, so games just draw
frame rectangles. `shared/cdn.js` maps every strip filename to a permanent fal.media
URL — if a local file 404s, the loader falls back to the CDN copy automatically.

**THE FORGE** works differently: every wardrobe piece (body, garb, armor, weapon,
hair, mask, hat) is a full-canvas 768x1376 layer generated over the same fixed pose,
so layers stack 1:1 with zero alignment code. `forge/js/forge.js` holds the catalog
(what exists per gender), the layer stack order, and the dye formulas (per-layer
luminance recolor — each color option touches only its own layer). Weapons carried on
the back are drawn *before* the body (`WEAPON_BEHIND` set); the bow also pushes a
`-back` quiver layer behind the body.

## The story canon (for any new content)

One community held two tokens — in the story: **one castle, two daimyō**. The clan
stayed loyal to the very end; the daimyō rode out with the treasury and never looked
back. The abandoned community became **RONIN** — masterless, but the clan was always
them. One crimson banner stitched from the two dead ones. From the betrayal onward,
every scene is lit by a **full blood moon** (gold crescent before it). Token names
never appear in the art or captions — the allegory carries it. The comic
(`comic/index.html`) is the reference telling of this story.

## Art pipeline (how every asset here was made)

Images: **fal.ai nano-banana-pro** (`/edit` with reference images for anything that
must match the canon character or an existing composition). Every layer/sprite prompt
ends with "everything else flat solid chroma green (#00FF00)". Style anchors:
- Games/hub: "dark gothic anime, near-black palette, blood-red accents"
- Comic: "Japanese woodblock ukiyo-e, washi paper texture, deep indigo night, blood
  moon, dark silhouettes, single crimson accent, no text"

Animations: **fal.ai seedance i2v** (image-to-video) from a still of the character on
solid green — 5s, 720p, "strict right-facing profile, camera locked, background stays
flat chroma green". Then ffmpeg: sample N frames evenly (`fps=N/5`), scale to 300px
cell height, `colorkey=0x27FE16:0.28:0.06,despill`, `tile=8xR` into a strip.

Hard-won rules:
- Generated layers often bake the body/head/outfit in invisibly. Always audit a new
  layer by compositing it and checking zones that should be empty; fix by
  regenerating "ONLY the item, floating, NO body, not even a faint outline".
- The i2v master image must be composited on solid green — a transparent master makes
  the model invent a background.
- Generators letterbox with green bars sometimes; crop the scene band before keying.
- For scale/position problems, don't re-roll: crop → scale → overlay deterministically
  (ffmpeg), it is exact and free.

## Deploying

The live site deploys to Netlify (site name `ronin-arcade`). Any method works —
drag-and-drop the repo folder in the Netlify UI, `netlify deploy --prod --dir .`, or
connect this repo in the Netlify dashboard for auto-deploys on push. There is no
build command; publish directory is the repo root.

## Game notes for whoever continues

- **DUEL** (`duel/js/game.js`): attack data lives in `P_ATK` / `R_ATK` — frame
  windows (`from/hitA/hitB/last`), damage, ranges. Hit windows are tuned to the
  current strips' contact frames; if you swap animation strips, retune those numbers.
  `assets.js` documents which strip file is which move.
- **BLADE DASH** (`run/js/game.js`): course generation in `genAhead` (difficulty
  ramps by distance), environment art in `run/assets/env-*.webp`, obstacles use
  sprite art with a pulsing red glow so they read as dangers. The hero sprite sinks
  `168*0.062` px so his feet meet the ground (the frames carry padding).
- **FORGE** (`forge/js/forge.js`): to add a wardrobe piece, generate the layer over
  the anchor pose, drop the webp in `forge/assets/`, and add one catalog entry. The
  dye system needs no changes — it recolors whatever the layer contains.
- **VALLEY** (`adventure/js/game.js`): tile-based; paths reshuffle every 30s; door
  corridors are auto-sanitized so exits are never blocked (keep that rule).
- **COMIC** (`comic/index.html`): pages are plain `<img>` + caption blocks. To add
  an episode, generate pages in the woodblock style above, drop them in
  `comic/assets/`, and copy the page markup.

## Backlog the buyer knows about

- More FORGE hair styles (some were removed at the buyer's request; more can be
  generated with the same layer pipeline).
- Warrior poses in the FORGE (would need a full layer set per pose — big job).
- Episode V of the comic, when the next story video exists.

浪人 — a masterless blade bows to no one.
