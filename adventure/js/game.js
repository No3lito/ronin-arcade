// ADVENTURE — THE SHIFTING VALLEY (tile edition).
// 10 tile areas · 4 exits each · paths re-knot every 30 seconds ·
// find THE MAW. NES-Zelda look: flat-shaded pixel tiles, flip-screen rooms.
import { loadImage } from '../../shared/sprites.js';
import { initMobile, bindStick, bindButton, fitCanvas } from '../../shared/mobile.js';
const MOB = initMobile({"landscape":true});

const W = 960, H = 540, TS = 60, COLS = 16, ROWS = 9;
const SHIFT_SECONDS = 30;
const cv = document.getElementById('game');
// The room is a fixed 16x9 grid and must stay that way — widening it would
// move the doors. Instead the CANVAS grows to the phone's shape and the room
// is centred in it, with the chamber's own stone carried out to both edges.
// On desktop fitCanvas is a no-op, OFFX is 0, and nothing below changes.
fitCanvas(cv, { designH: H, minW: W, maxW: 1400 });
const OFFX = Math.round((cv.width - W) / 2);
const g = cv.getContext('2d');
g.imageSmoothingEnabled = false;

/* ------------------------------ audio ------------------------------ */
let ac = null;
function audio() {
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function bleep(f0, f1, dur, type = 'square', vol = 0.18) {
  const c = audio(), t = c.currentTime;
  const o = c.createOscillator(), v = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(v).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
const S = {
  slash: () => bleep(700, 180, 0.09),
  hit: () => bleep(220, 60, 0.14),
  hurt: () => bleep(140, 50, 0.25, 'sawtooth', 0.25),
  kill: () => { bleep(500, 900, 0.08); bleep(900, 300, 0.12); },
  shift: () => { bleep(60, 200, 0.9, 'sawtooth', 0.3); bleep(800, 100, 0.7, 'triangle', 0.2); },
  door: () => bleep(200, 500, 0.3, 'triangle', 0.25),
  win: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => bleep(f, f, 0.22, 'square', 0.22), i * 160)); },
  tick: () => bleep(880, 700, 0.06, 'square', 0.12),
};

/* ------------------------------ input ------------------------------ */
const key = {};
let anyPress = false, touchMode = MOB.touch;   // a phone is a phone before it is ever touched
addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (!e.repeat) { key[e.code] = true; anyPress = true; }
});
addEventListener('keyup', (e) => { key[e.code] = false; });
const joyV = bindStick(document.getElementById('joy'), document.getElementById('joyKnob'));
bindButton(document.getElementById('tAtk'),
  () => { key.KeyJ = true; anyPress = true; },
  () => { key.KeyJ = false; });
addEventListener('touchstart', () => {
  if (!touchMode) { touchMode = true; document.body.classList.add('touch'); }
  anyPress = true;
}, { passive: true });
cv.addEventListener('pointerdown', () => { anyPress = true; });

