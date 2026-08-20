// v2 asset loader — arena painting, transparent character strips, white-bg stills.
import { CDN_MAP } from './cdn.js';

export const A = { arena: null, ronin: {}, dummy: null, ready: false };

function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    // CDN fallback: the host's upload path drops binaries, so every runtime
    // image also lives at a permanent fal.media URL (CORS-open, canvas-safe).
    i.onerror = () => {
      const url = CDN_MAP[src];
      if (!url) return rej(new Error('failed: ' + src));
      const j = new Image();
      j.crossOrigin = 'anonymous';
      j.onload = () => res(j);
      j.onerror = () => rej(new Error('cdn failed: ' + src));
      j.src = url;
    };
    i.src = src;
  });
}

function toCanvas(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c;
}

// Remove a near-white studio background (for white-bg stills like the mannequin).
async function whiteKey(cnv, onTick) {
  const g = cnv.getContext('2d');
  const id = g.getImageData(0, 0, cnv.width, cnv.height);
  const d = id.data;
  const W = cnv.width, H = cnv.height;
  const band = Math.max(1, Math.floor(400000 / W));
  for (let y0 = 0; y0 < H; y0 += band) {
    const end = Math.min(H, y0 + band) * W * 4;
    for (let i = y0 * W * 4; i < end; i += 4) {
      const r = d[i], gr = d[i + 1], b = d[i + 2];
      const mn = Math.min(r, gr, b);
      if (mn > 236) d[i + 3] = 0;
      else if (mn > 210) d[i + 3] = Math.round(d[i + 3] * (236 - mn) / 26);
    }
    if (onTick) onTick();
    await new Promise((res) => setTimeout(res, 0));
  }
  g.putImageData(id, 0, 0);
  return cnv;
}

// Remove a chroma-green background — aggressive edge cleanup so no green
// outline survives. Async in row-chunks so the page never freezes.
async function greenKey(cnv, onTick) {
  const g = cnv.getContext('2d');
  const id = g.getImageData(0, 0, cnv.width, cnv.height);
  const d = id.data;
  const W = cnv.width, H = cnv.height;
  const band = Math.max(1, Math.floor(400000 / W)); // ~400k px per tick
  for (let y0 = 0; y0 < H; y0 += band) {
    const end = Math.min(H, y0 + band) * W * 4;
    for (let i = y0 * W * 4; i < end; i += 4) {
      const r = d[i], gr = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, b);
      if (gr > 70 && gr > r * 1.28 && gr > b * 1.28) {
        d[i + 3] = 0;                       // wider kill: catches halo pixels
      } else if (gr > mx) {
        d[i + 1] = mx;                      // full despill: no green tint anywhere
        if (gr > mx * 1.12 && gr > 55) d[i + 3] = Math.min(d[i + 3], 140); // soften blend edge
      }
    }
    if (onTick) onTick();
    await new Promise((res) => setTimeout(res, 0));
  }
  g.putImageData(id, 0, 0);
  return cnv;
}

// Shadow grade — sink the character deeper into black. Multiplies every
// opaque pixel toward a cool near-black so he reads as part of the dark.
async function shadowGrade(cnv, onTick) {
  const g = cnv.getContext('2d');
  const id = g.getImageData(0, 0, cnv.width, cnv.height);
  const d = id.data;
  const W = cnv.width, H = cnv.height;
  const band = Math.max(1, Math.floor(400000 / W));
  for (let y0 = 0; y0 < H; y0 += band) {
    const end = Math.min(H, y0 + band) * W * 4;
    for (let i = y0 * W * 4; i < end; i += 4) {
      if (d[i + 3] === 0) continue;
      d[i] = d[i] * 0.72;              // cool bias: red sinks hardest,
      d[i + 1] = d[i + 1] * 0.74;      // blue survives a touch — cold shadow
      d[i + 2] = d[i + 2] * 0.80;
    }
    if (onTick) onTick();
    await new Promise((res) => setTimeout(res, 0));
  }
  g.putImageData(id, 0, 0);
  return cnv;
}

// Does the image already carry transparency? Sample the corners.
function hasAlpha(cnv) {
  const g = cnv.getContext('2d');
  const pts = [[1, 1], [cnv.width - 2, 1], [1, cnv.height - 2], [cnv.width - 2, cnv.height - 2]];
  return pts.some(([x, y]) => g.getImageData(x, y, 1, 1).data[3] < 200);
}

// Split a horizontal strip into frames at fully-transparent column gaps, trim each.
function segment(cnv, minGap = 6) {
  const W = cnv.width, H = cnv.height;
  const d = cnv.getContext('2d').getImageData(0, 0, W, H).data;
  const colHas = new Uint8Array(W);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y += 2) {
      if (d[(y * W + x) * 4 + 3] > 30) { colHas[x] = 1; break; }
    }
  }
  const frames = [];
  let sx = -1;
  for (let x = 0; x <= W; x++) {
    const on = x < W && colHas[x];
    if (on && sx < 0) sx = x;
    if (!on && sx >= 0) {
      let gap = 0;
      while (x + gap < W && !colHas[x + gap]) gap++;
      if (gap >= minGap || x >= W) {
        if (x - sx > 24) frames.push(trim(cnv, sx, x));
        sx = -1; x += gap;
      }
    }
  }
  return frames;
}

