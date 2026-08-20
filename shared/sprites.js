// Shared sprite kit for RONIN ARCADE — slim loader for the canon character
// strips. Each game asks only for the strips it needs.
import { CDN_MAP } from './cdn.js';

export function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => {
      // local file missing → permanent fal.media CDN copy (CORS-open)
      const bare = src.replace(/^\.\.\//, '');
      const url = CDN_MAP[bare] || CDN_MAP[src];
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

async function greenKey(cnv, tick) {
  const g = cnv.getContext('2d');
  const id = g.getImageData(0, 0, cnv.width, cnv.height);
  const d = id.data, W = cnv.width, H = cnv.height;
  const band = Math.max(1, Math.floor(400000 / W));
  for (let y0 = 0; y0 < H; y0 += band) {
    const end = Math.min(H, y0 + band) * W * 4;
    for (let i = y0 * W * 4; i < end; i += 4) {
      const r = d[i], gr = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, b);
      if (gr > 70 && gr > r * 1.28 && gr > b * 1.28) d[i + 3] = 0;
      else if (gr > mx) {
        d[i + 1] = mx;
        if (gr > mx * 1.12 && gr > 55) d[i + 3] = Math.min(d[i + 3], 140);
      }
    }
    if (tick) tick();
    await new Promise((r2) => setTimeout(r2, 0));
  }
  g.putImageData(id, 0, 0);
  return cnv;
}

async function whiteKey(cnv, tick) {
  const g = cnv.getContext('2d');
  const id = g.getImageData(0, 0, cnv.width, cnv.height);
  const d = id.data, W = cnv.width, H = cnv.height;
  const band = Math.max(1, Math.floor(400000 / W));
  for (let y0 = 0; y0 < H; y0 += band) {
    const end = Math.min(H, y0 + band) * W * 4;
    for (let i = y0 * W * 4; i < end; i += 4) {
      const mn = Math.min(d[i], d[i + 1], d[i + 2]);
      if (mn > 236) d[i + 3] = 0;
      else if (mn > 210) d[i + 3] = Math.round(d[i + 3] * (236 - mn) / 26);
    }
    if (tick) tick();
    await new Promise((r2) => setTimeout(r2, 0));
  }
  g.putImageData(id, 0, 0);
  return cnv;
}

async function shadowGrade(cnv, tick) {
  const g = cnv.getContext('2d');
  const id = g.getImageData(0, 0, cnv.width, cnv.height);
  const d = id.data, W = cnv.width, H = cnv.height;
  const band = Math.max(1, Math.floor(400000 / W));
  for (let y0 = 0; y0 < H; y0 += band) {
    const end = Math.min(H, y0 + band) * W * 4;
    for (let i = y0 * W * 4; i < end; i += 4) {
      if (d[i + 3] === 0) continue;
      d[i] *= 0.72; d[i + 1] *= 0.74; d[i + 2] *= 0.80;
    }
    if (tick) tick();
    await new Promise((r2) => setTimeout(r2, 0));
  }
  g.putImageData(id, 0, 0);
  return cnv;
}

function hasAlpha(cnv) {
  const g = cnv.getContext('2d');
  const pts = [[1, 1], [cnv.width - 2, 1], [1, cnv.height - 2], [cnv.width - 2, cnv.height - 2]];
  return pts.some(([x, y]) => g.getImageData(x, y, 1, 1).data[3] < 200);
}

export function grid2D(cnv, cols, rows) {
  const cw = Math.floor(cnv.width / cols), ch = Math.floor(cnv.height / rows);
  const out = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out.push({ src: cnv, sx: c * cw, sy: r * ch, sw: cw, sh: ch });
  return out;
}

// spec: { key: { src, cols, rows, grade } } → { key: frameDesc[] }
export async function loadStrips(spec, onProgress) {
  const keys = Object.keys(spec);
  const out = {};
  let done = 0;
  await Promise.all(keys.map(async (k) => {
    const s = spec[k];
    const img = await loadImage(s.src);
    if (!s.cols) { out[k] = img; done++; if (onProgress) onProgress(done / keys.length); return; }
    let c = toCanvas(img);
    if (!hasAlpha(c)) {
      const px = c.getContext('2d').getImageData(2, 2, 1, 1).data;
      c = (px[1] > 90 && px[1] > px[0] * 1.3 && px[1] > px[2] * 1.3)
        ? await greenKey(c) : await whiteKey(c);
    }
    if (s.grade) c = await shadowGrade(c);
    out[k] = grid2D(c, s.cols, s.rows);
    done++; if (onProgress) onProgress(done / keys.length);
  }));
  return out;
}

// Draw a frame descriptor with feet anchored at (x, y), scaled to height h.
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

export function frameOf(strips, idx) {
  return strips[Math.max(0, Math.min(strips.length - 1, Math.floor(idx)))];
}