/* --------------------------- tile factory --------------------------- */
function makeTile(draw) {
  const c = document.createElement('canvas');
  c.width = 15; c.height = 15;
  draw(c.getContext('2d'));
  return c;
}
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function groundTile(base, fleck, dark, seed) {
  return makeTile((x) => {
    x.fillStyle = base; x.fillRect(0, 0, 15, 15);
    const r = rnd(seed);
    x.fillStyle = fleck;
    for (let i = 0; i < 11; i++) x.fillRect(Math.floor(r() * 15), Math.floor(r() * 15), 1, 2);
    x.fillStyle = dark;
    for (let i = 0; i < 6; i++) x.fillRect(Math.floor(r() * 15), Math.floor(r() * 15), 2, 1);
  });
}
function treeTile(ground, canopy1, canopy2) {
  return makeTile((x) => {
    x.fillStyle = ground; x.fillRect(0, 0, 15, 15);
    x.fillStyle = '#060a06'; x.beginPath(); x.arc(7.5, 7, 6.5, 0, 7); x.fill();
    x.fillStyle = canopy1; x.beginPath(); x.arc(6, 5.5, 4.2, 0, 7); x.fill();
    x.fillStyle = canopy2; x.fillRect(4, 3, 2, 2); x.fillRect(8, 6, 2, 1);
    x.fillStyle = '#241812'; x.fillRect(6, 11, 3, 4);
  });
}
function rockTile(ground) {
  return makeTile((x) => {
    x.fillStyle = ground; x.fillRect(0, 0, 15, 15);
    x.fillStyle = '#4a453e'; x.beginPath(); x.arc(7.5, 8, 5.5, 0, 7); x.fill();
    x.fillStyle = '#615c52'; x.fillRect(4, 4, 4, 3);
    x.fillStyle = '#2a2622'; x.fillRect(5, 10, 6, 2);
  });
}
function waterTile() {
  return makeTile((x) => {
    x.fillStyle = '#16283c'; x.fillRect(0, 0, 15, 15);
    x.fillStyle = '#2a4a66';
    x.fillRect(1, 3, 5, 1); x.fillRect(8, 7, 5, 1); x.fillRect(3, 11, 5, 1);
    x.fillStyle = '#5a2028'; x.fillRect(11, 2, 2, 1);
  });
}
function wallTile() {
  return makeTile((x) => {
    x.fillStyle = '#3a2c24'; x.fillRect(0, 0, 15, 15);
    x.fillStyle = '#523e32';
    x.fillRect(0, 0, 15, 2); x.fillRect(0, 5, 15, 2); x.fillRect(0, 10, 15, 2);
    x.fillStyle = '#241a12';
    x.fillRect(0, 2, 15, 1); x.fillRect(0, 7, 15, 1); x.fillRect(0, 12, 15, 1);
  });
}
function lanternTile(ground) {
  return makeTile((x) => {
    x.fillStyle = ground; x.fillRect(0, 0, 15, 15);
    x.fillStyle = '#1c1614'; x.fillRect(5, 5, 5, 8);
    x.fillStyle = '#2a2220'; x.fillRect(3, 2, 9, 4);
    x.fillStyle = '#ff8c3a'; x.fillRect(6, 6, 3, 3);
  });
}
function toriiTile(ground) {
  return makeTile((x) => {
    x.fillStyle = ground; x.fillRect(0, 0, 15, 15);
    x.fillStyle = '#5a1212'; x.fillRect(2, 1, 3, 14); x.fillRect(10, 1, 3, 14);
    x.fillRect(0, 0, 15, 3); x.fillStyle = '#7a1a1a'; x.fillRect(0, 3, 15, 1);
  });
}
function pitTile() {
  return makeTile((x) => {
    x.fillStyle = '#050304'; x.fillRect(0, 0, 15, 15);
    x.fillStyle = '#3a0a0a';
    x.fillRect(2, 3, 3, 1); x.fillRect(9, 6, 4, 1); x.fillRect(4, 10, 3, 1);
    x.fillStyle = '#7a1212'; x.fillRect(7, 7, 2, 2);
  });
}
function graveTile(ground) {
  return makeTile((x) => {
    x.fillStyle = ground; x.fillRect(0, 0, 15, 15);
    x.fillStyle = '#26221e'; x.fillRect(5, 3, 6, 10);
    x.fillStyle = '#34302a'; x.fillRect(5, 3, 6, 2);
    x.fillStyle = '#111'; x.fillRect(6, 7, 4, 1);
  });
}