// Slice into n equal FULL-HEIGHT cells (strips share one baseline; keeping the
// full cell height keeps character scale and foot placement identical across
// every frame — no per-frame shrinking).
function gridSlice(cnv, n) {
  const W = cnv.width, H = cnv.height;
  const out = [];
  for (let i = 0; i < n; i++) {
    const x0 = Math.round(W * i / n), x1 = Math.round(W * (i + 1) / n);
    const c = document.createElement('canvas');
    c.width = x1 - x0; c.height = H;
    c.getContext('2d').drawImage(cnv, x0, 0, x1 - x0, H, 0, 0, x1 - x0, H);
    out.push(c);
  }
  return out;
}

function sliceStrip(cnv, expected) {
  if (expected === 1) return [trim(cnv, 0, cnv.width)];
  return gridSlice(cnv, expected); // uniform cells beat gap-detection for animation
}

// Uniform 2D grid (cols x rows) as ZERO-COPY frame descriptors into the strip
// canvas — one canvas per strip instead of dozens of copies. This keeps total
// canvas memory low enough for mobile Safari.
function grid2D(cnv, cols, rows) {
  const cw = Math.floor(cnv.width / cols), ch = Math.floor(cnv.height / rows);
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({ src: cnv, sx: c * cw, sy: r * ch, sw: cw, sh: ch });
    }
  }
  return out;
}

function asDesc(cnv) {
  return { src: cnv, sx: 0, sy: 0, sw: cnv.width, sh: cnv.height };
}

function trim(cnv, x0, x1) {
  const H = cnv.height;
  const d = cnv.getContext('2d').getImageData(x0, 0, x1 - x0, H).data;
  const w = x1 - x0;
  let top = H, bot = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 30) { if (y < top) top = y; if (y > bot) bot = y; break; }
    }
  }
  const fh = Math.max(1, bot - top + 1);
  const out = document.createElement('canvas');
  out.width = w; out.height = fh;
  out.getContext('2d').drawImage(cnv, x0, top, w, fh, 0, 0, w, fh);
  return out;
}

