// THE SWARM — one blade against the many.
// A wide burning field, a blade that swings itself, and a horde that grows
// exactly as fast as you do.
import { loadStrips, drawSprite, frameOf } from '../../shared/sprites.js';

const cv = document.getElementById('cv');
const g = cv.getContext('2d');
const W = cv.width, H = cv.height;
const WORLD = { w: 2800, h: 1900 };
const cam = { x: 0, y: 0 };

/* ------------------------------- input ----------------------------- */
const key = {};
addEventListener('keydown', (e) => {
  key[e.code] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  if ((G.scene === 'title' || G.scene === 'dead') && e.code === 'Space') startRun();
  else if (G.scene === 'levelup') {
    if (e.code === 'Digit1') pickUpgrade(0);
    if (e.code === 'Digit2') pickUpgrade(1);
    if (e.code === 'Digit3') pickUpgrade(2);
  }
});
addEventListener('keyup', (e) => { key[e.code] = false; });
const stick = { active: false, ox: 0, oy: 0, dx: 0, dy: 0 };
function touchPt(t) {
  const r = cv.getBoundingClientRect();
  return { x: (t.clientX - r.left) * (W / r.width), y: (t.clientY - r.top) * (H / r.height) };
}
cv.addEventListener('touchstart', (e) => {
  e.preventDefault(); const p = touchPt(e.touches[0]);
  if (G.scene === 'title' || G.scene === 'dead') { startRun(); return; }
  if (G.scene === 'levelup') { pickUpgrade(p.x < W / 3 ? 0 : (p.x < W * 2 / 3 ? 1 : 2)); return; }
  stick.active = true; stick.ox = p.x; stick.oy = p.y; stick.dx = stick.dy = 0;
}, { passive: false });
cv.addEventListener('touchmove', (e) => {
  e.preventDefault(); if (!stick.active) return;
  const p = touchPt(e.touches[0]);
  const dx = p.x - stick.ox, dy = p.y - stick.oy, len = Math.hypot(dx, dy) || 1;
  const m = Math.min(1, len / 62);
  stick.dx = (dx / len) * m; stick.dy = (dy / len) * m;
}, { passive: false });
cv.addEventListener('touchend', (e) => { e.preventDefault(); stick.active = false; stick.dx = stick.dy = 0; }, { passive: false });
cv.addEventListener('mousedown', () => { if (G.scene === 'title' || G.scene === 'dead') startRun(); });

/* ------------------------------- assets ---------------------------- */
let SPR = null, ENV = null;
loadStrips({
  idle:  { src: 'assets/ronin-idle.webp',     cols: 8, rows: 4 },
  run:   { src: 'assets/ronin-run-v2.webp',   cols: 8, rows: 3 },
  slash: { src: 'assets/ronin-slash-v2.webp', cols: 8, rows: 6 },
  hurt:  { src: 'assets/ronin-hurt.webp',     cols: 8, rows: 6 },
  gRun:  { src: 'assets/rival-run.webp',      cols: 8, rows: 3 },
  gAtk:  { src: 'assets/rival-atk0.webp',     cols: 8, rows: 6 },
  gHurt: { src: 'assets/rival-hurt.webp',     cols: 8, rows: 6 },
  archer:{ src: 'assets/archer-shoot.webp',   cols: 8, rows: 3 },
}).then(s => { SPR = s; }).catch(() => {});
loadStrips({ toro: { src: 'assets/env-toro.webp' }, boss: { src: 'assets/boss.webp' } })
  .then(s => { ENV = s; }).catch(() => {});
// the warlord actually moves — walk cycle + overhead slam
let BOSS = null;
loadStrips({
  walk: { src: 'assets/boss-walk.webp', cols: 8, rows: 3 },
  slam: { src: 'assets/boss-slam.webp', cols: 8, rows: 3 },
}).then(b => { BOSS = b; }).catch(() => {});
// power VFX elements — one per power, animated in code, stacking adds more
let FX_IMG = null;
loadStrips({
  fury:    { src: 'assets/fx-fury.webp' },
  whirl:   { src: 'assets/fx-whirl.webp' },
  thunder: { src: 'assets/fx-thunder.webp' },
  frost:   { src: 'assets/fx-frost.webp' },
  vamp:    { src: 'assets/fx-vamp.webp' },
  clone:   { src: 'assets/fx-clone.webp' },
  inferno: { src: 'assets/fx-inferno.webp' },
  storm:   { src: 'assets/fx-storm.webp' },
  iron:    { src: 'assets/fx-iron.webp' },
  swift:   { src: 'assets/fx-swift.webp' },
}).then(s2 => { FX_IMG = s2; }).catch(() => {});

/* ------------------------------- audio ----------------------------- */
let AC = null;
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch {} } return AC; }
function tone(f, dur, type = 'sine', vol = 0.12, slideTo = null) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), gn = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, a.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + dur);
  gn.gain.setValueAtTime(vol, a.currentTime);
  gn.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  o.connect(gn); gn.connect(a.destination); o.start(); o.stop(a.currentTime + dur);
}
const sfx = {
  slash: () => tone(340, 0.11, 'triangle', 0.05, 130),
  hit:   () => tone(160, 0.08, 'square', 0.04, 70),
  kill:  () => tone(95, 0.2, 'sawtooth', 0.07, 45),
  hurt:  () => tone(110, 0.3, 'sawtooth', 0.15, 55),
  xp:    () => tone(780, 0.06, 'sine', 0.035, 1150),
  power: () => { tone(520, 0.14, 'triangle', 0.12); setTimeout(() => tone(880, 0.24, 'triangle', 0.12), 100); },
  level: () => { tone(440, 0.16, 'triangle', 0.11); setTimeout(() => tone(680, 0.22, 'triangle', 0.11), 95); },
  wave:  () => tone(170, 0.55, 'sawtooth', 0.12, 85),
  bolt:  () => tone(900, 0.16, 'square', 0.07, 200),
};

/* ------------------------------- state ----------------------------- */
const G = { scene: 'title', t: 0, run: 0, wave: 1, waveT: 0, kills: 0, shake: 0, best: 0, flash: 0,
            msg: '', msgT: 0, toast: [], power: 0 };
try { G.best = Number(localStorage.getItem('swarm-best') || 0); } catch {}

let P, foes = [], orbs = [], fx = [], slashes = [], arrows = [], drops = [], blades = [], clones = [], hearts = [], shocks = [], choices = [];
let bossTier = 0;   // one WARLORD for every BOSS_EVERY souls
const BOSS_EVERY = 600;

/* ------------------------------ powerups --------------------------- */
// dropped in the world by kills · they STACK · each one you take also
// feeds G.power, and the horde reads G.power to decide how hard to push
const POWERS = [
  { k: 'fury',    n: 'FURY',          c: '#ff7a3a', d: 'the blade swings faster' },
  { k: 'whirl',   n: 'WHIRLWIND',     c: '#8ad4ff', d: 'a wider, longer sweep' },
  { k: 'thunder', n: 'THUNDER',       c: '#ffe97a', d: 'lightning hunts the horde' },
  { k: 'frost',   n: 'FROST',         c: '#9adfff', d: 'the swarm slows' },
  { k: 'vamp',    n: 'BLOOD DRINKER', c: '#ff3a5a', d: 'every kill mends you' },
  { k: 'clone',   n: 'SHADOW CLONE',  c: '#c08aff', d: 'a shadow fights beside you' },
  { k: 'inferno', n: 'INFERNO',       c: '#ff9a3a', d: 'you burn what comes close' },
  { k: 'storm',   n: 'BLADE STORM',   c: '#ffd0a0', d: 'blades fly from your swing' },
  { k: 'iron',    n: 'IRON WILL',     c: '#c8d8e8', d: 'a warded hide, harder to break' },
  { k: 'swift',   n: 'SHADOW STEP',   c: '#a8ffc8', d: 'you move like smoke' },
];
const POWER_TIME = 26;   // seconds a single power burns before it fades
const POWER_EVERY = 12;   // kills between drops

function takePower(d) {
  const pw = POWERS[d.i];
  const had = P.timed.filter(i => i.k === pw.k).length;
  P.timed.push({ k: pw.k, t: POWER_TIME });
  // a new shard of something you already hold winds every one of its clocks
  // back to full — keep finding them and the power never leaves you
  if (had) for (const inst of P.timed) if (inst.k === pw.k) inst.t = POWER_TIME;
  recalc();
  const n = P.stacks[pw.k] || 0;
  G.power++;                      // lifetime tally — the horde never forgets
  sfx.power();
  if (had) setTimeout(() => tone(1180, 0.18, 'sine', 0.07, 1560), 190);
  G.toast.push({
    txt: pw.n + (n > 1 ? '  x' + n : ''),
    sub: had ? 'renewed — ' + n + ' burning, clocks reset' : pw.d,
    c: pw.c, t: 0,
  });
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2, sp = 90 + Math.random() * 260;
    fx.push({ x: d.x, y: d.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, t: 0, life: 0.75, col: pw.c, s: 4 });
  }
  G.shake = 7;
}