/* ------------------------------ areas ------------------------------ */
// legend per map: . ground  p path  t tree  r rock  w water  s wall
//                 L lantern  T torii  G grave  P pit(win)  e enemy spawn
// borders carry exits: '.' gaps mid-edge are the four doors.
const BIOMES = {
  field:  { g: ['#22301c', '#31452a', '#162010', 11], tree: ['#1a3a1e', '#2a5c32'] },
  ash:    { g: ['#322a2e', '#453a3e', '#211b1e', 23], tree: ['#3a2c26', '#503c32'] },
  snow:   { g: ['#484c56', '#5d626e', '#33363e', 37], tree: ['#3a4650', '#50606e'] },
  sakura: { g: ['#32243a', '#463252', '#201626', 41], tree: ['#6e3050', '#94436c'] },
  stone:  { g: ['#342e28', '#453e36', '#211c18', 53], tree: ['#22301c', '#31452a'] },
  dark:   { g: ['#2a2130', '#3a2e42', '#1a1420', 67], tree: ['#302438', '#443454'] },
};
const AREAS = [
  { name: 'ASH FIELDS', biome: 'ash', foes: 2, map: [
    'ttttttt..ttttttt','t....r.....e...t','t..rr.......rr.t','t.......ss.....t','.....e..ss......','t..rr..........t','t.......e...rr.t','t...r..........t','ttttttt..ttttttt'] },
  { name: 'TORII LAKE', biome: 'field', foes: 1, map: [
    'rrrrrrr..rrrrrrr','r..www......ww.r','r..www..T......r','r.......T....e.r','........T.......','r..e....T......r','r......www.ww..r','r......www.ww..r','rrrrrrr..rrrrrrr'] },
  { name: 'BAMBOO HOLLOW', biome: 'field', foes: 2, map: [
    'ttttttt..ttttttt','t...t......t...t','t.t...e..t...t.t','t...t........t.t','......t..e......','t.t........t...t','t...t..t.....t.t','t.e....t.......t','ttttttt..ttttttt'] },
  { name: 'SNOW PASS', biome: 'snow', foes: 1, map: [
    'rrrrrrr..rrrrrrr','r......rr......r','r..rr.......e..r','r......r..rr...r','....e...........','r...rr.....r...r','r.......rr.....r','r..r.......e...r','rrrrrrr..rrrrrrr'] },
  { name: 'SAKURA GRAVES', biome: 'sakura', foes: 2, map: [
    'ttttttt..ttttttt','t..G.......G...t','t....e....t....t','t..G...G.....G.t','......t.....e...','t..G......G....t','t....t.....t...t','t.e..G...G.....t','ttttttt..ttttttt'] },
  { name: 'CANDLE SHRINE', biome: 'stone', foes: 0, map: [
    'sssssss..sssssss','s..L........L..s','s....ssss......s','s....s..s...L..s','.....s..s.......','s....ssss......s','s..L........L..s','s..............s','sssssss..sssssss'] },
  { name: 'STORM CLIFFS', biome: 'stone', foes: 2, map: [
    'rrrrrrr..rrrrrrr','r.....r....e...r','r..r..r..rrr...r','r..r...........r','...rrr...e..rr..','r......rr......r','r..e...........r','r....r....r....r','rrrrrrr..rrrrrrr'] },
  { name: 'BURNING VILLAGE', biome: 'ash', foes: 3, map: [
    'sssssss..sssssss','s...ss.....e...s','s.e.ss..ss.....s','s.......ss..ss.s','........e...ss..','s..ss..........s','s..ss..e..ss...s','s.........ss...s','sssssss..sssssss'] },
  { name: 'CASTLE ROOFS', biome: 'dark', foes: 2, map: [
    'sssssss..sssssss','s.....L....e...s','s..ssssss......s','s..............s','....e....sss....','s..sss.........s','s.........e....s','s...L.....L....s','sssssss..sssssss'] },
  { name: 'BLACK BASIN', biome: 'dark', foes: 1, map: [
    'rrrrrrr..rrrrrrr','r..............r','r..r........r..r','r......rr......r','................','r......rr......r','r..L........L..r','r..............r','rrrrrrr..rrrrrrr'] },
  { name: 'RICE TERRACES', biome: 'field', foes: 2, map: [
    'ttttttt..ttttttt','t.www......www.t','t..............t','t.www..e...www.t','.......ww.......','t.www......www.t','t.....e........t','t.www......www.t','ttttttt..ttttttt'] },
  { name: 'DEAD FOREST', biome: 'ash', foes: 2, map: [
    'ttttttt..ttttttt','t..t....t....t.t','t....e....t....t','t..t....t....t.t','....t......t....','t.t....t....t..t','t....e....t....t','t..t....t...t..t','ttttttt..ttttttt'] },
  { name: 'FROZEN LAKE', biome: 'snow', foes: 1, map: [
    'rrrrrrr..rrrrrrr','r..wwww....www.r','r..wwww...www..r','r.....e........r','......www.......','r..www.....ww..r','r..www..e..ww..r','r..............r','rrrrrrr..rrrrrrr'] },
  { name: 'LANTERN ROAD', biome: 'stone', foes: 2, map: [
    'sssssss..sssssss','s..L....L....L.s','s..............s','s.e..L....L....s','................','s....L....L..e.s','s..............s','s..L....L....L.s','sssssss..sssssss'] },
  { name: 'BONE FIELDS', biome: 'ash', foes: 3, map: [
    'rrrrrrr..rrrrrrr','r..G.....G...G.r','r....e.........r','r.G....G....G..r','.......e........','r..G....G....G.r','r...........e..r','r.G...G....G...r','rrrrrrr..rrrrrrr'] },
];
const WAKE_SHIFTS = 7;   // the Maw sleeps this many shifts (3.5 min) before it can appear
const SOLID = { t: 1, r: 1, w: 1, s: 1, T: 1, L: 1, G: 1 };
const DIRS = ['N', 'E', 'S', 'W'];
let links = [];
function reshuffle() {
  links = AREAS.map((_, i) => {
    const l = {};
    for (const d of DIRS) {
      let t = Math.floor(Math.random() * AREAS.length);
      while (t === i) t = Math.floor(Math.random() * AREAS.length);
      l[d] = t;
    }
    return l;
  });
}

