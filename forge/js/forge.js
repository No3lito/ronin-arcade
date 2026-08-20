// THE FORGE — character builder for RONIN ARCADE.
// Every layer is generated over the same anchor pose, so layers stack 1:1.
import { loadImage } from '../../shared/sprites.js';

const cv = document.getElementById('view');
const g = cv.getContext('2d');
const W = cv.width, H = cv.height;

/* ------------------------------ catalog ---------------------------- */
const HAIR_LABELS = {
  hair1: 'PONYTAIL', hair2: 'LONG', hair4: 'BOB', hair6: 'WILD',
  hair7: 'TWIN TAILS', hair8: 'UNDERCUT', hair9: 'MOHAWK', hair10: 'MESSY',
  hair11: 'CURLS', hair12: 'HIME', hair13: 'HALF-UP', hair14: 'BUZZ',
  hair15: 'TWIN BUNS', hair16: 'WAR TAIL', hair17: 'SHAG', hair18: 'WAR BRAID',
  hair19: 'HIGH BUN', hair21: 'FAUXHAWK',
};
// only styles whose layers exist per gender — male list is masculine-only
const HAIR_AVAIL = {
  m: ['hair1', 'hair3', 'hair5', 'hair8', 'hair9', 'hair10', 'hair11', 'hair16', 'hair17', 'hair21'],
  f: ['hair1', 'hair2', 'hair4', 'hair5', 'hair6', 'hair9', 'hair10', 'hair13', 'hair15'],
};
function hairList(gp) {
  const list = [{ id: null, label: 'NONE' }];
  for (const k of HAIR_AVAIL[gp]) {
    let label = HAIR_LABELS[k];
    if (k === 'hair3') label = gp === 'm' ? 'TOPKNOT' : 'UPDO';
    if (k === 'hair5') label = gp === 'm' ? 'SPIKES' : 'BRAID';
    if (k === 'hair14') label = gp === 'm' ? 'BUZZ' : 'PIXIE';
    list.push({ id: gp + '-' + k, label });
  }
  return list;
}
function mk(gp) {
  return {
    label: gp === 'm' ? 'RONIN (M)' : 'RONIN (F)',
    body: gp + '-body',
    garbs: [
      { id: null, label: 'NONE' },
      { id: gp + '-garb1', label: 'SHADOW ROBE' },
      { id: gp + '-garb2', label: 'KIMONO' },
      { id: gp + '-garb3', label: 'SHINOBI' },
      { id: gp + '-garb4', label: 'CYBERPUNK' },
      { id: gp + '-garb5', label: 'WANDERER' },
    ],
    armors: [
      { id: null, label: 'NONE' },
      { id: gp + '-armor1', label: 'WAR SET' },
      { id: gp + '-armor2', label: 'RAIDER' },
      // per Noel: male keeps GUARDS (no ROYAL), female keeps ROYAL (no GUARDS)
      ...(gp === 'm'
        ? [{ id: 'm-armor3', label: 'GUARDS' }]
        : [{ id: 'f-armor4', label: 'ROYAL' }]),
    ],
    hair: hairList(gp),
    hats: [
      { id: null, label: 'NONE' },
      { id: gp + '-hat1', label: 'KASA' },
      { id: gp + '-hat2', label: 'SANDOGASA' },
    ],
    masks: [
      { id: null, label: 'NONE' },
      { id: gp + '-mask1', label: 'MENPŌ' },
      { id: gp + '-mask2', label: 'ONI' },
      { id: gp + '-mask3', label: 'KITSUNE' },
      { id: gp + '-mask4', label: 'HANNYA' },
      { id: gp + '-mask5', label: 'TENGU' },
    ],
    weapons: [
      { id: null, label: 'NONE' },
      { id: gp + '-weap1', label: 'KATANA' },
      { id: gp + '-weap2', label: 'ODACHI' },
      ...(gp === 'f' ? [{ id: 'f-weap3', label: 'TWIN BLADES' }] : []),
      { id: gp + '-weap4', label: 'NAGINATA' },
      { id: gp + '-weap5', label: 'YARI' },
      { id: gp + '-weap6', label: 'BOW' },
      { id: gp + '-weap7', label: 'KANABŌ' },
      { id: gp + '-weap8', label: 'KUSARIGAMA' },
      ...(gp === 'm' ? [{ id: 'm-weap9', label: 'WAR FANS' }] : []),
      ...(gp === 'f' ? [{ id: 'f-weap10', label: 'CYBER-KATANA' }] : []),
    ],
  };
}
const CAT = { m: mk('m'), f: mk('f') };
// weapons carried on the back / resting behind the arm render behind the body
const WEAPON_BEHIND = new Set(['weap2', 'weap3', 'weap4', 'weap5', 'weap7']);
const WEAPON_BACK = new Set(['weap6']);
const COLORS = [
  { h: null, css: '#1a1418', label: 'original' },
  { h: 0,   css: '#7a1515' }, { h: 22,  css: '#8a4a18' }, { h: 40,  css: '#a8842a' },
  { h: 90,  css: '#3a6a2a' }, { h: 160, css: '#1f6a5a' }, { h: 210, css: '#2a4a8a' },
  { h: 265, css: '#5a2a8a' }, { h: 305, css: '#8a2a6a' }, { h: -1,  css: '#c8c8d0', label: 'silver' },
];
// skin tones: base color at full light; shading follows the art's luminance
const SKINS = [
  { rgb: null, css: '#c9a68f', label: 'original' },
  { rgb: [236, 210, 188], css: '#ecd2bc', label: 'ivory' },
  { rgb: [214, 176, 142], css: '#d6b08e', label: 'fair' },
  { rgb: [196, 152, 112], css: '#c49870', label: 'tan' },
  { rgb: [168, 118, 82],  css: '#a87652', label: 'bronze' },
  { rgb: [132, 88, 60],   css: '#84583c', label: 'brown' },
  { rgb: [96, 62, 44],    css: '#603e2c', label: 'deep' },
  { rgb: [148, 142, 148], css: '#948e94', label: 'ash' },
  { rgb: [158, 64, 56],   css: '#9e4038', label: 'oni' },
];
const BGS = [
  { id: 'night',  label: 'VOID' },
  { id: 'moon',   label: 'BLOOD MOON' },
  { id: 'arena',  label: 'WAR FIELD' },
  { id: 'ember',  label: 'EMBERS' },
  { id: 'bg5',  label: 'BURNING VILLAGE', img: 1 },
  { id: 'bg6',  label: 'TORII LAKE', img: 1 },
  { id: 'bg7',  label: 'BAMBOO', img: 1 },
  { id: 'bg8',  label: 'SNOW PASS', img: 1 },
  { id: 'bg9',  label: 'SAKURA STORM', img: 1 },
  { id: 'bg10', label: 'SHRINE', img: 1 },
  { id: 'bg11', label: 'STORM VALLEY', img: 1 },
  { id: 'bg12', label: 'NEON ALLEY', img: 1 },
  { id: 'bg13', label: 'WAR BANNERS', img: 1 },
  { id: 'bg14', label: 'ROOFTOPS', img: 1 },
];
// where each hat's brim sits (fraction of canvas height) — hair above this is hidden
const HAT_BRIM = { hat1: 0.165, hat2: 0.185, hat3: 0.21 };