// effective stats = permanent base (level-ups) x whatever powers still burn
function recalc() {
  const st = {};
  for (const inst of P.timed) st[inst.k] = (st[inst.k] || 0) + 1;
  P.stacks = st;
  const b = P.base;
  P.rate   = b.rate   * Math.pow(0.87, st.fury  || 0);
  P.arc    = Math.min(Math.PI * 2, b.arc * Math.pow(1.30, st.whirl || 0));
  P.reach  = b.reach  * Math.pow(1.08, st.whirl || 0);
  P.spd    = b.spd    * Math.pow(1.13, st.swift || 0);
  P.magnet = b.magnet * Math.pow(1.20, st.swift || 0);
  P.dmg = b.dmg; P.crit = b.crit; P.blades = b.blades; P.thorn = b.thorn;
  P.lifesteal = b.lifesteal + (st.vamp || 0) * 2;
  P.thunder = st.thunder || 0;
  P.frost   = st.frost || 0;
  P.inferno = st.inferno || 0;
  P.storm   = st.storm || 0;
  P.ward    = st.iron || 0;
  P.maxHp   = b.maxHp;
  if (P.hp > P.maxHp) P.hp = P.maxHp;
  const want = st.clone || 0;
  while (clones.length < want) spawnClone();
  while (clones.length > want) clones.pop();
}

/* -------------------------- ground texture ------------------------- */
let groundCv = null;
function buildGround() {
  groundCv = document.createElement('canvas');
  groundCv.width = 700; groundCv.height = 700;
  const c = groundCv.getContext('2d');
  const bg = c.createLinearGradient(0, 0, 700, 700);
  bg.addColorStop(0, '#2c2028'); bg.addColorStop(0.5, '#33242c'); bg.addColorStop(1, '#291d24');
  c.fillStyle = bg; c.fillRect(0, 0, 700, 700);
  for (let y = 0; y < 700; y += 70) {
    for (let x = 0; x < 700; x += 70) {
      const off = (y / 70) % 2 ? 35 : 0;
      const px = (x + off) % 700, v = Math.random() * 14 - 7;
      c.fillStyle = `rgb(${52 + v},${39 + v},${47 + v})`;
      c.fillRect(px + 2, y + 2, 66, 66);
      c.strokeStyle = 'rgba(20,12,18,.55)'; c.lineWidth = 2;
      c.strokeRect(px + 2, y + 2, 66, 66);
      c.strokeStyle = 'rgba(190,150,140,.06)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(px + 4, y + 4); c.lineTo(px + 66, y + 4); c.stroke();
    }
  }
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * 700, y = Math.random() * 700, r = Math.random() * 2 + 0.4;
    c.fillStyle = `rgba(${180 + Math.random() * 60},${150 + Math.random() * 50},140,${0.03 + Math.random() * 0.07})`;
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  }
  for (let i = 0; i < 40; i++) {
    let x = Math.random() * 700, y = Math.random() * 700;
    c.strokeStyle = 'rgba(16,10,14,.5)'; c.lineWidth = 1 + Math.random();
    c.beginPath(); c.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += (Math.random() - 0.5) * 42; y += (Math.random() - 0.5) * 42; c.lineTo(x, y); }
    c.stroke();
  }
  for (let i = 0; i < 16; i++) {
    const x = Math.random() * 700, y = Math.random() * 700, r = 30 + Math.random() * 70;
    const sg = c.createRadialGradient(x, y, 4, x, y, r);
    sg.addColorStop(0, 'rgba(12,6,10,.45)'); sg.addColorStop(1, 'rgba(12,6,10,0)');
    c.fillStyle = sg; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  }
}
let props = [], braziers = [];
function buildProps() {
  props = []; braziers = [];
  for (let i = 0; i < 110; i++) {
    props.push({ x: Math.random() * WORLD.w, y: Math.random() * WORLD.h,
                 t: Math.random() < 0.45 ? 'rock' : (Math.random() < 0.65 ? 'grass' : 'bone'),
                 s: 0.7 + Math.random() * 0.9, r: Math.random() * 7 });
  }
  for (let x = 340; x < WORLD.w; x += 620) for (let y = 300; y < WORLD.h; y += 560) {
    braziers.push({ x: x + (Math.random() - 0.5) * 120, y: y + (Math.random() - 0.5) * 120 });
  }
}

/* ------------------------------- start ----------------------------- */
const BASE = { hp: 110, spd: 250, dmg: 26, rate: 0.6, reach: 138, arc: 1.5, magnet: 104, crit: 0.08 };
function startRun() {
  P = {
    x: WORLD.w / 2, y: WORLD.h / 2, dir: 1, anim: 0, moving: 0,
    hp: BASE.hp,
    base: { maxHp: BASE.hp, spd: BASE.spd, dmg: BASE.dmg, rate: BASE.rate,
            reach: BASE.reach, arc: BASE.arc, magnet: BASE.magnet, crit: BASE.crit,
            blades: 1, lifesteal: 0, thorn: 0 },
    timed: [], stacks: {}, ward: 0,
    cd: 0, xp: 0, lvl: 1, next: 9, iframe: 0, swingT: 0, aimA: 0,
    boltCd: 1.4, infT: 0, trail: [],
  };
  recalc();
  foes = []; orbs = []; fx = []; slashes = []; arrows = []; drops = []; blades = []; clones = []; hearts = []; shocks = [];
  bossTier = 0;
  G.scene = 'play'; G.run = 0; G.wave = 1; G.waveT = 0; G.kills = 0; G.shake = 0; G.power = 0; G.toast = [];
  G.msg = 'THEY COME'; G.msgT = 2;
  cam.x = P.x - W / 2; cam.y = P.y - H / 2;
  buildProps();
  if (!groundCv) buildGround();
  spawnWave();
}
function spawnClone() {
  clones.push({ a: Math.random() * 7, r: 78 + clones.length * 26, x: P.x, y: P.y, cd: 0, anim: 0, dir: 1 });
}

/* ------------------------------- waves ----------------------------- */
const WAVE_LEN = 26;
// the horde reads your strength: wave + every powerup you have taken + level
function threat() { return 1 + (G.wave - 1) * 0.30 + G.power * 0.16 + (P.lvl - 1) * 0.07; }
function spawnWave() { const n = 8 + G.wave * 3 + G.power * 2; for (let i = 0; i < n; i++) spawnFoe(); sfx.wave(); }
function spawnBoss() {
  bossTier++;
  spawnFoe('boss');
  G.msg = 'A WARLORD COMES';  G.msgT = 3.2;
  G.shake = 16;
  tone(70, 1.1, 'sawtooth', 0.2, 40);
  setTimeout(() => tone(52, 1.4, 'sawtooth', 0.16, 34), 260);
}
function spawnFoe(forceType) {
  const a = Math.random() * Math.PI * 2, d = 640 + Math.random() * 260;
  let x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
  x = Math.max(40, Math.min(WORLD.w - 40, x)); y = Math.max(40, Math.min(WORLD.h - 40, y));
  const th = threat();
  const roll = Math.random();
  const t = forceType || (G.wave >= 3 && roll < 0.20 ? 'archer' : (G.wave >= 4 && roll > 0.90 ? 'brute' : 'grunt'));
  const cfg = {
    grunt:  { hp: 30 * th, spd: 78 + G.wave * 2.5 + G.power * 1.6, dmg: 7,  sc: 104, xp: 1 },
    archer: { hp: 26 * th, spd: 58 + G.power,                      dmg: 12, sc: 100, xp: 2 },
    brute:  { hp: 110 * th, spd: 52 + G.power * 0.8,               dmg: 22, sc: 158, xp: 4 },
    boss:   { hp: 1400 + bossTier * 1800, spd: 44 + G.wave * 0.6,  dmg: 18, sc: 300, xp: 40 },
  }[t];
  foes.push({ type: t, x, y, hp: cfg.hp, maxHp: cfg.hp, spd: cfg.spd, dmg: cfg.dmg, sc: cfg.sc, xp: cfg.xp,
    anim: Math.random() * 4, dir: 1, hit: 0, dead: false, deadT: 0, spin: 0,
    shootCd: 1 + Math.random() * 2, kb: { x: 0, y: 0 }, burn: 0, bob: Math.random() * 7,
    slamCd: 3.4, boss: t === 'boss' });
}