/* ------------------------ tilesets per biome ------------------------ */
const tilesets = {};
function buildTiles() {
  for (const [name, b] of Object.entries(BIOMES)) {
    const ground = groundTile(b.g[0], b.g[1], b.g[2], b.g[3]);
    tilesets[name] = {
      '.': ground, p: ground, e: ground,
      t: treeTile(b.g[0], b.tree[0], b.tree[1]),
      r: rockTile(b.g[0]),
      w: waterTile(),
      s: wallTile(),
      L: lanternTile(b.g[0]),
      T: toriiTile(b.g[0]),
      G: graveTile(b.g[0]),
      P: pitTile(),
    };
  }
}

/* ------------------------------ state ------------------------------ */
const G_ = { scene: 'boot', t: 0, area: 0, timer: 0, shiftT: SHIFT_SECONDS, visited: new Set(), shiftFx: 0, msg: '', msgT: 0, shifts: 0, gateArea: -1 };
const P = { x: W / 2, y: H / 2, dir: 0, hp: 6, maxHp: 6, atkT: 0, hurtT: 0, spd: 220 };
let enemies = [], pickups = [], heroPx = null, rows = [];

function enterArea(idx, fromDir) {
  G_.area = idx;
  G_.visited.add(idx);
  // sanitize: the door corridors (center column + center row) must never be
  // blocked by solid tiles — items never black the entrances
  const grid = AREAS[idx].map.map((s) => s.split(''));
  for (let r = 1; r < ROWS - 1; r++) for (const c of [7, 8]) {
    if (SOLID[grid[r][c]] === 1) grid[r][c] = '.';
  }
  for (let c = 1; c < COLS - 1; c++) {
    if (SOLID[grid[4][c]] === 1) grid[4][c] = '.';
  }
  rows = grid.map((a) => a.join(''));
  enemies = []; pickups = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (rows[r][c] === 'e') enemies.push({ x: c * TS + TS / 2, y: r * TS + TS / 2, hp: 2, t: Math.random() * 6, flash: 0, kx: 0, ky: 0 });
  }
  if (fromDir === 'N') { P.x = W / 2; P.y = 50; }
  else if (fromDir === 'S') { P.x = W / 2; P.y = H - 50; }
  else if (fromDir === 'E') { P.x = W - 50; P.y = H / 2; }
  else if (fromDir === 'W') { P.x = 50; P.y = H / 2; }
  S.door();
}
function say(m) { G_.msg = m; G_.msgT = 2.6; }
function tileAt(px, py) {
  const c = Math.floor(px / TS), r = Math.floor(py / TS);
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return ' ';
  return rows[r][c];
}
function solidAt(px, py) { return SOLID[tileAt(px, py)] === 1; }