/* ------------------------------ state ------------------------------ */
const sel = { gender: 'm', garb: 1, armor: 1, hair: 1, hairColor: 0, clothColor: 0, armorColor: 0, hatColor: 0, hat: 0, mask: 0, weapon: 0, bg: 1, skin: 0 };
const layers = {};    // id -> keyed canvas
const bgImgs = {};    // id -> raw image
let arenaImg = null;

/* --------------------------- image loading ------------------------- */
function keyGreen(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const id = x.getImageData(0, 0, c.width, c.height);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], gr = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, b);
    if (gr > 70 && gr > r * 1.25 && gr > b * 1.25) d[i + 3] = 0;
    else if (gr > mx) {
      d[i + 1] = mx;
      if (gr > mx * 1.12 && gr > 55) d[i + 3] = Math.min(d[i + 3], 140);
    }
  }
  x.putImageData(id, 0, 0);
  return c;
}
async function loadLayer(id) {
  if (layers[id]) return layers[id];
  const img = await loadImage('assets/' + id + '.webp');
  layers[id] = keyGreen(img);
  return layers[id];
}
async function loadBg(id) {
  if (bgImgs[id]) return bgImgs[id];
  const img = await loadImage('assets/' + id + '.webp');
  bgImgs[id] = img;
  return img;
}