/* ------------------------------ upgrades --------------------------- */
const UPGRADES = [
  { n: 'HONED EDGE',    d: '+24% blade damage',        ap: b => b.dmg *= 1.24 },
  { n: 'QUICKENED',     d: '+18% swing speed',         ap: b => b.rate *= 0.82 },
  { n: 'LONG REACH',    d: '+18% blade reach',         ap: b => b.reach *= 1.18 },
  { n: 'WIDE CUT',      d: '+26% swing arc',           ap: b => b.arc = Math.min(Math.PI * 2, b.arc * 1.26) },
  { n: 'FLEET FOOT',    d: '+12% movement speed',      ap: b => b.spd *= 1.12 },
  { n: 'IRON BODY',     d: '+28 max life, mended',     ap: b => { b.maxHp += 28; P.hp = Math.min(b.maxHp, P.hp + 28); } },
  { n: 'SPIRIT PULL',   d: '+45% pickup range',        ap: b => b.magnet *= 1.45 },
  { n: 'EXECUTIONER',   d: '+8% critical strike',      ap: b => b.crit += 0.08 },
  { n: 'SECOND BLADE',  d: 'one more blade per swing', ap: b => b.blades += 1 },
  { n: 'BRAMBLE GUARD', d: 'attackers bleed',          ap: b => b.thorn += 14 },
];
function rollChoices() {
  const pool = [...UPGRADES]; choices = [];
  for (let i = 0; i < 3 && pool.length; i++) choices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  G.scene = 'levelup'; sfx.level();
}
function pickUpgrade(i) {
  const u = choices[i]; if (!u) return;
  u.ap(P.base); recalc(); G.scene = 'play'; G.msg = u.n; G.msgT = 1.3;
}