/* ---------------------------- game logic ---------------------------- */
function update(dt) {
  G_.timer += dt;
  G_.msgT = Math.max(0, G_.msgT - dt);
  G_.shiftFx = Math.max(0, G_.shiftFx - dt);
  P.atkT = Math.max(0, P.atkT - dt);
  P.hurtT = Math.max(0, P.hurtT - dt);
  G_.shiftT -= dt;
  if (G_.shiftT <= 4 && G_.shiftT + dt > 4) S.tick();
  if (G_.shiftT <= 2 && G_.shiftT + dt > 2) S.tick();
  if (G_.shiftT <= 0) {
    reshuffle(); G_.shiftT = SHIFT_SECONDS; G_.shiftFx = 1.2;
    G_.shifts++;
    S.shift();
    if (G_.shifts === WAKE_SHIFTS) say('THE MAW HAS WOKEN — HUNT IT');
    else say('THE VALLEY SHIFTS');
    // the dungeon relocates with every shift once awake — never to where you stand
    if (G_.shifts >= WAKE_SHIFTS) {
      let ga = Math.floor(Math.random() * AREAS.length);
      while (ga === G_.area) ga = Math.floor(Math.random() * AREAS.length);
      G_.gateArea = ga;
    }
  }
  let mx = (key.KeyD || key.ArrowRight ? 1 : 0) - (key.KeyA || key.ArrowLeft ? 1 : 0) + joyV.x;
  let my = (key.KeyS || key.ArrowDown ? 1 : 0) - (key.KeyW || key.ArrowUp ? 1 : 0) + joyV.y;
  const ml = Math.hypot(mx, my);
  if (ml > 0.25) {
    mx /= Math.max(1, ml); my /= Math.max(1, ml);
    if (Math.abs(mx) > Math.abs(my)) P.dir = mx > 0 ? 0 : 2;
    else P.dir = my > 0 ? 1 : 3;
    const nx = P.x + mx * P.spd * dt, ny = P.y + my * P.spd * dt;
    if (!solidAt(nx + Math.sign(mx) * 14, P.y - 6) && !solidAt(nx + Math.sign(mx) * 14, P.y + 10)) P.x = nx;
    if (!solidAt(P.x - 12, ny + Math.sign(my) * 12) && !solidAt(P.x + 12, ny + Math.sign(my) * 12)) P.y = ny;
  }
  // exits through the mid-edge gaps
  const L = links[G_.area];
  if (P.y < 14) { return enterArea(L.N, 'S'); }
  if (P.y > H - 14) { return enterArea(L.S, 'N'); }
  if (P.x > W - 14) { return enterArea(L.E, 'W'); }
  if (P.x < 14) { return enterArea(L.W, 'E'); }
  // attack
  if ((key.KeyJ || key.Space) && P.atkT <= 0) { key.KeyJ = false; key.Space = false; P.atkT = 0.28; S.slash(); }
  const attacking = P.atkT > 0.1;
  const [dx, dy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][P.dir];
  const tip = { x: P.x + dx * 54, y: P.y + dy * 54 };
  for (const e of enemies) {
    e.t += dt; e.flash = Math.max(0, e.flash - dt * 4);
    e.x += e.kx * dt; e.y += e.ky * dt; e.kx *= 0.86; e.ky *= 0.86;
    const d = Math.hypot(P.x - e.x, P.y - e.y);
    if (d < 320 && d > 4) {
      const nx2 = e.x + (P.x - e.x) / d * 64 * dt, ny2 = e.y + (P.y - e.y) / d * 64 * dt;
      if (!solidAt(nx2, ny2)) { e.x = nx2; e.y = ny2; }
    }
    if (attacking && Math.hypot(tip.x - e.x, tip.y - e.y) < 50 && e.flash <= 0) {
      e.hp--; e.flash = 0.3; S.hit();
      e.kx = (e.x - P.x) * 6; e.ky = (e.y - P.y) * 6;
    }
    if (d < 24 && P.hurtT <= 0) {
      P.hp--; P.hurtT = 1.0; S.hurt();
      if (P.hp <= 0) { G_.scene = 'dead'; G_.t = 0; return; }
    }
  }
  for (const e of enemies) {
    if (e.hp <= 0) { S.kill(); if (Math.random() < 0.35) pickups.push({ x: e.x, y: e.y }); }
  }
  enemies = enemies.filter((e) => e.hp > 0);
  pickups = pickups.filter((p) => {
    if (Math.hypot(P.x - p.x, P.y - p.y) < 26) {
      P.hp = Math.min(P.maxHp, P.hp + 2);
      bleep(660, 660, 0.08); bleep(990, 990, 0.12);
      return false;
    }
    return true;
  });
  // win: step into the manifested Maw at the center of its land
  if (G_.area === G_.gateArea && Math.hypot(P.x - W / 2, P.y - (H / 2 - 10)) < 46) {
    G_.scene = 'win'; G_.t = 0; S.win();
  }
}