/* ----------------------------- recolor ----------------------------- */
const procCache = {};
function paintPixel(d, i, lum, hue, boost = 1) {
  if (hue === -1) { d[i] = lum * 1.5 * boost + 40; d[i + 1] = lum * 1.5 * boost + 42; d[i + 2] = lum * 1.55 * boost + 48; return; }
  const rad = hue * Math.PI / 180;
  const amp = Math.min(255, (lum * 2.2 + 26) * boost);
  d[i]     = amp * Math.max(0.22, 0.5 + 0.5 * Math.cos(rad));
  d[i + 1] = amp * Math.max(0.18, 0.5 + 0.5 * Math.cos(rad - 2.09));
  d[i + 2] = amp * Math.max(0.18, 0.5 + 0.5 * Math.cos(rad + 2.09));
}
// full repaint (hair) — every opaque pixel takes the hue by luminance
function tintFull(src, hue) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  const im = x.getImageData(0, 0, c.width, c.height);
  const d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const lum = 0.3 * d[i] + 0.55 * d[i + 1] + 0.15 * d[i + 2];
    paintPixel(d, i, lum, hue);
  }
  x.putImageData(im, 0, 0);
  return c;
}
// accent repaint (garb/headwear) — red-dominant pixels (crimson accents) change.
// Skin zones (head, hands, chest) are excluded spatially — the pose is locked,
// so those regions are constant across every layer.
const SKIN_ZONES = [
  { cx: 0.5, cy: 0.17, rx: 0.075, ry: 0.075 },  // face only (ellipse)
  { x0: 0.20, x1: 0.35, y0: 0.46, y1: 0.64 },   // left hand
  { x0: 0.65, x1: 0.80, y0: 0.46, y1: 0.64 },   // right hand
];
function inSkinZone(fx, fy) {
  for (const z of SKIN_ZONES) {
    if (z.rx !== undefined) {
      const dx = (fx - z.cx) / z.rx, dy = (fy - z.cy) / z.ry;
      if (dx * dx + dy * dy < 1) return true;
    } else if (fx > z.x0 && fx < z.x1 && fy > z.y0 && fy < z.y1) return true;
  }
  return false;
}
function tintAccent(src, hue) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  const im = x.getImageData(0, 0, c.width, c.height);
  const d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const px = (i / 4) % c.width, py = Math.floor(i / 4 / c.width);
    if (inSkinZone(px / c.width, py / c.height)) continue;
    const r = d[i], gr = d[i + 1], b = d[i + 2];
    // bold garb dye: every warm (red-leaning) pixel takes the hue by luminance —
    // this art's cloth is warm near-black, so the whole garment dyes while
    // texture/shading survive; skin zones above are protected
    if (r > 26 && r > gr * 1.18 && r > b * 1.08) {
      // luminance floor: even near-black cloth shows its dye clearly
      const lum = Math.max(34, 0.3 * r + 0.55 * gr + 0.15 * b);
      paintPixel(d, i, lum, hue, 1.5);
    }
  }
  x.putImageData(im, 0, 0);
  return c;
}
// erase hair above the hat brim so nothing pokes out of headwear
function clipAboveBrim(src, brimFrac) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  const brimY = Math.floor(src.height * brimFrac);
  const fade = Math.floor(src.height * 0.02);
  const im = x.getImageData(0, 0, c.width, brimY + fade);
  const d = im.data;
  for (let y = 0; y < brimY + fade; y++) {
    const k = y < brimY ? 0 : (y - brimY) / fade; // 0 = erased, 1 = kept
    for (let px = 0; px < c.width; px++) {
      const i = (y * c.width + px) * 4 + 3;
      d[i] = Math.round(d[i] * k);
    }
  }
  x.putImageData(im, 0, 0);
  return c;
}
// three-channel garb dye — the material map says what each pixel is:
// green = cloth, red = armor, blue = trim (scarf/belt/cords), white = skin
function tintGarb(src, map, hueCloth, hueArmor, hueTrim, skinRgb) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  const im = x.getImageData(0, 0, c.width, c.height);
  const d = im.data;
  const mx = map.getContext('2d');
  const md = mx.getImageData(0, 0, map.width, map.height).data;
  const sx = map.width / c.width, sy = map.height / c.height;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const px = (i / 4) % c.width, py = Math.floor(i / 4 / c.width);
    const mi = (Math.min(map.height - 1, Math.round(py * sy)) * map.width + Math.min(map.width - 1, Math.round(px * sx))) * 4;
    const mr = md[mi], mg = md[mi + 1], mb = md[mi + 2];
    // STRICT classification — a pixel must clearly belong to one material,
    // otherwise it is left completely untouched. Independence over coverage.
    if (mr > 150 && mg > 150 && mb > 150) {                   // skin (white)
      if (skinRgb) paintSkin(d, i, skinRgb);
      continue;
    }
    let hue = null;
    if (mg > 110 && mg > mr + 60 && mg > mb + 60) hue = hueCloth;        // cloth (green)
    else if (mr > 110 && mr > mg + 60 && mr > mb + 60) hue = hueArmor;   // armor (red)
    else if (mb > 110 && mb > mr + 60 && mb > mg + 60) hue = hueTrim;    // trim (blue)
    if (hue === null || hue === undefined) continue;
    const lum = Math.max(34, 0.3 * d[i] + 0.55 * d[i + 1] + 0.15 * d[i + 2]);
    paintPixel(d, i, lum, hue, 1.5);
  }
  x.putImageData(im, 0, 0);
  return c;
}
// no-map fallback: bright crimson = trim (scarf/belt/cords), other warm dark = cloth
function tintGarbFallback(src, hueCloth, hueTrim, skinRgb) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  const im = x.getImageData(0, 0, c.width, c.height);
  const d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const px = (i / 4) % c.width, py = Math.floor(i / 4 / c.width);
    const skin = inSkinZone(px / c.width, py / c.height);
    const r = d[i], gr = d[i + 1], b = d[i + 2];
    const lum = 0.3 * r + 0.55 * gr + 0.15 * b;
    if (skin) {
      if (skinRgb && lum > 66) paintSkin(d, i, skinRgb);
      continue;
    }
    const crimson = r > 48 && r - Math.max(gr, b) > 26;      // scarf / belt / cords
    const warm = r > 26 && r > gr * 1.18 && r > b * 1.08;    // dark cloth
    if (crimson && hueTrim !== null && hueTrim !== undefined) {
      paintPixel(d, i, Math.max(40, lum), hueTrim, 1.6);
    } else if (warm && !crimson && hueCloth !== null && hueCloth !== undefined) {
      paintPixel(d, i, Math.max(34, lum), hueCloth, 1.5);
    }
  }
  x.putImageData(im, 0, 0);
  return c;
}
function paintSkin(d, i, rgb) {
  // remap by luminance: tone at full light, shading preserved
  const lum = 0.3 * d[i] + 0.55 * d[i + 1] + 0.15 * d[i + 2];
  const k = Math.min(1.15, lum / 170);
  d[i] = rgb[0] * k; d[i + 1] = rgb[1] * k; d[i + 2] = rgb[2] * k;
}
// fallback until material maps exist: retint bright pixels inside the skin zones
function tintSkinZones(src, skinRgb) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  const im = x.getImageData(0, 0, c.width, c.height);
  const d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const px = (i / 4) % c.width, py = Math.floor(i / 4 / c.width);
    if (!inSkinZone(px / c.width, py / c.height)) continue;
    const lum = 0.3 * d[i] + 0.55 * d[i + 1] + 0.15 * d[i + 2];
    if (lum > 66) paintSkin(d, i, skinRgb);
  }
  x.putImageData(im, 0, 0);
  return c;
}
// dye a whole standalone layer — ink outlines and deep shadow stay dark, so
// the art keeps its line work and shading in every color
function tintLayer(src, hue) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  const im = x.getImageData(0, 0, c.width, c.height);
  const d = im.data;
  let tr, tg, tb;
  if (hue === -1) { tr = 225; tg = 227; tb = 235; }           // silver
  else {
    const rad = hue * Math.PI / 180;
    tr = 235 * Math.max(0.22, 0.5 + 0.5 * Math.cos(rad));
    tg = 235 * Math.max(0.18, 0.5 + 0.5 * Math.cos(rad - 2.09));
    tb = 235 * Math.max(0.18, 0.5 + 0.5 * Math.cos(rad + 2.09));
  }
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const lum = 0.3 * d[i] + 0.55 * d[i + 1] + 0.15 * d[i + 2];
    if (lum < 24) continue;                                    // ink lines stay
    const k = Math.pow(Math.max(lum, 44) / 110, 0.8);          // dark cloth still shows its dye
    d[i] = Math.min(255, tr * k);
    d[i + 1] = Math.min(255, tg * k);
    d[i + 2] = Math.min(255, tb * k);
  }
  x.putImageData(im, 0, 0);
  return c;
}
// skin-dye the body layer: bright pixels are skin; the dark under-tunic stays dark
function tintBody(src, rgb) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  const im = x.getImageData(0, 0, c.width, c.height);
  const d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const lum = 0.3 * d[i] + 0.55 * d[i + 1] + 0.15 * d[i + 2];
    if (lum > 58) paintSkin(d, i, rgb);
  }
  x.putImageData(im, 0, 0);
  return c;
}
function processed(id, kind, hue, brimFrac, skinIdx) {
  const key = [id, kind, hue, brimFrac, skinIdx || 0].join('|');
  if (procCache[key]) return procCache[key];
  let c = layers[id];
  if (!c) return null;
  if (kind === 'body') {
    const skinRgb = skinIdx ? SKINS[skinIdx].rgb : null;
    if (skinRgb) c = tintBody(c, skinRgb);
  } else if (hue !== null && hue !== undefined) {
    if (kind === 'hair') c = tintFull(c, hue);
    else if (kind === 'layer') c = tintLayer(c, hue);
    else c = tintAccent(c, hue);
  }
  if (brimFrac) c = clipAboveBrim(c, brimFrac);
  procCache[key] = c;
  return c;
}