/* ------------------------------- combat ---------------------------- */
function hitCone(ox, oy, ang, reach, arc, dmg, srcCrit) {
  for (const f of foes) {
    if (f.dead) continue;
    const dx = f.x - ox, dy = f.y - oy, d = Math.hypot(dx, dy);
    if (d > reach + 26) continue;
    let diff = Math.abs(((Math.atan2(dy, dx) - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (diff > arc / 2) continue;
    const crit = srcCrit && Math.random() < P.crit;
    damageFoe(f, dmg * (crit ? 2.4 : 1), crit, dx / (d || 1), dy / (d || 1));
  }
}
function swing() {
  const step = Math.PI * 2 / P.blades;
  for (let b = 0; b < P.blades; b++) {
    const a = P.aimA + step * b;
    slashes.push({ x: P.x, y: P.y - 34, a, t: 0, life: 0.22, reach: P.reach, arc: P.arc });
    hitCone(P.x, P.y, a, P.reach, P.arc, P.dmg, true);
    if (P.storm) {
      for (let s = 0; s < P.storm; s++) {
        const sa = a + (s - (P.storm - 1) / 2) * 0.22;
        blades.push({ x: P.x, y: P.y - 30, vx: Math.cos(sa) * 520, vy: Math.sin(sa) * 520, life: 1.1, dmg: P.dmg * 0.6, r: 0 });
      }
    }
  }
  P.swingT = 0.22; sfx.slash();
}
function damageFoe(f, dmg, crit, nx, ny) {
  f.hp -= dmg; f.hit = 0.14;
  const k = crit ? 280 : 165;
  f.kb.x += nx * k; f.kb.y += ny * k;
  popNum(f.x, f.y - 44, Math.round(dmg), crit);
  for (let i = 0; i < (crit ? 10 : 4); i++) {
    const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 230;
    fx.push({ x: f.x, y: f.y - 32, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: 0.4, col: crit ? '#ff9a4a' : '#c8242e', s: crit ? 4 : 3 });
  }
  if (f.hp <= 0 && !f.dead) {
    f.dead = true; f.deadT = 0; f.spin = (Math.random() - 0.5) * 5;
    G.kills++; sfx.kill();
    orbs.push({ x: f.x, y: f.y, v: f.xp, t: 0 });
    if (P.lifesteal) P.hp = Math.min(P.maxHp, P.hp + P.lifesteal);
    G.shake = Math.max(G.shake, crit ? 6 : 3);
    if (G.kills % POWER_EVERY === 0) drops.push({ x: f.x, y: f.y, i: Math.floor(Math.random() * POWERS.length), t: 0 });
    if (f.boss) {
      // a warlord is worth a hoard
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        drops.push({ x: f.x + Math.cos(a) * 70, y: f.y + Math.sin(a) * 50, i: Math.floor(Math.random() * POWERS.length), t: 0 });
      }
      for (let i = 0; i < 6; i++) hearts.push({ x: f.x + (Math.random() - 0.5) * 150, y: f.y + (Math.random() - 0.5) * 110, t: 0, v: 12 + Math.round(P.maxHp * 0.06) });
      G.msg = 'THE WARLORD FALLS'; G.msgT = 3; G.shake = 20;
    }
    // small health morsels — never a full heal, just a steady way back up
    const hurtBonus = P.hp / P.maxHp < 0.45 ? 0.09 : 0;
    if (Math.random() < 0.085 + hurtBonus) hearts.push({ x: f.x, y: f.y, t: 0, v: 8 + Math.round(P.maxHp * 0.05) });
  } else if (f.hp > 0) sfx.hit();
}
function popHeal(x, y, v) { fx.push({ x, y: y - 30, vx: 0, vy: -60, t: 0, life: 0.8, num: '+' + v, heal: true }); }
function popNum(x, y, v, crit) { fx.push({ x, y, vx: (Math.random() - 0.5) * 40, vy: -74, t: 0, life: 0.7, num: v, crit }); }
function hurtPlayer(d, f) {
  if (P.iframe > 0) return;
  const warded = d * Math.max(0.35, 1 - (P.ward || 0) * 0.18);
  P.hp -= warded; P.iframe = 0.82; G.shake = 10; G.flash = 0.55; sfx.hurt();
  if (f && P.thorn) damageFoe(f, P.thorn, false, 0, 0);
  if (P.hp <= 0) {
    P.hp = 0; G.scene = 'dead';
    if (G.run > G.best) { G.best = Math.floor(G.run); try { localStorage.setItem('swarm-best', String(G.best)); } catch {} }
  }
}

/* ------------------------------- update ---------------------------- */
function update(dt) {
  G.t += dt; G.run += dt; G.waveT += dt;
  G.shake *= Math.pow(0.015, dt);
  G.flash = Math.max(0, G.flash - dt * 2);
  G.msgT = Math.max(0, G.msgT - dt);
  P.iframe = Math.max(0, P.iframe - dt);
  P.swingT = Math.max(0, P.swingT - dt);
  for (const t of G.toast) t.t += dt;
  G.toast = G.toast.filter(t => t.t < 2.6);
  // powers burn down and fall away — nothing you hold is permanent
  if (P.timed.length) {
    let any = false;
    for (const inst of P.timed) { inst.t -= dt; if (inst.t <= 0) any = true; }
    if (any) {
      const gone = P.timed.filter(i => i.t <= 0);
      P.timed = P.timed.filter(i => i.t > 0);
      recalc();
      for (const gi of gone) {
        const pw = POWERS.find(p => p.k === gi.k);
        G.toast.push({ txt: pw.n + ' FADES', sub: 'the power leaves you', c: 'rgba(170,160,170,.9)', t: 0 });
      }
      tone(220, 0.3, 'sine', 0.06, 110);
    }
  }

  if (G.waveT >= WAVE_LEN) { G.wave++; G.waveT = 0; spawnWave(); G.msg = 'WAVE ' + G.wave; G.msgT = 1.8; }
  // every thousand souls, something far worse walks onto the field
  if (Math.floor(G.kills / BOSS_EVERY) > bossTier) spawnBoss();
  const cap = 10 + G.wave * 3 + G.power * 3;
  if (foes.filter(f => !f.dead).length < cap && Math.random() < dt * (2 + G.wave * 0.4 + G.power * 0.3)) spawnFoe();

  /* movement */
  let mx = (key.KeyD || key.ArrowRight ? 1 : 0) - (key.KeyA || key.ArrowLeft ? 1 : 0);
  let my = (key.KeyS || key.ArrowDown ? 1 : 0) - (key.KeyW || key.ArrowUp ? 1 : 0);
  if (stick.active) { mx = stick.dx; my = stick.dy; }
  const ml = Math.hypot(mx, my);
  if (ml > 0.02) {
    mx /= Math.max(1, ml); my /= Math.max(1, ml);
    if (Math.abs(mx) > 0.05) P.dir = mx >= 0 ? 1 : -1;
    P.anim += dt;
    P.moving = Math.min(1, P.moving + dt * 6);
  } else P.moving = Math.max(0, P.moving - dt * 7);
  P.x = Math.max(30, Math.min(WORLD.w - 30, P.x + mx * P.spd * dt));
  P.y = Math.max(40, Math.min(WORLD.h - 24, P.y + my * P.spd * dt));
  P.trail.push({ x: P.x, y: P.y, t: 0, dir: P.dir });
  if (P.trail.length > 7) P.trail.shift();

  /* camera — smooth follow, clamped to the field */
  const tx = Math.max(0, Math.min(WORLD.w - W, P.x - W / 2));
  const ty = Math.max(0, Math.min(WORLD.h - H, P.y - H / 2));
  cam.x += (tx - cam.x) * Math.min(1, dt * 6);
  cam.y += (ty - cam.y) * Math.min(1, dt * 6);

  /* aim + auto swing */
  let near = null, nd = 1e9;
  for (const f of foes) { if (f.dead) continue; const d = (f.x - P.x) ** 2 + (f.y - P.y) ** 2; if (d < nd) { nd = d; near = f; } }
  if (near) P.aimA = Math.atan2(near.y - P.y, near.x - P.x);
  P.cd -= dt;
  if (P.cd <= 0 && near && Math.sqrt(nd) < P.reach + 80) { swing(); P.cd = P.rate; }

  /* thunder */
  if (P.thunder) {
    P.boltCd -= dt * P.thunder;
    if (P.boltCd <= 0) {
      P.boltCd = 1.5;
      const live = foes.filter(f => !f.dead && Math.hypot(f.x - P.x, f.y - P.y) < 480);
      if (live.length) {
        const tgt = live[Math.floor(Math.random() * live.length)];
        fx.push({ x: tgt.x, y: tgt.y, t: 0, life: 0.3, bolt: true });
        damageFoe(tgt, P.dmg * 1.3 * P.thunder, true, 0, -1);
        sfx.bolt();
      }
    }
  }
  /* inferno aura */
  if (P.inferno) {
    P.infT -= dt;
    if (P.infT <= 0) {
      P.infT = 0.42;
      for (const f of foes) {
        if (f.dead) continue;
        if (Math.hypot(f.x - P.x, f.y - P.y) < 128 + P.inferno * 16) { damageFoe(f, 7 * P.inferno, false, 0, 0); f.burn = 0.4; }
      }
    }
  }
  /* shadow clones orbit and cut */
  for (const c of clones) {
    c.a += dt * 1.25; c.anim += dt;
    const txc = P.x + Math.cos(c.a) * c.r, tyc = P.y + Math.sin(c.a) * c.r;
    c.dir = txc > c.x ? 1 : -1;
    c.x += (txc - c.x) * Math.min(1, dt * 7); c.y += (tyc - c.y) * Math.min(1, dt * 7);
    c.cd -= dt;
    if (c.cd <= 0) {
      let cn = null, cnd = 1e9;
      for (const f of foes) { if (f.dead) continue; const d = (f.x - c.x) ** 2 + (f.y - c.y) ** 2; if (d < cnd) { cnd = d; cn = f; } }
      if (cn && Math.sqrt(cnd) < 130) {
        const a = Math.atan2(cn.y - c.y, cn.x - c.x);
        slashes.push({ x: c.x, y: c.y - 28, a, t: 0, life: 0.2, reach: 108, arc: 1.5, ghost: true });
        hitCone(c.x, c.y, a, 108, 1.5, P.dmg * 0.5, false);
        c.cd = P.rate * 1.25;
      } else c.cd = 0.25;
    }
  }

  /* foes */
  const slowMul = P.frost ? Math.max(0.45, 1 - P.frost * 0.16) : 1;
  for (const f of foes) {
    if (f.dead) { f.deadT += dt; continue; }
    f.anim += dt; f.hit = Math.max(0, f.hit - dt); f.burn = Math.max(0, f.burn - dt);
    const dx = P.x - f.x, dy = P.y - f.y, d = Math.hypot(dx, dy) || 1;
    f.dir = dx >= 0 ? 1 : -1;
    f.x += f.kb.x * dt; f.y += f.kb.y * dt;
    f.kb.x *= Math.pow(0.0005, dt); f.kb.y *= Math.pow(0.0005, dt);
    const sp = f.spd * slowMul;
    if (f.type === 'archer') {
      const want = 270;
      const dir = d > want + 30 ? 1 : (d < want - 50 ? -1 : 0);
      f.x += (dx / d) * sp * dir * dt; f.y += (dy / d) * sp * dir * dt;
      f.shootCd -= dt;
      if (f.shootCd <= 0 && d < 470) {
        f.shootCd = 2.2 + Math.random();
        arrows.push({ x: f.x, y: f.y - 34, vx: (dx / d) * 320, vy: (dy / d) * 320, life: 3, dmg: f.dmg });
      }
    } else if (f.boss) {
      f.x += (dx / d) * sp * dt; f.y += (dy / d) * sp * dt;
      if (d < 74) hurtPlayer(f.dmg, f);
      f.slamT = Math.max(0, (f.slamT || 0) - dt);
      f.slamCd -= dt;
      if (f.slamCd <= 0 && d < 460) {
        f.slamCd = 5.4;
        f.slamT = 0.95;              // the club is going up — read it and move
        const fb = f, dmgv = Math.round(f.dmg * 0.7);
        setTimeout(() => {
          if (!fb.dead) {
            shocks.push({ x: fb.x, y: fb.y, r: 10, max: 270, dmg: dmgv, t: 0, hit: false });
            G.shake = 14; tone(60, 0.5, 'sawtooth', 0.16, 30);
          }
        }, 620);
        tone(150, 0.4, 'triangle', 0.08, 300);   // the wind-up growl
      }
    } else {
      f.x += (dx / d) * sp * dt; f.y += (dy / d) * sp * dt;
      if (d < 44) hurtPlayer(f.dmg, f);
    }
    f.x = Math.max(10, Math.min(WORLD.w - 10, f.x)); f.y = Math.max(20, Math.min(WORLD.h - 10, f.y));
  }
  for (let i = 0; i < foes.length; i++) {
    const f = foes[i]; if (f.dead) continue;
    for (let j = i + 1; j < Math.min(foes.length, i + 9); j++) {
      const o = foes[j]; if (o.dead) continue;
      const ox = f.x - o.x, oy = f.y - o.y, od = Math.hypot(ox, oy);
      if (od > 0.1 && od < 36) { const pu = (36 - od) * 2.4 * dt; f.x += (ox / od) * pu; f.y += (oy / od) * pu; o.x -= (ox / od) * pu; o.y -= (oy / od) * pu; }
    }
  }
  foes = foes.filter(f => !f.dead || f.deadT < 0.8);

  /* boss shockwaves */
  for (const w of shocks) {
    w.t += dt; w.r = w.max * Math.min(1, w.t / 0.72);
    const pd = Math.hypot(P.x - w.x, P.y - w.y);
    if (!w.hit && Math.abs(pd - w.r) < 46) { w.hit = true; hurtPlayer(w.dmg, null); }
  }
  shocks = shocks.filter(w => w.t < 0.75);

  /* flying blades */
  for (const b of blades) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; b.r += dt * 22;
    for (const f of foes) {
      if (f.dead) continue;
      if (Math.hypot(f.x - b.x, f.y - (b.y + 26)) < 34) { damageFoe(f, b.dmg, false, b.vx / 500, b.vy / 500); b.life = 0; break; }
    }
  }
  blades = blades.filter(b => b.life > 0);

  /* arrows */
  for (const a of arrows) {
    a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt;
    if (Math.hypot(a.x - P.x, a.y - (P.y - 34)) < 26) { hurtPlayer(a.dmg, null); a.life = 0; }
  }
  arrows = arrows.filter(a => a.life > 0);

  /* orbs */
  for (const o of orbs) {
    o.t += dt;
    const dx = P.x - o.x, dy = (P.y - 30) - o.y, d = Math.hypot(dx, dy) || 1;
    if (d < P.magnet) { const pull = 560 * Math.min(1, (P.magnet - d) / P.magnet + 0.4); o.x += (dx / d) * pull * dt; o.y += (dy / d) * pull * dt; }
    if (d < 28) {
      o.got = true; P.xp += o.v; sfx.xp();
      if (P.xp >= P.next) { P.xp -= P.next; P.lvl++; P.next = Math.round(P.next * 1.42 + 4); rollChoices(); }
    }
  }
  orbs = orbs.filter(o => !o.got);

  /* health morsels */
  for (const h of hearts) {
    h.t += dt;
    const dx = P.x - h.x, dy = (P.y - 30) - h.y, d = Math.hypot(dx, dy) || 1;
    if (d < P.magnet * 0.85) { const pull = 480 * Math.min(1, (P.magnet - d) / P.magnet + 0.4); h.x += (dx / d) * pull * dt; h.y += (dy / d) * pull * dt; }
    if (d < 30) {
      h.got = true;
      if (P.hp < P.maxHp) {
        P.hp = Math.min(P.maxHp, P.hp + h.v);
        popHeal(h.x, h.y, h.v);
        tone(660, 0.1, 'sine', 0.05, 990);
        for (let i = 0; i < 8; i++) {
          const a = Math.random() * Math.PI * 2, sp = 50 + Math.random() * 130;
          fx.push({ x: h.x, y: h.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, t: 0, life: 0.45, col: '#4ade80', s: 3 });
        }
      }
    }
    if (h.t > 16) h.got = true;   // they fade if left too long
  }
  hearts = hearts.filter(h => !h.got);

  /* powerup drops */
  for (const d of drops) {
    d.t += dt;
    if (Math.hypot(d.x - P.x, d.y - (P.y - 26)) < 46) { d.got = true; takePower(d); }
  }
  drops = drops.filter(d => !d.got);

  /* fx */
  for (const s of fx) { s.t += dt; if (!s.bolt) { s.x += (s.vx || 0) * dt; s.y += (s.vy || 0) * dt; if (s.vy != null && s.num == null) s.vy += 640 * dt; } }
  fx = fx.filter(s => s.t < s.life);
  for (const s of slashes) s.t += dt;
  slashes = slashes.filter(s => s.t < s.life);
}

/* ------------------------------ drawing ---------------------------- */
const SX = (x) => x - cam.x, SY = (y) => y - cam.y;
function vis(x, y, m = 180) { const sx = SX(x), sy = SY(y); return sx > -m && sx < W + m && sy > -m && sy < H + m; }
function brush(txt, x, y, size, col, align = 'center', alpha = 1) {
  g.save(); g.globalAlpha = alpha;
  g.font = `700 ${size}px "Yu Mincho","Hiragino Mincho ProN",Georgia,serif`;
  g.textAlign = align; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 8; g.shadowOffsetY = 2;
  g.fillStyle = col; g.fillText(txt, x, y); g.restore();
}
function drawWorld() {
  if (groundCv) {
    const ts = 700;
    const x0 = Math.floor(cam.x / ts) * ts, y0 = Math.floor(cam.y / ts) * ts;
    for (let x = x0; x < cam.x + W + ts; x += ts)
      for (let y = y0; y < cam.y + H + ts; y += ts)
        g.drawImage(groundCv, SX(x), SY(y));
  } else { g.fillStyle = '#2c2028'; g.fillRect(0, 0, W, H); }
  const mg = g.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H * 0.42, 620);
  mg.addColorStop(0, 'rgba(255,170,110,.13)'); mg.addColorStop(1, 'rgba(120,40,40,0)');
  g.fillStyle = mg; g.fillRect(0, 0, W, H);

  for (const p of props) {
    if (!vis(p.x, p.y, 60)) continue;
    const x = SX(p.x), y = SY(p.y);
    if (p.t === 'rock') {
      g.fillStyle = 'rgba(58,44,54,.95)';
      g.beginPath(); g.ellipse(x, y, 13 * p.s, 8 * p.s, p.r, 0, 7); g.fill();
      g.fillStyle = 'rgba(96,78,90,.5)';
      g.beginPath(); g.ellipse(x - 2, y - 2, 7 * p.s, 4 * p.s, p.r, 0, 7); g.fill();
    } else if (p.t === 'grass') {
      g.strokeStyle = 'rgba(120,110,80,.4)'; g.lineWidth = 1.6;
      for (let i = -2; i <= 2; i++) {
        g.beginPath(); g.moveTo(x + i * 3, y);
        g.quadraticCurveTo(x + i * 4, y - 11 * p.s, x + i * 6 + Math.sin(G.t + p.r + i) * 2, y - 16 * p.s);
        g.stroke();
      }
    } else {
      g.strokeStyle = 'rgba(190,180,165,.30)'; g.lineWidth = 2.4;
      g.save(); g.translate(x, y); g.rotate(p.r);
      g.beginPath(); g.moveTo(-9 * p.s, 0); g.lineTo(9 * p.s, 0); g.stroke();
      g.restore();
    }
  }
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const b of braziers) {
    if (!vis(b.x, b.y, 240)) continue;
    const fl = 0.82 + 0.18 * Math.sin(G.t * 9 + b.x);
    const tg = g.createRadialGradient(SX(b.x), SY(b.y), 8, SX(b.x), SY(b.y), 210 * fl);
    tg.addColorStop(0, 'rgba(255,170,80,.30)'); tg.addColorStop(0.5, 'rgba(255,120,50,.10)'); tg.addColorStop(1, 'rgba(255,100,40,0)');
    g.fillStyle = tg; g.beginPath(); g.arc(SX(b.x), SY(b.y), 210 * fl, 0, 7); g.fill();
  }
  g.restore();
  for (const b of braziers) {
    if (!vis(b.x, b.y, 120)) continue;
    if (ENV && ENV.toro) { const h = 82, w = h * (ENV.toro.width / ENV.toro.height); g.drawImage(ENV.toro, SX(b.x) - w / 2, SY(b.y) - h * 0.74, w, h); }
    const fl = 0.8 + 0.2 * Math.sin(G.t * 11 + b.y);
    g.fillStyle = `rgba(255,${Math.round(170 + fl * 60)},${Math.round(80 * fl)},.95)`;
    g.beginPath(); g.ellipse(SX(b.x), SY(b.y) - 38, 7 * fl, 13 * fl, 0, 0, 7); g.fill();
  }
  g.strokeStyle = 'rgba(200,80,60,.35)'; g.lineWidth = 4;
  g.strokeRect(SX(0), SY(0), WORLD.w, WORLD.h);
}
function drawFoe(f) {
  if (!vis(f.x, f.y)) return;
  const a = f.dead ? Math.max(0, 1 - f.deadT * 1.3) : 1;
  const x = SX(f.x), y = SY(f.y) + (f.dead ? 0 : Math.sin(f.anim * 6 + f.bob) * 1.6);
  if (!SPR) { g.globalAlpha = a; g.fillStyle = '#3a2030'; g.fillRect(x - 14, y - 60, 28, 60); g.globalAlpha = 1; return; }
  if (f.boss) {
    // animated strips take priority over the still
    if (BOSS && !f.dead) {
      const slamming = (f.slamT || 0) > 0;
      const strip = slamming ? BOSS.slam : BOSS.walk;
      const idx = slamming
        ? Math.min(strip.length - 1, (0.95 - f.slamT) * 26)
        : (f.anim * 13) % strip.length;
      g.save();
      g.filter = f.hit > 0 ? 'brightness(2.2) saturate(0.4)' : 'brightness(0.98) saturate(1.2)';
      drawSprite(g, frameOf(strip, idx), x, y, f.sc, f.dir < 0, a);
      g.restore();
      // menace glow + a warning ring while the club is up
      g.save(); g.globalAlpha = 0.25 + 0.1 * Math.sin(G.t * 4);
      const bgm = g.createRadialGradient(x, y - f.sc * 0.4, 10, x, y - f.sc * 0.4, f.sc * 0.7);
      bgm.addColorStop(0, 'rgba(220,40,30,.45)'); bgm.addColorStop(1, 'rgba(220,40,30,0)');
      g.fillStyle = bgm; g.beginPath(); g.arc(x, y - f.sc * 0.4, f.sc * 0.7, 0, 7); g.fill();
      g.restore();
      if (slamming) {
        const grow = 1 - (f.slamT / 0.95);
        g.save();
        g.strokeStyle = 'rgba(255,120,60,' + (0.25 + grow * 0.55) + ')';
        g.lineWidth = 3;
        g.beginPath(); g.ellipse(x, y, 270 * grow, 270 * grow * 0.44, 0, 0, 7); g.stroke();
        g.restore();
      }
      if (f.hp < f.maxHp) {
        const wbar = 60;
        g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x - wbar / 2, y - f.sc * 0.92, wbar, 5);
        g.fillStyle = '#ff3a2a'; g.fillRect(x - wbar / 2, y - f.sc * 0.92, wbar * (f.hp / f.maxHp), 5);
      }
      return;
    }
    const img = ENV && ENV.boss;
    const sway = Math.sin(f.anim * 2.2) * 4;
    if (img) {
      const bh = f.sc, bw = bh * (img.width / img.height);
      g.save();
      g.filter = f.hit > 0 ? 'brightness(2.2) saturate(0.4)' : 'brightness(0.95) saturate(1.2)';
      g.globalAlpha = a;
      if (f.dead) { g.translate(x, y); g.rotate(f.spin * f.deadT * 0.4); g.translate(-x, -y); }
      if (f.dir < 0) { g.translate(x, 0); g.scale(-1, 1); g.translate(-x, 0); }
      g.drawImage(img, x - bw / 2 + sway, y - bh, bw, bh);
      g.restore();
      // menace glow
      g.save(); g.globalAlpha = 0.25 + 0.1 * Math.sin(G.t * 4);
      const bg2 = g.createRadialGradient(x, y - bh * 0.4, 10, x, y - bh * 0.4, bh * 0.7);
      bg2.addColorStop(0, 'rgba(220,40,30,.45)'); bg2.addColorStop(1, 'rgba(220,40,30,0)');
      g.fillStyle = bg2; g.beginPath(); g.arc(x, y - bh * 0.4, bh * 0.7, 0, 7); g.fill();
      g.restore();
    } else {
      g.fillStyle = 'rgba(120,20,20,.9)'; g.fillRect(x - 60, y - f.sc, 120, f.sc);
    }
    return;
  }
  let frame;
  if (f.dead) frame = frameOf(SPR.gHurt, Math.min(SPR.gHurt.length - 1, f.deadT * 30));
  else if (f.type === 'archer') frame = frameOf(SPR.archer, (f.anim * 8) % 24);
  else frame = frameOf(SPR.gRun, (f.anim * 19) % SPR.gRun.length);
  g.save();
  if (f.dead) { g.translate(x, y); g.rotate(f.spin * f.deadT); g.translate(-x, -y); }
  g.filter = f.hit > 0 ? 'brightness(2.6) saturate(0.3)'
           : f.burn > 0 ? 'brightness(1.5) sepia(0.6) saturate(3)'
           : 'brightness(0.74) saturate(1.35)';
  drawSprite(g, frame, x, y, f.sc, f.dir < 0, a);
  g.restore();
  if (!f.dead && f.hp < f.maxHp) {
    const w = 34;
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x - w / 2, y - f.sc * 0.82, w, 3);
    g.fillStyle = '#c92222'; g.fillRect(x - w / 2, y - f.sc * 0.82, w * (f.hp / f.maxHp), 3);
  }
}
function drawSlashes() {
  for (const s of slashes) {
    const k = 1 - s.t / s.life;
    g.save();
    g.translate(SX(s.x), SY(s.y)); g.rotate(s.a);
    const grd = g.createRadialGradient(0, 0, s.reach * 0.26, 0, 0, s.reach);
    grd.addColorStop(0, 'rgba(255,240,220,0)');
    grd.addColorStop(0.7, s.ghost ? `rgba(200,170,255,${0.22 * k})` : `rgba(255,228,205,${0.32 * k})`);
    grd.addColorStop(1, s.ghost ? `rgba(150,110,255,${0.18 * k})` : `rgba(210,50,45,${0.18 * k})`);
    g.fillStyle = grd;
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, s.reach, -s.arc / 2, s.arc / 2); g.closePath(); g.fill();
    g.strokeStyle = `rgba(255,250,240,${0.8 * k})`; g.lineWidth = 3 * k + 0.6;
    g.beginPath(); g.arc(0, 0, s.reach * (0.7 + 0.3 * (1 - k)), -s.arc / 2, s.arc / 2); g.stroke();
    g.restore();
  }
}
function drawPlayerRing() {
  const p = 0.72 + 0.28 * Math.sin(G.t * 4);
  const x = SX(P.x), y = SY(P.y) - 4;
  g.save();
  const rg = g.createRadialGradient(x, y, 4, x, y, 56);
  rg.addColorStop(0, `rgba(255,228,170,${0.30 * p})`);
  rg.addColorStop(0.6, `rgba(255,170,90,${0.14 * p})`);
  rg.addColorStop(1, 'rgba(255,140,60,0)');
  g.fillStyle = rg; g.beginPath(); g.ellipse(x, y, 56, 21, 0, 0, 7); g.fill();
  g.strokeStyle = `rgba(255,225,160,${0.5 * p})`; g.lineWidth = 2;
  g.beginPath(); g.ellipse(x, y, 31, 11, 0, 0, 7); g.stroke();
  if (P.inferno) {
    const r = 128 + P.inferno * 16;
    g.strokeStyle = `rgba(255,140,50,${0.22 + 0.12 * Math.sin(G.t * 8)})`; g.lineWidth = 3;
    g.beginPath(); g.ellipse(x, y, r, r * 0.42, 0, 0, 7); g.stroke();
  }
  g.restore();
}
function drawPlayer() {
  const x = SX(P.x), y = SY(P.y);
  if (!SPR) { g.fillStyle = '#e8d9c8'; g.fillRect(x - 12, y - 66, 24, 66); return; }
  let frame;
  if (P.swingT > 0) frame = frameOf(SPR.slash, 14 + (0.22 - P.swingT) * 100);
  else if (P.moving > 0.3) frame = frameOf(SPR.run, (P.anim * 24) % SPR.run.length);
  else frame = frameOf(SPR.idle, (G.t * 10) % SPR.idle.length);
  if (P.moving > 0.6) {
    for (let i = 0; i < P.trail.length - 1; i++) {
      const tr = P.trail[i];
      g.save(); g.globalAlpha = 0.09 * (i / P.trail.length);
      g.filter = 'brightness(0.5) saturate(2)';
      drawSprite(g, frame, SX(tr.x), SY(tr.y), 128, tr.dir < 0, 1);
      g.restore();
    }
  }
  const blink = P.iframe > 0 && Math.floor(P.iframe * 22) % 2 === 0;
  const bob = P.moving > 0.3 ? Math.sin(P.anim * 24) * 2 : Math.sin(G.t * 2.4) * 1.2;
  g.save();
  g.filter = blink ? 'brightness(2.4)' : 'brightness(1.26) saturate(1.15)';
  drawSprite(g, frame, x, y + bob, 130, P.dir < 0, 1);
  g.restore();
}
function drawClones() {
  if (!SPR) return;
  for (const c of clones) {
    if (!vis(c.x, c.y)) continue;
    const frame = frameOf(SPR.run, (c.anim * 20) % SPR.run.length);
    g.save(); g.globalAlpha = 0.5; g.filter = 'brightness(0.4) saturate(2.2) hue-rotate(250deg)';
    drawSprite(g, frame, SX(c.x), SY(c.y), 112, c.dir < 0, 1);
    g.restore();
  }
}
function drawHearts() {
  for (const h of hearts) {
    if (!vis(h.x, h.y, 60)) continue;
    const fade = h.t > 13 ? (Math.floor(h.t * 6) % 2 ? 0.3 : 1) : 1;
    const x = SX(h.x), y = SY(h.y) - 18 + Math.sin(G.t * 4 + h.x) * 4;
    const p = 0.65 + 0.35 * Math.sin(G.t * 5 + h.y);
    g.save(); g.globalAlpha = fade;
    const gr = g.createRadialGradient(x, y, 1, x, y, 26);
    gr.addColorStop(0, 'rgba(90,240,150,.55)'); gr.addColorStop(1, 'rgba(60,200,120,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, 26 * p, 0, 7); g.fill();
    // small jade flask
    g.fillStyle = '#4ade80'; g.strokeStyle = 'rgba(240,255,245,.9)'; g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(x, y + 7);
    g.bezierCurveTo(x - 9, y + 1, x - 7, y - 7, x, y - 3);
    g.bezierCurveTo(x + 7, y - 7, x + 9, y + 1, x, y + 7);
    g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
}
function drawDrops() {
  for (const d of drops) {
    if (!vis(d.x, d.y, 80)) continue;
    const pw = POWERS[d.i];
    const x = SX(d.x), y = SY(d.y) - 26 + Math.sin(G.t * 3 + d.t) * 6;
    const p = 0.6 + 0.4 * Math.sin(G.t * 6);
    g.save();
    const gr = g.createRadialGradient(x, y, 2, x, y, 46);
    gr.addColorStop(0, pw.c + 'cc'); gr.addColorStop(0.35, pw.c + '44'); gr.addColorStop(1, pw.c + '00');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, 46 * p, 0, 7); g.fill();
    g.translate(x, y); g.rotate(G.t * 1.6);
    g.fillStyle = pw.c; g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -13); g.lineTo(11, 0); g.lineTo(0, 13); g.lineTo(-11, 0); g.closePath();
    g.fill(); g.stroke();
    g.restore();
    brush(pw.n, x, y - 40, 12, pw.c, 'center', 0.9);
  }
}
/* --------------------------- power visuals -------------------------
   every power the ronin carries paints itself around him, and stacks
   add more of that power's element so combinations read at a glance. */