/* ------------------------------ drawing ---------------------------- */
function brush(txt, x, y, size, col, align = 'center', alpha = 1) {
  g.save();
  g.globalAlpha = alpha;
  g.font = `700 ${size}px "Yu Mincho","Hiragino Mincho ProN",Georgia,serif`;
  g.textAlign = align; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
  g.fillStyle = col; g.fillText(txt, x, y);
  g.restore();
}
// Fill the space either side of the room with the current land's wall tile,
// sunk in shadow so the lit room still reads as the place you are standing.
function drawMargins() {
  const set = tilesets[AREAS[G_.area].biome];
  const wall = set && set.s;
  if (!wall) return;
  const right = cv.width - (OFFX + W);
  for (const band of [[0, OFFX], [OFFX + W, right]]) {
    for (let x = band[0]; x < band[0] + band[1]; x += TS) {
      for (let y = 0; y < H; y += TS) g.drawImage(wall, x, y, TS, TS);
    }
  }
  g.fillStyle = 'rgba(4,2,3,.58)';
  g.fillRect(0, 0, OFFX, H);
  g.fillRect(OFFX + W, 0, right, H);
}
function drawTiles() {
  const set = tilesets[AREAS[G_.area].biome];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const t = set[rows[r][c]] || set['.'];
    g.drawImage(t, c * TS, r * TS, TS, TS);
  }
  // exit glow arrows at the four gaps
  const glow = `rgba(255,90,60,${0.45 + 0.3 * Math.sin(G_.t * 4)})`;
  g.fillStyle = glow;
  g.fillRect(W / 2 - 8, 4, 16, 8); g.fillRect(W / 2 - 8, H - 12, 16, 8);
  g.fillRect(4, H / 2 - 8, 8, 16); g.fillRect(W - 12, H / 2 - 8, 8, 16);
  if (G_.area === G_.gateArea) {
    // the Maw manifests at the center of whatever land it haunts this shift
    const set2 = tilesets[AREAS[G_.area].biome];
    g.drawImage(set2.T, 6 * TS, 3 * TS, TS, TS); g.drawImage(set2.T, 9 * TS, 3 * TS, TS, TS);
    g.drawImage(set2.P, 7 * TS, 3 * TS, TS, TS); g.drawImage(set2.P, 8 * TS, 3 * TS, TS, TS);
    g.drawImage(set2.P, 7 * TS, 4 * TS, TS, TS); g.drawImage(set2.P, 8 * TS, 4 * TS, TS, TS);
    const pulse = 0.4 + 0.25 * Math.sin(G_.t * 2.4);
    const gr = g.createRadialGradient(W / 2, H / 2 - 10, 6, W / 2, H / 2 - 10, 130);
    gr.addColorStop(0, `rgba(160,15,15,${pulse})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    brush('THE DUNGEON', W / 2, H / 2 + 76, 15, '#ff6a4a', 'center', 0.8 + 0.2 * Math.sin(G_.t * 3));
  }
}
function drawHero() {
  if (!heroPx) return;
  g.save(); g.globalAlpha = 0.4; g.fillStyle = '#000';
  g.beginPath(); g.ellipse(P.x, P.y + 16, 16, 6, 0, 0, 7); g.fill(); g.restore();
  g.save();
  g.translate(P.x, P.y);
  g.rotate(P.dir * Math.PI / 2);
  if (P.atkT > 0.1) g.rotate(Math.sin(P.atkT * 40) * 0.5);
  if (P.hurtT > 0 && Math.sin(P.hurtT * 40) > 0) g.globalAlpha = 0.4;
  const h = 54, w = h * (heroPx.width / heroPx.height);
  g.drawImage(heroPx, -w / 2, -h / 2, w, h);
  g.restore();
  if (P.atkT > 0.1) {
    g.save();
    g.strokeStyle = 'rgba(232,217,200,.85)'; g.lineWidth = 3;
    g.beginPath(); g.arc(P.x, P.y, 52, P.dir * Math.PI / 2 - 0.9, P.dir * Math.PI / 2 + 0.9); g.stroke();
    g.restore();
  }
}
function drawEnemy(e) {
  g.save();
  g.translate(e.x, e.y + Math.sin(e.t * 6) * 2);
  g.fillStyle = e.flash > 0 ? '#c85a4a' : '#0c0a12';
  g.fillRect(-12, -18, 24, 30); g.fillRect(-16, -10, 32, 10);
  g.fillStyle = e.flash > 0 ? '#ffdddd' : '#c92222';
  g.fillRect(-6, -12, 4, 3); g.fillRect(3, -12, 4, 3);
  g.fillStyle = '#1c1620'; g.fillRect(-14, -24, 28, 7);
  g.restore();
}
function fmt(t) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
// the corner chips are ~46 screen px tall; convert to canvas units so the
// HUD always clears them however far the canvas is scaled on a phone
const HUDY = MOB.touch
  ? Math.round(46 * (cv.width / Math.max(window.innerWidth, window.innerHeight, 1)))
  : 0;
function drawHud() {
  for (let i = 0; i < P.maxHp / 2; i++) {
    const full = P.hp >= (i + 1) * 2, half = P.hp === i * 2 + 1;
    g.fillStyle = full || half ? '#c92222' : 'rgba(50,25,28,.85)';
    const x = 20 + i * 26, y = 16 + HUDY;
    g.fillRect(x, y, 8, 8); g.fillRect(x + 10, y, 8, 8); g.fillRect(x + 2, y + 6, 14, 8); g.fillRect(x + 6, y + 12, 6, 4);
    if (half) { g.fillStyle = 'rgba(50,25,28,.85)'; g.fillRect(x + 9, y, 9, 18); }
  }
  brush(AREAS[G_.area].name, W / 2, 22 + HUDY, 17, '#e8d9c8');
  brush(fmt(G_.timer) + ' · ' + G_.visited.size + '/10 seen', W - 22, 22, 13, '#9a8a7a', 'right');
  const st = Math.ceil(G_.shiftT);
  const urgent = st <= 5;
  brush('SHIFT IN ' + st, W / 2, H - 20, urgent ? 20 : 14, urgent ? '#ff3a2a' : '#b9a695', 'center', urgent ? 0.6 + 0.4 * Math.sin(G_.t * 8) : 0.9);
  // the Maw's state
  if (G_.shifts < WAKE_SHIFTS) {
    brush('the maw sleeps · ' + (WAKE_SHIFTS - G_.shifts) + ' shifts until it wakes', 20, H - 20, 12, '#9a8a7a', 'left');
  } else if (G_.area !== G_.gateArea) {
    const doors = DIRS.filter((d) => links[G_.area] && links[G_.area][d] === G_.gateArea);
    brush(doors.length ? 'THE AIR TREMBLES BEYOND A DOOR' : 'the maw haunts another land', 20, H - 20, 12, doors.length ? '#ff8a5a' : '#9a8a7a', 'left');
  }
  if (G_.msgT > 0) brush(G_.msg, W / 2, H / 2 - 90, 24, '#ff8a5a', 'center', Math.min(1, G_.msgT));
  if (G_.shiftFx > 0) {
    g.fillStyle = `rgba(160,20,20,${G_.shiftFx * 0.28})`;
    g.fillRect(0, 0, W, H);
  }
}

/* ------------------------------ scenes ----------------------------- */
function sceneTitle() {
  g.fillStyle = '#070405'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#7a1212'; g.beginPath(); g.arc(W / 2, 120, 66, 0, 7); g.fill();
  brush('THE SHIFTING VALLEY', W / 2, 230, 46, '#c92222');
  brush('冒 険', W / 2, 280, 22, '#e8d9c8');
  brush('ten cursed lands · four doors out of each · every 30 seconds the paths re-knot', W / 2, 335, 15, '#9a8a7a');
  brush('find THE DUNGEON and step into the pit — that is the only escape', W / 2, 362, 15, '#9a8a7a');
  brush(touchMode
    ? 'DRAG THE STICK to move · SLASH to cut'
    : 'WASD or ARROWS move · SPACE or J slash',
    W / 2, 395, 14, '#9a8a7a');
  brush(touchMode ? 'GUIDE button (top left)' : 'T — how to survive', W / 2, 422, 13, '#ff8a5a');
  if (Math.sin(G_.t * 4) > -0.2) brush(touchMode ? 'TAP TO WANDER' : 'PRESS ANY KEY', W / 2, 470, 20, '#e8d9c8');
  if (key.KeyT) { key.KeyT = false; G_.scene = 'guide'; G_.t = 0; return; }
  if (anyPress) {
    G_.scene = 'play'; G_.t = 0; G_.timer = 0; G_.shiftT = SHIFT_SECONDS;
    G_.visited = new Set(); P.hp = P.maxHp;
    G_.shifts = 0; G_.gateArea = -1;
    reshuffle();
    enterArea(0, 'W');
    P.x = W / 2; P.y = H / 2;
  }
}
function sceneGuide() {
  g.fillStyle = '#070405'; g.fillRect(0, 0, W, H);
  brush('HOW TO SURVIVE', W / 2, 46, 36, '#c92222');
  const rows2 = [
    ['TEN LANDS', 'tile rooms with four glowing doors - top, bottom, left, right'],
    ['THE SHIFT', 'every 30 seconds every door re-knots itself - where it leads changes'],
    ['THE MAW SLEEPS', 'for the first 7 shifts there is no way out - survive and learn the lands'],
    ['THEN IT WAKES', 'the dungeon manifests in one land - and MOVES with every shift. hunt it. step in. game over.'],
    ['SHADOW SOLDIERS', touchMode
      ? 'two cuts each (SLASH) - or just run. hearts drop sometimes.'
      : 'two cuts each (SPACE or J) - or just run. hearts drop sometimes.'],
    ['THE LAND FIGHTS YOU', 'trees, rocks, walls, water and graves block your way'],
    ['WISDOM', 'when the shift timer runs low, stand at a door - jump through the moment it re-knots'],
  ];
  rows2.forEach((r, i) => {
    brush(r[0], 150, 120 + i * 58, 18, '#ff8a5a', 'left');
    brush(r[1], 150, 146 + i * 58, 13, '#d8c9b8', 'left');
  });
  if (Math.sin(G_.t * 4) > -0.2) brush(touchMode ? 'TAP — BACK' : 'ANY KEY — BACK', W / 2, H - 24, 15, '#e8d9c8');
  if (G_.t > 0.4 && anyPress) { G_.scene = 'title'; G_.t = 0; }
}
function scenePlay(dt) {
  update(dt);
  if (G_.scene !== 'play') return;
  drawTiles();
  for (const p of pickups) {
    g.fillStyle = '#c92222';
    g.fillRect(p.x - 7, p.y - 5, 6, 6); g.fillRect(p.x + 1, p.y - 5, 6, 6);
    g.fillRect(p.x - 5, p.y - 1, 10, 6); g.fillRect(p.x - 2, p.y + 5, 4, 3);
  }
  for (const e of enemies) drawEnemy(e);
  drawHero();
  drawHud();
}
function sceneDead() {
  drawTiles(); drawHud();
  g.fillStyle = 'rgba(4,2,3,.72)'; g.fillRect(0, 0, W, H);
  brush('THE VALLEY KEEPS YOU', W / 2, H / 2 - 40, 44, '#c92222');
  if (G_.t > 1 && Math.sin(G_.t * 4) > -0.2) brush(touchMode ? 'TAP — RISE AGAIN' : 'ANY KEY — RISE AGAIN', W / 2, H / 2 + 40, 20, '#e8d9c8');
  if (G_.t > 1 && anyPress) { G_.scene = 'title'; G_.t = 0; }
}
function sceneWin() {
  g.fillStyle = '#070405'; g.fillRect(0, 0, W, H);
  const pulse = 0.5 + 0.3 * Math.sin(G_.t * 2);
  const gr = g.createRadialGradient(W / 2, 160, 10, W / 2, 160, 130);
  gr.addColorStop(0, `rgba(140,10,10,${pulse})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  brush('THE DUNGEON TAKES YOU', W / 2, 200, 42, '#e8d9c8');
  brush('game over', W / 2, 248, 18, '#9a8a7a');
  brush('time — ' + fmt(G_.timer), W / 2, 310, 26, '#ff8a5a');
  brush('lands seen — ' + G_.visited.size + ' of 10', W / 2, 350, 17, '#d8c9b8');
  if (G_.t > 1.5 && Math.sin(G_.t * 4) > -0.2) brush(touchMode ? 'TAP — WANDER AGAIN' : 'ANY KEY — WANDER AGAIN', W / 2, 460, 18, '#e8d9c8');
  if (G_.t > 1.5 && anyPress) { G_.scene = 'title'; G_.t = 0; }
}

/* ------------------------------- loop ------------------------------ */
let last = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
  G_.t += dt;
  if (OFFX > 0) {
    g.fillStyle = '#070405'; g.fillRect(0, 0, cv.width, H);
    if (G_.scene === 'play') drawMargins();
  }
  g.save();
  g.translate(OFFX, 0);
  switch (G_.scene) {
    case 'boot':
      g.fillStyle = '#070405'; g.fillRect(0, 0, W, H);
      brush('THE SHIFTING VALLEY', W / 2, H / 2, 36, '#c92222');
      break;
    case 'title': sceneTitle(); break;
    case 'guide': sceneGuide(); break;
    case 'play': scenePlay(dt); break;
    case 'dead': sceneDead(); break;
    case 'win': sceneWin(); break;
  }
  g.restore();
  anyPress = false;
}
buildTiles();
requestAnimationFrame(loop);
window.__adv = { G_, P, key, get enemies() { return enemies; }, get links() { return links; }, press: () => { anyPress = true; }, enterArea, reshuffle, AREAS };
const guideBtn = document.getElementById('guideBtn');
if (guideBtn) guideBtn.onclick = (e) => { e.preventDefault(); if (G_.scene === 'title' || G_.scene === 'win' || G_.scene === 'dead') { G_.scene = 'guide'; G_.t = 0; } };

loadImage('assets/hero-top.webp').then((img) => {
  const ratio = img.naturalWidth / img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = Math.round(26 * ratio); c.height = 26;
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  heroPx = c;
  G_.scene = 'title'; G_.t = 0;
}).catch((e) => console.error(e));