/* ----------------------------- drawing ----------------------------- */
let embers = [];
for (let i = 0; i < 26; i++) embers.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() });
function coverDraw(img) {
  const iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
  const scale = Math.max(W / iw, H / ih);
  const dw = iw * scale, dh = ih * scale;
  g.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
}
function drawBg(t) {
  const bg = BGS[sel.bg];
  if (bg.img && bgImgs[bg.id]) {
    coverDraw(bgImgs[bg.id]);
    g.fillStyle = 'rgba(5,3,4,.18)'; g.fillRect(0, 0, W, H);
    return;
  }
  if (bg.id === 'arena' && arenaImg) {
    coverDraw(arenaImg);
    g.fillStyle = 'rgba(5,3,4,.25)'; g.fillRect(0, 0, W, H);
    return;
  }
  const grd = g.createRadialGradient(W / 2, H * 0.32, 60, W / 2, H * 0.5, H * 0.75);
  grd.addColorStop(0, '#1c0e10'); grd.addColorStop(1, '#070405');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  if (bg.id === 'moon') {
    const mg = g.createRadialGradient(W / 2, H * 0.22, 10, W / 2, H * 0.22, 190);
    mg.addColorStop(0, '#8a1212'); mg.addColorStop(0.8, '#5a0c0c'); mg.addColorStop(1, 'rgba(60,8,8,0)');
    g.fillStyle = mg; g.beginPath(); g.arc(W / 2, H * 0.22, 190, 0, Math.PI * 2); g.fill();
  }
  if (bg.id === 'ember' || bg.id === 'moon') {
    g.fillStyle = '#ff7b3a';
    for (const e of embers) {
      e.y -= 0.0006 * e.s; if (e.y < 0) e.y = 1;
      g.globalAlpha = 0.25 + 0.3 * Math.sin((e.y + t * 0.0001) * 30);
      g.fillRect(e.x * W, e.y * H, e.s * 3, e.s * 3);
    }
    g.globalAlpha = 1;
  }
}
function currentStack() {
  const c = CAT[sel.gender];
  const hatId = c.hats[sel.hat].id;
  const brim = hatId ? HAT_BRIM[hatId.split('-')[1]] : null;
  const st = [];
  // true layer stack: (back weapon) -> body -> garb -> armor -> weapon -> hair -> mask -> hat
  const wId = c.weapons[sel.weapon].id;
  const wBehind = wId && WEAPON_BEHIND.has(wId.split('-')[1]);
  if (wId && wBehind) st.push({ id: wId, kind: 'raw' });
  // some weapons have a companion piece slung on the back (e.g. the bow's quiver)
  if (wId && WEAPON_BACK.has(wId.split('-')[1])) st.push({ id: wId + '-back', kind: 'raw' });
  st.push({ id: c.body, kind: 'body', skinIdx: sel.skin });
  const garbId = c.garbs[sel.garb].id;
  if (garbId) st.push({ id: garbId, kind: 'layer', hue: COLORS[sel.clothColor].h });
  const armorId = c.armors[sel.armor].id;
  if (armorId) st.push({ id: armorId, kind: 'layer', hue: COLORS[sel.armorColor].h });
  if (wId && !wBehind) st.push({ id: wId, kind: 'raw' });
  const hairId = c.hair[sel.hair].id;
  if (hairId) st.push({ id: hairId, kind: 'hair', hue: COLORS[sel.hairColor].h, brim });
  const maskId = c.masks[sel.mask].id;
  if (maskId) st.push({ id: maskId, kind: 'raw' });
  if (hatId) st.push({ id: hatId, kind: 'accent', hue: COLORS[sel.hatColor].h });
  return st;
}
function render(t = 0) {
  drawBg(t);
  for (const l of currentStack()) {
    const img = layers[l.id] ? processed(l.id, l.kind, l.hue, l.brim, l.skinIdx) : null;
    if (img) g.drawImage(img, 0, 0, W, H);
  }
  // floor shadow
  g.save();
  g.globalAlpha = 0.45; g.globalCompositeOperation = 'multiply';
  const sh = g.createRadialGradient(W / 2, H * 0.94, 20, W / 2, H * 0.94, W * 0.4);
  sh.addColorStop(0, 'rgba(0,0,0,.7)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sh;
  g.save(); g.translate(0, H * 0.94); g.scale(1, 0.12); g.translate(0, -H * 0.94);
  g.beginPath(); g.arc(W / 2, H * 0.94, W * 0.4, 0, Math.PI * 2); g.fill();
  g.restore();
  g.restore();
}

/* ------------------------------- UI -------------------------------- */
function chipRow(elId, items, get, set) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  items.forEach((it, i) => {
    const b = document.createElement('button');
    b.className = 'chip' + (get() === i ? ' on' : '');
    b.textContent = it.label;
    b.onclick = async () => {
      set(i);
      await ensureLoaded();
      buildUI(); renderNow();
    };
    el.appendChild(b);
  });
}
function swatchRow(elId, get, set, palette = COLORS) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = '';
  palette.forEach((col, i) => {
    const d = document.createElement('div');
    d.className = 'sw' + (get() === i ? ' on' : '');
    d.style.background = col.css;
    d.title = col.label || '';
    d.onclick = () => { set(i); buildUI(); renderNow(); };
    el.appendChild(d);
  });
}
function buildUI() {
  chipRow('cGender', [CAT.m, CAT.f].map((c) => ({ label: c.label })),
    () => (sel.gender === 'm' ? 0 : 1), (i) => { sel.gender = i === 0 ? 'm' : 'f'; });
  const c = CAT[sel.gender];
  chipRow('cOutfit', c.garbs, () => sel.garb, (i) => { sel.garb = i; });
  chipRow('cArmor', c.armors, () => sel.armor, (i) => { sel.armor = i; });
  chipRow('cWeapon', c.weapons, () => sel.weapon, (i) => { sel.weapon = i; });
  chipRow('cHair', c.hair, () => sel.hair, (i) => { sel.hair = i; });
  chipRow('cMask', c.masks, () => sel.mask, (i) => { sel.mask = i; });
  chipRow('cHat', c.hats, () => sel.hat, (i) => { sel.hat = i; });
  chipRow('cBg', BGS, () => sel.bg, (i) => { sel.bg = i; });
  swatchRow('cSkin', () => sel.skin, (i) => { sel.skin = i; }, SKINS);
  swatchRow('cHairColor', () => sel.hairColor, (i) => { sel.hairColor = i; });
  swatchRow('cClothColor', () => sel.clothColor, (i) => { sel.clothColor = i; });
  swatchRow('cArmorColor', () => sel.armorColor, (i) => { sel.armorColor = i; });
  swatchRow('cHatColor', () => sel.hatColor, (i) => { sel.hatColor = i; });
}
async function ensureLoaded() {
  const jobs = currentStack().map((l) => loadLayer(l.id).catch(() => null));
  const bg = BGS[sel.bg];
  if (bg.img) jobs.push(loadBg(bg.id).catch(() => null));
  await Promise.all(jobs);
}
function renderNow() { render(performance.now()); }