function drawPowerAuras() {
  const FX = FX_IMG;
  if (!FX) return;
  const x = SX(P.x), y = SY(P.y);
  const st = P.stacks;

  // FURY — ember wisps spiral tight and fast around the blade arm
  if (st.fury && FX.fury) {
    const n = 3 + st.fury * 2;
    for (let i = 0; i < n; i++) {
      const a = G.t * 5.2 + (i / n) * Math.PI * 2;
      const r = 44 + Math.sin(G.t * 6 + i) * 9;
      const s = 26 + st.fury * 2;
      g.save(); g.globalAlpha = 0.65;
      g.translate(x + Math.cos(a) * r, y - 40 + Math.sin(a) * r * 0.42);
      g.rotate(a + Math.PI / 2);
      g.drawImage(FX.fury, -s / 2, -s / 2, s, s); g.restore();
    }
  }
  // WHIRLWIND — crescents sweep a wide ring
  if (st.whirl && FX.whirl) {
    const n = 2 + st.whirl;
    for (let i = 0; i < n; i++) {
      const a = -G.t * 3.4 + (i / n) * Math.PI * 2;
      const r = 78 + st.whirl * 8;
      const s = 52 + st.whirl * 5;
      g.save(); g.globalAlpha = 0.5;
      g.translate(x + Math.cos(a) * r, y - 34 + Math.sin(a) * r * 0.4);
      g.rotate(a + Math.PI / 2);
      g.drawImage(FX.whirl, -s / 2, -s / 2, s, s); g.restore();
    }
  }
  // FROST — shards hang and slowly turn, misting the ground
  if (st.frost && FX.frost) {
    const n = 3 + st.frost;
    for (let i = 0; i < n; i++) {
      const a = G.t * 1.1 + (i / n) * Math.PI * 2;
      const r = 62, s = 24 + st.frost * 3;
      g.save(); g.globalAlpha = 0.62;
      g.translate(x + Math.cos(a) * r, y - 56 + Math.sin(a) * r * 0.34 + Math.sin(G.t * 2 + i) * 5);
      g.rotate(Math.sin(G.t + i) * 0.4);
      g.drawImage(FX.frost, -s / 2, -s / 2, s, s); g.restore();
    }
    g.save(); g.globalAlpha = 0.10 + 0.04 * Math.sin(G.t * 3);
    g.fillStyle = '#9adfff';
    g.beginPath(); g.ellipse(x, y - 6, 120 + st.frost * 14, 44 + st.frost * 5, 0, 0, 7); g.fill();
    g.restore();
  }
  // BLOOD DRINKER — droplets rise off him
  if (st.vamp && FX.vamp) {
    const n = 2 + st.vamp;
    for (let i = 0; i < n; i++) {
      const ph = (G.t * 0.9 + i / n) % 1;
      const s = 20 + st.vamp * 2;
      g.save(); g.globalAlpha = 0.7 * (1 - ph);
      g.translate(x + Math.sin(i * 2.4 + G.t) * 26, y - 20 - ph * 74);
      g.drawImage(FX.vamp, -s / 2, -s / 2, s, s); g.restore();
    }
  }
  // INFERNO — a ring of flames on the burn radius
  if (st.inferno && FX.inferno) {
    const r = 128 + st.inferno * 16;
    const n = 8 + st.inferno * 3;
    for (let i = 0; i < n; i++) {
      const a = G.t * 0.7 + (i / n) * Math.PI * 2;
      const fl = 0.8 + 0.2 * Math.sin(G.t * 9 + i);
      const s = (30 + st.inferno * 3) * fl;
      g.save(); g.globalAlpha = 0.72;
      g.translate(x + Math.cos(a) * r, y - 4 + Math.sin(a) * r * 0.42);
      g.drawImage(FX.inferno, -s / 2, -s * 0.8, s, s); g.restore();
    }
  }
  // IRON WILL — ward plates orbit as a shield
  if (st.iron && FX.iron) {
    const n = 3 + st.iron;
    for (let i = 0; i < n; i++) {
      const a = G.t * 1.5 + (i / n) * Math.PI * 2;
      const r = 54, s = 26 + st.iron * 2;
      g.save(); g.globalAlpha = 0.6 + 0.15 * Math.sin(G.t * 4 + i);
      g.translate(x + Math.cos(a) * r, y - 46 + Math.sin(a) * r * 0.5);
      g.drawImage(FX.iron, -s / 2, -s / 2, s, s); g.restore();
    }
  }
  // SHADOW STEP — wind streaks stream off him when he moves
  if (st.swift && FX.swift && P.moving > 0.25) {
    const n = 2 + st.swift;
    for (let i = 0; i < n; i++) {
      const s = 40 + st.swift * 4;
      g.save(); g.globalAlpha = 0.42 * P.moving;
      g.translate(x - P.dir * (26 + i * 17), y - 34 + Math.sin(G.t * 8 + i * 2) * 12);
      g.scale(P.dir, 1);
      g.drawImage(FX.swift, -s / 2, -s / 2, s, s); g.restore();
    }
  }
  // SHADOW CLONE — smoke curls at each clone
  if (st.clone && FX.clone) {
    for (const c of clones) {
      if (!vis(c.x, c.y)) continue;
      const s = 46;
      g.save(); g.globalAlpha = 0.45 + 0.15 * Math.sin(G.t * 5 + c.a);
      g.translate(SX(c.x), SY(c.y) - 26); g.rotate(Math.sin(G.t * 2 + c.a) * 0.3);
      g.drawImage(FX.clone, -s / 2, -s / 2, s, s); g.restore();
    }
  }
}