export async function loadAssets(onProgress) {
  let ticks = 0;
  const TOTAL_TICKS = 330; // rough total processing chunks across all strips + shadow grade
  const tick = () => { ticks++; if (onProgress) onProgress(Math.min(0.99, ticks / TOTAL_TICKS)); };
  // NOTE: strips are served at legacy CDN paths (Netlify incident drops NEW
  // paths but accepts new content at existing ones). Mapping:
  //   ronin-idle.webp        = living iai stance (8x4)
  //   ronin-slash-v2.webp    = art0 Moon Cut (8x6)
  //   player-jump-anim.webp  = art1 Rising Dragon (8x6)
  //   player-hurt-anim.webp  = art2 Executioner (8x6)
  //   player-special.webp    = art3 Iai Circle (8x6)
  //   ronin-run-v2.webp      = stalk cycle (8x3)
  //   oni-poses.webp         = training mannequin still
  const [arena, stance, a0, a1, a2, a3, dummy] = await Promise.all([
    loadImage('assets/runtime/arena-blood-moon.webp'),
    loadImage('assets/runtime/ronin-idle.webp'),
    loadImage('assets/runtime/ronin-slash-v2.webp'),
    loadImage('assets/runtime/player-jump-anim.webp'),
    loadImage('assets/runtime/player-hurt-anim.webp'),
    loadImage('assets/runtime/player-special.webp'),
    loadImage('assets/runtime/oni-poses.webp'),
  ]);
  A.arena = arena;

  const prep = async (img) => {
    const c = toCanvas(img);
    if (hasAlpha(c)) return c;
    // pick the key by the corner color: chroma green vs studio white
    const px = c.getContext('2d').getImageData(2, 2, 1, 1).data;
    return (px[1] > 90 && px[1] > px[0] * 1.3 && px[1] > px[2] * 1.3)
      ? await greenKey(c, tick) : await whiteKey(c, tick);
  };
  // THE character — every frame derived from the buyer's reference image,
  // then graded down into shadow
  const prepC = async (img) => shadowGrade(await prep(img), tick);
  A.ronin.stance = grid2D(await prepC(stance), 8, 4);  // 32-frame living stance
  A.ronin.arts = [
    grid2D(await prepC(a0), 8, 6),                     // Moon Cut lunging crescent
    grid2D(await prepC(a1), 8, 6),                     // Rising Dragon upward tear
    grid2D(await prepC(a2), 8, 6),                     // Executioner overhead drop
    grid2D(await prepC(a3), 8, 6),                     // Iai full-spin circle
  ];
  A.ronin.run = null; // stalking movement strip
  try {
    const runImg = await loadImage('assets/runtime/ronin-run-v2.webp');
    A.ronin.run = grid2D(await prepC(runImg), 8, 3);   // 24-frame stalk cycle
  } catch { /* not packed yet — stance-lean fallback */ }
  A.ronin.hurt = null; // stagger + collapse strip (hit reactions and KO)
  try {
    const hurtImg = await loadImage('assets/runtime/ronin-hurt.webp');
    A.ronin.hurt = grid2D(await prepC(hurtImg), 8, 6);
  } catch { /* stance-frame fallback */ }
  A.ronin.guard = null; // deflecting guard loop
  try {
    const gImg = await loadImage('assets/runtime/ronin-guard.webp');
    A.ronin.guard = grid2D(await prepC(gImg), 8, 4);
  } catch { /* stance-frame fallback */ }
  A.ronin.victory = null; // chiburi + sheathing ritual for won rounds
  try {
    const vImg = await loadImage('assets/runtime/ronin-victory.webp');
    A.ronin.victory = grid2D(await prepC(vImg), 8, 4);
  } catch { /* stance fallback */ }
  // SHADOW UNLEASHED — dual-odachi strips swapped in during the powerup
  A.ronin.dual = null;
  try {
    const [di, dr, d0, d1, d2, d3] = await Promise.all([
      loadImage('assets/runtime/dual-idle.webp'),
      loadImage('assets/runtime/dual-run.webp'),
      loadImage('assets/runtime/dual-art0.webp'),
      loadImage('assets/runtime/dual-art1.webp'),
      loadImage('assets/runtime/dual-art2.webp'),
      loadImage('assets/runtime/dual-art3.webp'),
    ]);
    A.ronin.dual = {
      stance: grid2D(await prepC(di), 8, 4),
      run: grid2D(await prepC(dr), 8, 3),
      arts: [
        grid2D(await prepC(d0), 8, 6), grid2D(await prepC(d1), 8, 6),
        grid2D(await prepC(d2), 8, 6), grid2D(await prepC(d3), 8, 6),
      ],
    };
  } catch { /* powerup art optional — game runs single-blade without it */ }
  A.dummy = asDesc(sliceStrip(await prep(dummy), 1)[0]);
  // the rite transformation: kasa + menpo + sign, held (no shadow grade —
  // the art carries its own darkness and the burning eyes must stay lit)
  A.ronin.rite = null;
  try {
    const riteImg = await loadImage('assets/runtime/rite-sign.webp');
    A.ronin.rite = grid2D(await prep(riteImg), 8, 4);
  } catch { /* painted regalia fallback in legion.js */ }
  // THE RIVAL — duel opponent (rust identity, no shadow grade)
  A.rival = null;
  try {
    const [ri, rr, r0, r1, r2, rh] = await Promise.all([
      loadImage('assets/runtime/rival-idle.webp'),
      loadImage('assets/runtime/rival-run.webp'),
      loadImage('assets/runtime/rival-atk0.webp'),
      loadImage('assets/runtime/rival-atk1.webp'),
      loadImage('assets/runtime/rival-atk2.webp'),
      loadImage('assets/runtime/rival-hurt.webp'),
    ]);
    A.rival = {
      stance: grid2D(await prep(ri), 8, 4),
      run: grid2D(await prep(rr), 8, 3),
      atk: [grid2D(await prep(r0), 8, 6), grid2D(await prep(r1), 8, 6), grid2D(await prep(r2), 8, 6)],
      hurt: grid2D(await prep(rh), 8, 6),
    };
  } catch { /* duel locked until rival strips are present */ }
  // Shadow Legion — half-res pure-black silhouette copies of the character
  // strips, used as the summoned warriors. Half resolution: solid shapes.
  const silhouette = (src, cols, rows) => {
    const c = document.createElement('canvas');
    c.width = Math.floor(src.width / 2); c.height = Math.floor(src.height / 2);
    const g2 = c.getContext('2d');
    g2.drawImage(src, 0, 0, c.width, c.height);
    g2.globalCompositeOperation = 'source-in';
    g2.fillStyle = '#221634';           // deep violet — reads against the black
    g2.fillRect(0, 0, c.width, c.height);
    return grid2D(c, cols, rows);
  };
  A.ronin.shadowArts = A.ronin.arts.map((strip) => silhouette(strip[0].src, 8, 6));
  A.ronin.shadowStance = silhouette(A.ronin.stance[0].src, 8, 4);
  A.ronin.shadowRun = A.ronin.run ? silhouette(A.ronin.run[0].src, 8, 3) : null;
  A.ready = true;
  if (onProgress) onProgress(1);
}

// Draw a frame descriptor with feet anchored at (x, y), scaled to height h.
// flip mirrors horizontally; rot pivots around the feet.
export function drawSprite(g, frame, x, y, h, flip, alpha = 1, rot = 0, sx = 1, sy = 1) {
  if (!frame) return;
  const w = h * (frame.sw / frame.sh);
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x, y);
  if (flip) g.scale(-1, 1);
  if (rot) g.rotate(rot);
  if (sx !== 1 || sy !== 1) g.scale(sx, sy);
  g.drawImage(frame.src, frame.sx, frame.sy, frame.sw, frame.sh, -w / 2, -h, w, h);
  g.restore();
}