/* ------------------------------ actions ---------------------------- */
document.getElementById('btnSnap').onclick = () => {
  render(performance.now());
  const a = document.createElement('a');
  a.download = 'my-ronin.png';
  a.href = cv.toDataURL('image/png');
  a.click();
};
document.getElementById('btnFate').onclick = async () => {
  const c = CAT[sel.gender];
  sel.garb = Math.floor(Math.random() * c.garbs.length);
  sel.armor = Math.floor(Math.random() * c.armors.length);
  sel.weapon = Math.floor(Math.random() * c.weapons.length);
  sel.hair = Math.floor(Math.random() * c.hair.length);
  sel.skin = Math.floor(Math.random() * SKINS.length);
  sel.hairColor = Math.floor(Math.random() * COLORS.length);
  sel.clothColor = Math.floor(Math.random() * COLORS.length);
  sel.armorColor = Math.floor(Math.random() * COLORS.length);
  sel.hatColor = Math.floor(Math.random() * COLORS.length);
  sel.hat = Math.floor(Math.random() * c.hats.length);
  sel.mask = Math.floor(Math.random() * c.masks.length);
  sel.bg = Math.floor(Math.random() * BGS.length);
  await ensureLoaded();
  buildUI(); renderNow();
};
window.__forge = { sel, layers, renderNow, CAT, BGS, ensureLoaded, buildUI, processed, tintAccent, procCache, currentStack };

/* ------------------------------- boot ------------------------------ */
(async () => {
  const lbar = document.getElementById('lbar');
  try { arenaImg = await loadImage('assets/runtime/arena-blood-moon.webp'); } catch {}
  lbar.style.width = '30%';
  await loadLayer(CAT.m.body);
  lbar.style.width = '65%';
  await ensureLoaded();
  lbar.style.width = '100%';
  document.getElementById('loading').style.display = 'none';
  buildUI();
  (function tick(t) { render(t); requestAnimationFrame(tick); })(0);
})();