function drawHud() {
  const bw = 250;
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(20, 18, bw, 15);
  const hg = g.createLinearGradient(20, 0, 20 + bw, 0);
  hg.addColorStop(0, '#c92222'); hg.addColorStop(1, '#ff6a4a');
  g.fillStyle = hg; g.fillRect(20, 18, bw * Math.max(0, P.hp / P.maxHp), 15);
  g.strokeStyle = 'rgba(200,60,50,.5)'; g.lineWidth = 1; g.strokeRect(20, 18, bw, 15);
  brush(`${Math.ceil(P.hp)} / ${P.maxHp}`, 26, 25, 11, '#f0e0d0', 'left');
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(20, 38, bw, 6);
  g.fillStyle = '#d9c281'; g.fillRect(20, 38, bw * Math.min(1, P.xp / P.next), 6);
  brush('LV ' + P.lvl, 20 + bw + 10, 40, 13, '#d9c281', 'left');
  const m = Math.floor(G.run / 60), s = Math.floor(G.run % 60);
  brush(`${m}:${String(s).padStart(2, '0')}`, W / 2, 30, 30, '#e8d9c8');
  brush('WAVE ' + G.wave, W - 24, 24, 16, '#b9a695', 'right');
  brush(G.kills + ' SLAIN', W - 24, 46, 13, '#8a7a6a', 'right');
  g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(W - 150, 56, 126, 4);
  g.fillStyle = 'rgba(200,60,50,.75)'; g.fillRect(W - 150, 56, 126 * (G.waveT / WAVE_LEN), 4);
  // active powers, each draining toward nothing
  let px = 22, py = 58;
  const byKey = {};
  for (const inst of P.timed) { (byKey[inst.k] = byKey[inst.k] || []).push(inst); }
  for (const k in byKey) {
    const pw = POWERS.find(p => p.k === k);
    const list = byKey[k].sort((a, b) => b.t - a.t);
    const longest = list[0].t / POWER_TIME;
    const dying = list[0].t < 5;
    const blink = dying && Math.floor(G.t * 6) % 2 === 0;
    g.save();
    g.globalAlpha = blink ? 0.35 : 0.95;
    g.fillStyle = pw.c;
    g.beginPath(); g.moveTo(px + 7, py); g.lineTo(px + 14, py + 7); g.lineTo(px + 7, py + 14); g.lineTo(px, py + 7); g.closePath(); g.fill();
    g.restore();
    if (list.length > 1) brush('x' + list.length, px + 17, py + 4, 10, pw.c, 'left');
    // drain bar under the pip
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(px, py + 16, 30, 3);
    g.fillStyle = pw.c; g.globalAlpha = dying ? 0.6 : 1;
    g.fillRect(px, py + 16, 30 * longest, 3);
    g.globalAlpha = 1;
    px += 42; if (px > 250) { px = 22; py += 26; }
  }
  const untilPow = POWER_EVERY - (G.kills % POWER_EVERY);
  brush(`next power in ${untilPow}`, W / 2, 56, 11, 'rgba(220,200,160,.55)');
  if (G.msgT > 0) brush(G.msg, W / 2, 88, 22, '#c92222', 'center', Math.min(1, G.msgT * 1.4));
  // power notices live in the bottom-right corner, clear of the fight
  const tX = W - 22;
  G.toast.slice(0, 4).forEach((t, i) => {
    const k = t.t < 0.3 ? t.t / 0.3 : (t.t > 2.1 ? Math.max(0, (2.6 - t.t) / 0.5) : 1);
    const slide = (1 - Math.min(1, t.t / 0.3)) * 26;      // slides in from the edge
    const y = H - 34 - i * 36;
    g.save();
    g.globalAlpha = k * 0.55;
    g.fillStyle = 'rgba(10,6,12,.85)';
    g.fillRect(tX - 234 + slide, y - 15, 236, 32);
    g.fillStyle = t.c;
    g.fillRect(tX - 234 + slide, y - 15, 3, 32);          // colour spine
    g.restore();
    brush(t.txt, tX - 8 + slide, y - 5, 15, t.c, 'right', k);
    brush(t.sub, tX - 8 + slide, y + 9, 10.5, 'rgba(228,214,196,.72)', 'right', k * 0.9);
  });
  // warlord health across the top
  const bossAlive = foes.find(f => f.boss && !f.dead);
  if (bossAlive) {
    const bw2 = W - 260, bx = 130, by = 78;
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(bx, by, bw2, 13);
    const bg3 = g.createLinearGradient(bx, 0, bx + bw2, 0);
    bg3.addColorStop(0, '#7d1010'); bg3.addColorStop(1, '#ff3a2a');
    g.fillStyle = bg3; g.fillRect(bx, by, bw2 * Math.max(0, bossAlive.hp / bossAlive.maxHp), 13);
    g.strokeStyle = 'rgba(255,90,60,.7)'; g.lineWidth = 1.5; g.strokeRect(bx, by, bw2, 13);
    brush('THE WARLORD', W / 2, by - 12, 15, '#ff6a4a');
  }
  let off = 0;
  for (const f of foes) {
    if (f.dead || vis(f.x, f.y, 20)) continue;
    if (off++ > 26) break;
    const a = Math.atan2(f.y - P.y, f.x - P.x);
    const ex = W / 2 + Math.cos(a) * (W / 2 - 26), ey = H / 2 + Math.sin(a) * (H / 2 - 26);
    g.save(); g.translate(ex, ey); g.rotate(a);
    g.fillStyle = 'rgba(220,60,50,.5)';
    g.beginPath(); g.moveTo(7, 0); g.lineTo(-6, 4); g.lineTo(-6, -4); g.closePath(); g.fill();
    g.restore();
  }
}
function drawLevelUp() {
  g.fillStyle = 'rgba(14,8,14,.84)'; g.fillRect(0, 0, W, H);
  brush('THE BLADE SHARPENS', W / 2, 96, 34, '#d9c281');
  brush('choose your path — press 1, 2 or 3', W / 2, 134, 15, '#8a7a6a');
  const cw = 250, gap = 26, total = choices.length * cw + (choices.length - 1) * gap;
  choices.forEach((u, i) => {
    const x = W / 2 - total / 2 + i * (cw + gap), y = 200, ch = 180;
    g.fillStyle = 'rgba(26,16,22,.96)'; g.fillRect(x, y, cw, ch);
    g.strokeStyle = '#8a2a2a'; g.lineWidth = 2; g.strokeRect(x, y, cw, ch);
    g.fillStyle = 'rgba(200,40,40,.14)'; g.fillRect(x, y, cw, 46);
    brush(String(i + 1), x + 26, y + 24, 22, '#c92222');
    brush(u.n, x + cw / 2 + 12, y + 24, 19, '#e8d9c8');
    brush(u.d, x + cw / 2, y + 100, 15, '#b9a695');
  });
}
function render() {
  g.save();
  if (G.shake > 0.4) g.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
  drawWorld();
  for (const o of orbs) {
    if (!vis(o.x, o.y, 40)) continue;
    const p = 0.6 + 0.4 * Math.sin(G.t * 8 + o.x);
    g.fillStyle = `rgba(217,194,129,${0.55 + p * 0.4})`;
    g.beginPath(); g.arc(SX(o.x), SY(o.y), 4 + o.v * 0.6, 0, 7); g.fill();
    g.fillStyle = `rgba(255,240,200,${0.4 * p})`;
    g.beginPath(); g.arc(SX(o.x), SY(o.y), 9 + o.v, 0, 7); g.fill();
  }
  drawHearts();
  drawDrops();
  const order = [...foes].sort((a, b) => a.y - b.y);
  for (const f of order) if (f.y <= P.y) drawFoe(f);
  drawPlayerRing();
  drawClones();
  drawPowerAuras();
  drawSlashes();
  drawPlayer();
  for (const f of order) if (f.y > P.y) drawFoe(f);
  for (const w of shocks) {
    const k = 1 - w.t / 0.75;
    g.save();
    g.strokeStyle = 'rgba(255,120,60,' + (0.75 * k) + ')'; g.lineWidth = 10 * k + 2;
    g.beginPath(); g.ellipse(SX(w.x), SY(w.y), w.r, w.r * 0.44, 0, 0, 7); g.stroke();
    g.strokeStyle = 'rgba(255,230,190,' + (0.5 * k) + ')'; g.lineWidth = 3 * k;
    g.beginPath(); g.ellipse(SX(w.x), SY(w.y), w.r * 0.92, w.r * 0.4, 0, 0, 7); g.stroke();
    g.restore();
  }
  for (const b of blades) {
    g.save(); g.translate(SX(b.x), SY(b.y)); g.rotate(b.r * 3);
    if (FX_IMG && FX_IMG.storm) g.drawImage(FX_IMG.storm, -22, -22, 44, 44);
    else { g.strokeStyle = 'rgba(255,225,190,.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-15, 0); g.lineTo(15, 0); g.stroke(); }
    g.restore();
  }
  for (const a of arrows) {
    if (!vis(a.x, a.y, 30)) continue;
    g.strokeStyle = '#e8d9c8'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(SX(a.x), SY(a.y)); g.lineTo(SX(a.x) - a.vx * 0.03, SY(a.y) - a.vy * 0.03); g.stroke();
  }
  for (const s of fx) {
    const k = Math.max(0, 1 - s.t / s.life);
    if (s.bolt) {
      if (FX_IMG && FX_IMG.thunder) {
        const bh = 300, bw = 120;
        g.save(); g.globalAlpha = k;
        g.drawImage(FX_IMG.thunder, SX(s.x) - bw / 2, SY(s.y) - bh, bw, bh);
        g.restore();
      } else {
        g.strokeStyle = `rgba(255,240,140,${k})`; g.lineWidth = 3;
        g.beginPath(); let bx = SX(s.x), by = SY(s.y) - 300;
        g.moveTo(bx, by);
        for (let i = 0; i < 6; i++) { bx += (Math.random() - 0.5) * 34; by += 50; g.lineTo(bx, by); }
        g.lineTo(SX(s.x), SY(s.y)); g.stroke();
      }
    } else if (s.num != null) {
      brush(String(s.num), SX(s.x), SY(s.y) - s.t * 46, s.heal ? 18 : (s.crit ? 22 : 15), s.heal ? '#6ef0a0' : (s.crit ? '#ff9a4a' : '#e8d9c8'), 'center', k);
    } else {
      g.globalAlpha = k; g.fillStyle = s.col; g.fillRect(SX(s.x), SY(s.y), s.s || 3, s.s || 3); g.globalAlpha = 1;
    }
  }
  if (G.flash > 0) { g.fillStyle = `rgba(160,20,20,${G.flash * 0.32})`; g.fillRect(0, 0, W, H); }
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.46, W / 2, H / 2, H);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(8,4,10,.46)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.restore();
  drawHud();
  if (G.scene === 'levelup') drawLevelUp();
}
function bgOnly() {
  g.fillStyle = '#241a28'; g.fillRect(0, 0, W, H);
  if (groundCv) for (let x = -700; x < W + 700; x += 700) for (let y = -700; y < H + 700; y += 700)
    g.drawImage(groundCv, x - (G.t * 12) % 700, y - (G.t * 6) % 700);
  const mg = g.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H * 0.42, 520);
  mg.addColorStop(0, 'rgba(255,170,110,.18)'); mg.addColorStop(1, 'rgba(120,40,40,0)');
  g.fillStyle = mg; g.fillRect(0, 0, W, H);
}
function titleScreen() {
  bgOnly();
  g.fillStyle = 'rgba(16,8,14,.5)'; g.fillRect(0, 0, W, H);
  brush('THE SWARM', W / 2, H / 2 - 80, 58, '#c92222');
  brush('群', W / 2, H / 2 - 30, 26, '#9a8a7a');
  brush('one blade against the many', W / 2, H / 2 + 14, 18, '#b9a695');
  brush('WASD / ARROWS to move — the blade swings itself', W / 2, H / 2 + 54, 15, '#7d6f63');
  brush('powers stack and FADE — a fresh shard renews the ones you hold', W / 2, H / 2 + 80, 14, '#8a7a5a');
  brush('every 600 souls, a WARLORD walks the field', W / 2, H / 2 + 104, 14, '#8a4a4a');
  if (G.best) brush(`LONGEST STAND — ${Math.floor(G.best / 60)}:${String(G.best % 60).padStart(2, '0')}`, W / 2, H / 2 + 142, 15, '#8a7a5a');
  brush('SPACE — STAND', W / 2, H - 54, 22, Math.sin(G.t * 3) > 0 ? '#e8d9c8' : '#8a7a6a');
}
function deadScreen() {
  render();
  g.fillStyle = 'rgba(30,6,10,.68)'; g.fillRect(0, 0, W, H);
  brush('THE NIGHT TAKES YOU', W / 2, H / 2 - 62, 44, '#c92222');
  const m = Math.floor(G.run / 60), s = Math.floor(G.run % 60);
  brush(`${m}:${String(s).padStart(2, '0')} · ${G.kills} slain · wave ${G.wave} · ${G.power} powers`, W / 2, H / 2 + 2, 20, '#e8d9c8');
  brush(`LONGEST STAND — ${Math.floor(G.best / 60)}:${String(G.best % 60).padStart(2, '0')}`, W / 2, H / 2 + 40, 15, '#8a7a5a');
  brush('SPACE — STAND AGAIN', W / 2, H - 54, 20, Math.sin(G.t * 3) > 0 ? '#e8d9c8' : '#8a7a6a');
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.045, (now - last) / 1000); last = now;
  if (G.scene === 'play') { update(dt); render(); }
  else if (G.scene === 'levelup') { G.t += dt; render(); }
  else { G.t += dt; if (G.scene === 'title') titleScreen(); else deadScreen(); }
  requestAnimationFrame(frame);
}
buildGround();
requestAnimationFrame(frame);
