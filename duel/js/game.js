// THE DUEL — old-school arcade fighter. New game built for RONIN ARCADE.
// Shares only the look (sprite strips + arena) with the training yard.
import { A, loadAssets, drawSprite } from './assets.js';

const W = 960, H = 540, GROUND = 486, XMIN = 150, XMAX = 810;
const RONIN_H = 300, RIVAL_H = 330;
const ROUND_TIME = 60, ROUNDS_TO_WIN = 2;

const cv = document.getElementById('game');
const g = cv.getContext('2d');

/* ============================== AUDIO ============================== */
let ac = null, noiseBuf = null;
function audio() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const len = ac.sampleRate * 1.2;
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function tone(f0, f1, dur, type, vol, when = 0) {
  const c = audio(), t = c.currentTime + when;
  const o = c.createOscillator(), v = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(v).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, freq, q = 1, when = 0) {
  const c = audio(), t = c.currentTime + when;
  const s = c.createBufferSource(); s.buffer = noiseBuf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const v = c.createGain();
  v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(v).connect(c.destination); s.start(t); s.stop(t + dur + 0.02);
}
const S = {
  whoosh: () => noise(0.18, 0.5, 1400, 0.8),
  hit:   (p) => { tone(180, 50, 0.16, 'square', 0.5); noise(0.12, 0.7, 500 + p * 90, 1.4); },
  block: () => { tone(900, 500, 0.07, 'square', 0.28); noise(0.06, 0.4, 2400, 2); },
  drum:  () => { tone(110, 40, 0.35, 'sine', 0.9); noise(0.1, 0.35, 220, 1); },
  bell:  () => { tone(1320, 1180, 0.9, 'triangle', 0.3); },
  ko:    () => { tone(70, 24, 0.9, 'sine', 1); noise(0.5, 0.8, 300, 0.7); },
  super: () => { tone(60, 300, 0.5, 'sawtooth', 0.35); noise(0.6, 0.5, 900, 0.6); },
  sel:   () => tone(660, 880, 0.08, 'square', 0.2),
};

/* ============================== INPUT ============================== */
const key = {};
let anyPress = false, touchMode = false;
const KEYS = { left: 'KeyA', right: 'KeyD', block: 'KeyS', a1: 'KeyJ', a2: 'KeyK', a3: 'KeyL', sp: 'Semicolon' };
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  key[e.code] = true; anyPress = true;
  if (['ArrowLeft'].includes(e.code)) key[KEYS.left] = true;
  if (['ArrowRight'].includes(e.code)) key[KEYS.right] = true;
});
addEventListener('keyup', (e) => {
  key[e.code] = false;
  if (e.code === 'ArrowLeft') key[KEYS.left] = false;
  if (e.code === 'ArrowRight') key[KEYS.right] = false;
});
function bindTouch(id, code) {
  const el = document.getElementById(id);
  const on = (e) => { e.preventDefault(); key[code] = true; anyPress = true; };
  const off = (e) => { e.preventDefault(); key[code] = false; };
  el.addEventListener('touchstart', on, { passive: false });
  el.addEventListener('touchend', off, { passive: false });
  el.addEventListener('touchcancel', off, { passive: false });
}
bindTouch('tL', KEYS.left); bindTouch('tR', KEYS.right); bindTouch('tBlk', KEYS.block);
bindTouch('tA1', KEYS.a1); bindTouch('tA2', KEYS.a2); bindTouch('tA3', KEYS.a3); bindTouch('tSp', KEYS.sp);
addEventListener('touchstart', () => {
  if (!touchMode) { touchMode = true; document.body.classList.add('touch'); }
  anyPress = true;
}, { passive: true });
cv.addEventListener('pointerdown', () => { anyPress = true; });

/* ========================== ATTACK TABLES ========================== */
// Player arts — strips are 8x6 (48 frames) of full choreography.
const P_ATK = [
  // retimed to the seedance choreography: hit windows sit on the actual blade
  // contact frames, faster playback, heavier damage so rounds resolve
  { name: 'MOON CUT',    strip: 0, dmg: 9,  chip: 2, range: 255, fps: 64, from: 6,  hitA: 18, hitB: 30, last: 42, push: 30, stun: 0.34, meter: 11 },
  { name: 'RISING DRAGON', strip: 1, dmg: 14, chip: 3, range: 230, fps: 56, from: 8,  hitA: 20, hitB: 32, last: 44, push: 36, stun: 0.42, meter: 14 },
  { name: 'EXECUTIONER', strip: 2, dmg: 21, chip: 4, range: 220, fps: 48, from: 8,  hitA: 26, hitB: 40, last: 46, push: 52, stun: 0.55, meter: 18 },
  { name: 'IAI CIRCLE',  strip: 3, dmg: 34, chip: 8, range: 310, fps: 52, from: 2,  hitA: 14, hitB: 36, last: 46, push: 70, stun: 0.7,  meter: 0, superOnly: true },
];
// Rival attacks — 8x6 strips, long telegraphed blows (windup drawn as flare).
const R_ATK = [
  // the new strips carry their own windup in frames 0-14; attack playback
  // starts past it so the swing lands where the blade actually travels
  { strip: 0, dmg: 11, chip: 2, range: 265, fps: 44, from: 14, hitA: 20, hitB: 28, last: 44, push: 40, stun: 0.45, wind: 0.85 },
  { strip: 1, dmg: 14, chip: 3, range: 240, fps: 40, from: 14, hitA: 22, hitB: 32, last: 46, push: 48, stun: 0.55, wind: 1.0 },
  { strip: 2, dmg: 18, chip: 4, range: 285, fps: 44, from: 12, hitA: 18, hitB: 28, last: 44, push: 60, stun: 0.65, wind: 1.2 },
];

/* ============================ FIGHTERS ============================= */
function mkFighter(x, face) {
  return {
    x, face, hp: 100, meter: 0, state: 'idle', t: 0, animT: 0,
    atk: null, landed: false, vx: 0, flash: 0, blockFlash: 0, lean: 0,
  };
}
let P1 = null, R1 = null;

/* =============================== FX ================================ */
let sparks = [], arcs = [], shake = 0, whiteFlash = 0, hitstop = 0, slowmo = 1;
function spawnSparks(x, y, n, col = '#ffd9a8') {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 380;
    sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: 0.35 + Math.random() * 0.25, t: 0, col });
  }
}
function spawnArc(x, y, face, big) {
  arcs.push({ x, y, face, t: 0, life: 0.22, r: big ? 200 : 130, big });
}

/* ============================ GAME STATE =========================== */
const G = {
  scene: 'boot', t: 0, prog: 0, round: 1, wins: [0, 0], timer: ROUND_TIME,
  msg: '', msgT: 0, koWho: null, embers: [],
};
for (let i = 0; i < 40; i++) G.embers.push({ x: Math.random() * W, y: Math.random() * H, s: 0.4 + Math.random() * 1.2 });
window.__duel = { G, key, KEYS, get P1() { return P1; }, get R1() { return R1; }, press: () => { anyPress = true; } };
const guideBtn = document.getElementById('guideBtn');
if (guideBtn) guideBtn.onclick = (e) => { e.preventDefault(); if (G.scene === 'attract' || G.scene === 'victory') toScene('guide'); };

function resetRound() {
  P1 = mkFighter(280, 1);
  R1 = mkFighter(690, -1);
  R1.hp = 100;
  R1.ai = { think: 0.8, atkCd: 1.4, windT: 0, blocking: 0, aggr: 0.45 + G.round * 0.18, spd: 92 + G.round * 22 };
  G.timer = ROUND_TIME;
}
function toScene(s) { G.scene = s; G.t = 0; }

/* ========================= FIGHT MECHANICS ========================= */
function tryHit(att, def, spec, isPlayerAtt) {
  const dist = Math.abs(att.x - def.x);
  const facing = (def.x - att.x) * att.face > 0;
  if (!facing || dist > spec.range) return;
  att.landed = true;
  const defBlocking = def.state === 'block';
  const dir = def.x > att.x ? 1 : -1;
  if (defBlocking) {
    def.hp = Math.max(0, def.hp - spec.chip);
    def.vx = dir * spec.push * 2.2;
    def.blockFlash = 0.25;
    S.block();
    spawnSparks(def.x - dir * 40, GROUND - 190, 6, '#9fb8ff');
    if (isPlayerAtt) P1.meter = Math.min(100, P1.meter + 4);
  } else {
    def.hp = Math.max(0, def.hp - spec.dmg);
    def.state = 'hit'; def.t = 0; def.animT = 0;
    def.stunFor = spec.stun;
    def.vx = dir * spec.push * 3.2;
    def.flash = 0.3;
    S.hit(spec.dmg);
    hitstop = spec.dmg >= 15 ? 0.11 : 0.06;
    shake = Math.min(14, 4 + spec.dmg * 0.55);
    spawnSparks(def.x - dir * 30, GROUND - (def === R1 ? 200 : 170), 8 + spec.dmg, '#ff9a5a');
    if (isPlayerAtt) P1.meter = Math.min(100, P1.meter + spec.meter);
    else P1.meter = Math.min(100, P1.meter + 7);
  }
}

function updatePlayer(dt) {
  const p = P1;
  p.flash = Math.max(0, p.flash - dt * 3); p.blockFlash = Math.max(0, p.blockFlash - dt * 3);
  p.x += p.vx * dt; p.vx *= Math.pow(0.0008, dt);
  p.x = Math.max(XMIN, Math.min(XMAX, p.x));

  if (p.state === 'hit') {
    p.t += dt;
    if (p.t >= p.stunFor) { p.state = 'idle'; p.t = 0; }
    return;
  }
  if (p.state === 'attack') {
    p.animT += dt;
    const spec = p.atk;
    const fr = spec.from + p.animT * spec.fps;
    if (!p.landed && fr >= spec.hitA && fr <= spec.hitB && R1.state !== 'hit') tryHit(p, R1, spec, true);
    if (fr >= spec.last) { p.state = 'idle'; p.t = 0; }
    return;
  }
  // face the rival
  p.face = R1.x > p.x ? 1 : -1;
  if (key[KEYS.block]) { p.state = 'block'; p.t += dt; return; }
  if (p.state === 'block') { p.state = 'idle'; p.t = 0; }

  const starts = [
    [KEYS.a1, P_ATK[0]], [KEYS.a2, P_ATK[1]], [KEYS.a3, P_ATK[2]],
  ];
  for (const [k, spec] of starts) {
    if (key[k]) {
      key[k] = false;
      p.state = 'attack'; p.atk = spec; p.animT = 0; p.landed = false; p.t = 0;
      S.whoosh(); spawnArc(p.x + p.face * 90, GROUND - 160, p.face, false);
      return;
    }
  }
  if (key[KEYS.sp] && p.meter >= 100) {
    key[KEYS.sp] = false;
    p.meter = 0;
    p.state = 'attack'; p.atk = P_ATK[3]; p.animT = 0; p.landed = false; p.t = 0;
    S.super(); whiteFlash = 0.5; slowmo = 0.45; setTimeout(() => { slowmo = 1; }, 420);
    spawnArc(p.x + p.face * 90, GROUND - 160, p.face, true);
    return;
  }
  let mv = 0;
  if (key[KEYS.left]) mv -= 1;
  if (key[KEYS.right]) mv += 1;
  if (mv) {
    p.x += mv * 210 * dt;
    p.x = Math.max(XMIN, Math.min(XMAX, p.x));
    p.state = 'walk'; p.t += dt;
  } else { if (p.state !== 'idle') { p.state = 'idle'; p.t = 0; } p.t += dt; }
}

function updateRival(dt) {
  const e = R1, ai = e.ai;
  e.flash = Math.max(0, e.flash - dt * 3); e.blockFlash = Math.max(0, e.blockFlash - dt * 3);
  e.x += e.vx * dt; e.vx *= Math.pow(0.0008, dt);
  e.x = Math.max(XMIN, Math.min(XMAX, e.x));

  if (e.state === 'hit') {
    e.t += dt; e.animT += dt;
    if (e.t >= e.stunFor) { e.state = 'idle'; e.t = 0; }
    return;
  }
  if (e.state === 'windup') {
    e.t += dt;
    if (e.t >= e.atk.wind) { e.state = 'attack'; e.animT = 0; e.landed = false; S.whoosh(); }
    return;
  }
  if (e.state === 'attack') {
    e.animT += dt;
    const spec = e.atk;
    const fr = spec.from + e.animT * spec.fps;
    if (!e.landed && fr >= spec.hitA && fr <= spec.hitB && P1.state !== 'hit') tryHit(e, P1, spec, false);
    if (fr >= spec.last) { e.state = 'idle'; e.t = 0; ai.atkCd = 1.5 - Math.min(0.9, G.round * 0.25) + Math.random(); }
    return;
  }
  e.face = P1.x > e.x ? 1 : -1;
  if (e.state === 'block') {
    ai.blocking -= dt;
    if (ai.blocking <= 0) { e.state = 'idle'; e.t = 0; }
    return;
  }
  // defend: if the player's blade is live and close, sometimes raise guard
  if (P1.state === 'attack' && Math.abs(P1.x - e.x) < P1.atk.range + 40) {
    if (Math.random() < dt * (2.2 + G.round * 0.9)) {
      e.state = 'block'; ai.blocking = 0.5 + Math.random() * 0.4; return;
    }
  }
  ai.atkCd -= dt; ai.think -= dt;
  const dist = Math.abs(P1.x - e.x);
  const want = 215; // his mid reach
  if (dist > want + 20) { e.x += e.face * ai.spd * dt; e.state = 'walk'; e.t += dt; }
  else if (dist < want - 90 && Math.random() < dt * 0.9) { e.x -= e.face * ai.spd * 0.7 * dt; e.state = 'walk'; e.t += dt; }
  else if (e.state !== 'idle') { e.state = 'idle'; e.t = 0; }
  else e.t += dt;
  e.x = Math.max(XMIN, Math.min(XMAX, e.x));
  if (ai.atkCd <= 0 && dist < 300 && Math.random() < dt * ai.aggr * 2.2) {
    const pick = dist > 250 ? 2 : Math.floor(Math.random() * 3);
    e.atk = R_ATK[pick]; e.state = 'windup'; e.t = 0;
    S.drum();
  }
}

/* ============================ ANIM FRAMES =========================== */
function frameOf(strips, idx) { return strips[Math.max(0, Math.min(strips.length - 1, Math.floor(idx)))]; }
function playerFrame() {
  const p = P1, r = A.ronin;
  if (p.state === 'attack') return frameOf(r.arts[p.atk.strip], p.atk.from + p.animT * p.atk.fps);
  if (p.state === 'walk' && r.run) return frameOf(r.run, (p.t * 26) % r.run.length);
  if (p.state === 'block') return r.guard ? frameOf(r.guard, (p.t * 20) % r.guard.length) : frameOf(r.stance, 6);
  if (p.state === 'hit') return r.hurt ? frameOf(r.hurt, Math.min(14, p.animT * 40)) : frameOf(r.stance, 20);
  if (p.state === 'ko') return r.hurt ? frameOf(r.hurt, Math.min(r.hurt.length - 1, p.animT * 26)) : frameOf(r.stance, 20);
  if (G.scene === 'ko' && G.koWho === R1 && r.victory) return frameOf(r.victory, Math.min(r.victory.length - 1, G.t * 12));
  return frameOf(r.stance, (p.t * 14) % r.stance.length);
}
function rivalFrame() {
  const e = R1, r = A.rival;
  if (!r) return null;
  if (e.state === 'attack') return frameOf(r.atk[R_ATK.indexOf(e.atk)], e.atk.from + e.animT * e.atk.fps);
  if (e.state === 'windup') return frameOf(r.atk[R_ATK.indexOf(e.atk)], Math.min(e.atk.from - 2, 2 + e.t * 10));
  if (e.state === 'hit') return frameOf(r.hurt, Math.min(16, e.animT * 40));
  if (e.state === 'ko') return frameOf(r.hurt, Math.min(r.hurt.length - 1, e.animT * 26));
  if (e.state === 'walk') return frameOf(r.run, (e.t * 22) % r.run.length);
  if (e.state === 'block') return frameOf(r.stance, 4);
  return frameOf(r.stance, (e.t * 12) % r.stance.length);
}

/* ============================== DRAW =============================== */
function drawArena(dark = 0) {
  if (A.arena) g.drawImage(A.arena, 0, 0, W, H);
  else { g.fillStyle = '#0a0608'; g.fillRect(0, 0, W, H); }
  if (dark > 0) { g.fillStyle = `rgba(4,2,3,${dark})`; g.fillRect(0, 0, W, H); }
  // drifting embers
  g.save();
  for (const e of G.embers) {
    e.y -= e.s * 0.6; e.x += Math.sin(e.y * 0.02) * 0.3;
    if (e.y < -4) { e.y = H + 4; e.x = Math.random() * W; }
    g.globalAlpha = 0.25 + 0.3 * Math.sin(e.y * 0.05);
    g.fillStyle = '#ff7b3a';
    g.fillRect(e.x, e.y, e.s * 1.6, e.s * 1.6);
  }
  g.restore();
}
function drawShadowPool(x, hgt) {
  g.save();
  g.globalAlpha = 0.5;
  g.translate(x, GROUND + 8); g.scale(1, 0.15);
  const r = hgt * 0.36;
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
  gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
  g.restore();
}
function drawFighter(f, frame, hgt) {
  if (!frame) return;
  drawShadowPool(f.x, hgt);
  const flip = f.face < 0;
  let rot = 0, alpha = 1, y = GROUND;
  if (f.state === 'ko') {
    const k = Math.min(1, f.animT * 1.1);
    rot = -f.face * k * 1.35; alpha = 1 - k * 0.25; y = GROUND + k * 14;
  }
  drawSprite(g, frame, f.x, y, hgt, flip, alpha, rot);
  if (f.flash > 0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    drawSprite(g, frame, f.x, y, hgt, flip, f.flash * 2, rot);
    g.restore();
  }
  if (f.blockFlash > 0) {
    g.save(); g.globalAlpha = f.blockFlash * 2.4;
    g.strokeStyle = '#9fb8ff'; g.lineWidth = 3;
    g.beginPath(); g.arc(f.x + f.face * 60, GROUND - hgt * 0.5, 54, -1.2, 1.2); g.stroke();
    g.restore();
  }
  if (f === R1 && f.state === 'windup') {
    const k = f.t / f.atk.wind;
    g.save(); g.globalAlpha = 0.4 + 0.5 * k;
    g.fillStyle = '#ffb054';
    g.beginPath(); g.arc(f.x + f.face * 30, GROUND - RIVAL_H * 0.82, 5 + k * 7, 0, Math.PI * 2); g.fill();
    g.restore();
  }
}
function drawFx(dt) {
  for (const s of sparks) {
    s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 900 * dt;
    g.globalAlpha = Math.max(0, 1 - s.t / s.life);
    g.fillStyle = s.col; g.fillRect(s.x, s.y, 3, 3);
  }
  g.globalAlpha = 1;
  sparks = sparks.filter((s) => s.t < s.life);
  for (const a of arcs) {
    a.t += dt;
    const k = a.t / a.life;
    g.save();
    g.globalAlpha = (1 - k) * (a.big ? 0.9 : 0.6);
    g.strokeStyle = a.big ? '#ff5a3a' : '#e8d9c8';
    g.lineWidth = a.big ? 7 : 4;
    g.beginPath();
    g.arc(a.x, a.y, a.r * (0.5 + k * 0.7), a.face > 0 ? -1.1 : Math.PI - 1.1, a.face > 0 ? 0.9 : Math.PI + 0.9);
    g.stroke();
    g.restore();
  }
  arcs = arcs.filter((a) => a.t < a.life);
}
function brush(txt, x, y, size, col, align = 'center', alpha = 1) {
  g.save();
  g.globalAlpha = alpha;
  g.font = `700 ${size}px "Yu Mincho","Hiragino Mincho ProN",Georgia,serif`;
  g.textAlign = align; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
  g.fillStyle = col; g.fillText(txt, x, y);
  g.restore();
}
function drawBar(x, y, w, hp, flipDir) {
  g.fillStyle = 'rgba(10,5,6,.85)';
  g.fillRect(x, y, w, 20);
  const k = Math.max(0, hp / 100);
  const grd = g.createLinearGradient(x, 0, x + w, 0);
  grd.addColorStop(0, '#e8c542'); grd.addColorStop(1, '#c92222');
  g.fillStyle = grd;
  if (flipDir) g.fillRect(x + w * (1 - k), y, w * k, 20);
  else g.fillRect(x, y, w * k, 20);
  g.strokeStyle = 'rgba(200,60,50,.7)'; g.lineWidth = 2;
  g.strokeRect(x, y, w, 20);
}
function drawHud() {
  const bw = 350;
  drawBar(40, 26, bw, P1.hp, false);
  drawBar(W - 40 - bw, 26, bw, R1.hp, true);
  brush('RONIN', 44, 62, 15, '#e8d9c8', 'left');
  brush('THE RIVAL', W - 44, 62, 15, '#e8d9c8', 'right');
  // round pips
  for (let i = 0; i < ROUNDS_TO_WIN; i++) {
    g.fillStyle = i < G.wins[0] ? '#c92222' : 'rgba(60,30,30,.8)';
    g.beginPath(); g.arc(410 + i * -22, 62, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = i < G.wins[1] ? '#c92222' : 'rgba(60,30,30,.8)';
    g.beginPath(); g.arc(W - 410 + i * 22, 62, 7, 0, Math.PI * 2); g.fill();
  }
  // timer
  g.fillStyle = 'rgba(10,5,6,.85)';
  g.fillRect(W / 2 - 34, 16, 68, 40);
  g.strokeStyle = 'rgba(200,60,50,.7)'; g.strokeRect(W / 2 - 34, 16, 68, 40);
  brush(String(Math.ceil(G.timer)).padStart(2, '0'), W / 2, 37, 26, G.timer < 10 ? '#ff5a3a' : '#e8d9c8');
  // super meter
  const mw = 240;
  g.fillStyle = 'rgba(10,5,6,.8)'; g.fillRect(40, H - 34, mw, 12);
  g.fillStyle = P1.meter >= 100 ? '#ff5a3a' : '#8a2020';
  g.fillRect(40, H - 34, mw * P1.meter / 100, 12);
  g.strokeStyle = 'rgba(200,60,50,.6)'; g.strokeRect(40, H - 34, mw, 12);
  brush(P1.meter >= 100 ? 'IAI READY — press ;' : 'SPIRIT', 44, H - 46, 11, P1.meter >= 100 ? '#ff8a5a' : '#9a8a7a', 'left');
}

/* ============================== SCENES ============================= */
function sceneBoot() {
  g.fillStyle = '#070405'; g.fillRect(0, 0, W, H);
  brush('THE DUEL', W / 2, H / 2 - 40, 54, '#c92222');
  brush('forging blades…', W / 2, H / 2 + 14, 16, '#9a8a7a');
  g.fillStyle = 'rgba(10,5,6,.9)'; g.fillRect(W / 2 - 160, H / 2 + 44, 320, 10);
  g.fillStyle = '#c92222'; g.fillRect(W / 2 - 160, H / 2 + 44, 320 * G.prog, 10);
}
function sceneAttract(dt) {
  drawArena(0.45);
  if (A.ronin.stance) drawSprite(g, frameOf(A.ronin.stance, (G.t * 12) % 32), 250, GROUND, RONIN_H, false, 0.9);
  if (A.rival) drawSprite(g, frameOf(A.rival.stance, (G.t * 11) % 32), 710, GROUND, RIVAL_H, true, 0.9);
  brush('THE DUEL', W / 2, 130, 64, '#c92222');
  brush('決 闘', W / 2, 185, 24, '#e8d9c8');
  if (Math.sin(G.t * 4) > -0.2) brush(touchMode ? 'TAP TO FIGHT' : 'PRESS ANY KEY', W / 2, 330, 22, '#e8d9c8');
  brush('A/D move · J K L arts · S guard · ; iai when spirit is full', W / 2, H - 48, 13, '#9a8a7a');
  brush(touchMode ? 'GUIDE button (top left) — how to fight' : 'T — how to fight', W / 2, H - 26, 13, '#ff8a5a');
  if (key.KeyT) { key.KeyT = false; toScene('guide'); return; }
  if (anyPress) { S.sel(); G.round = 1; G.wins = [0, 0]; toScene('vs'); }
}
function sceneGuide() {
  drawArena(0.82);
  brush('HOW TO FIGHT', W / 2, 52, 38, '#c92222');
  const rows = [
    ['A / D', 'step in and out of his reach'],
    ['J — MOON CUT', 'fast lunging crescent — your poke'],
    ['K — RISING DRAGON', 'upward tear — solid damage'],
    ['L — EXECUTIONER', 'slow overhead — hits like a landslide'],
    ['HOLD S — GUARD', 'blocks his blows · only chip damage gets through'],
    ['THE EMBER EYE', 'when his eye flares amber a heavy blow is coming — guard it'],
    ['SPIRIT METER', 'land arts to fill it · when full press  ;  — IAI CIRCLE'],
    ['WIN 2 ROUNDS', '60 seconds each · higher health takes a time-out round'],
  ];
  rows.forEach((r, i) => {
    brush(r[0], 130, 108 + i * 46, 19, '#ff8a5a', 'left');
    brush(r[1], 420, 108 + i * 46, 15, '#d8c9b8', 'left');
  });
  if (Math.sin(G.t * 4) > -0.2) brush(touchMode ? 'TAP — BACK' : 'ANY KEY — BACK', W / 2, H - 24, 15, '#e8d9c8');
  if (G.t > 0.4 && anyPress) toScene('attract');
}
function sceneVs() {
  drawArena(0.72);
  const k = Math.min(1, G.t * 2.2);
  if (A.ronin.stance) drawSprite(g, A.ronin.stance[0], 180 + k * 60, GROUND + 10, 380, false);
  if (A.rival) drawSprite(g, A.rival.stance[0], W - 180 - k * 60, GROUND + 10, 410, true);
  brush('RONIN', 210, 120, 34, '#e8d9c8');
  brush('THE RIVAL', W - 210, 120, 34, '#c92222');
  if (G.t > 0.5) brush('対', W / 2, H / 2 - 20, 90, '#c92222', 'center', Math.min(1, (G.t - 0.5) * 3));
  if (G.t > 1.9) { resetRound(); toScene('round'); S.drum(); }
}
function sceneRound(dt) {
  drawArena();
  drawFighter(P1, playerFrame(), RONIN_H);
  drawFighter(R1, rivalFrame(), RIVAL_H);
  drawHud();
  if (G.t < 1.1) brush(`ROUND ${G.round}`, W / 2, H / 2 - 30, 58, '#e8d9c8');
  else brush('FIGHT!', W / 2, H / 2 - 30, 72, '#ff3a2a');
  if (G.t > 1.7) toScene('fight');
}
function sceneFight(dt) {
  G.timer = Math.max(0, G.timer - dt);
  updatePlayer(dt); updateRival(dt);
  drawArena();
  drawFighter(P1, playerFrame(), RONIN_H);
  drawFighter(R1, rivalFrame(), RIVAL_H);
  drawFx(dt);
  drawHud();
  if (P1.hp <= 0 || R1.hp <= 0) {
    G.koWho = P1.hp <= 0 ? P1 : R1;
    G.koWho.state = 'ko'; G.koWho.animT = 0;
    S.ko(); shake = 18; whiteFlash = 0.7; slowmo = 0.3;
    toScene('ko');
  } else if (G.timer <= 0) {
    S.bell();
    G.koWho = P1.hp >= R1.hp ? R1 : P1; // loser on time
    toScene('roundend');
  }
}
function sceneKo(dt) {
  if (G.t > 1.2) slowmo = 1;
  G.koWho.animT += dt;
  drawArena();
  drawFighter(P1, playerFrame(), RONIN_H);
  drawFighter(R1, rivalFrame(), RIVAL_H);
  drawFx(dt);
  drawHud();
  brush('K.O.', W / 2, H / 2 - 40, 110, '#ff3a2a', 'center', Math.min(1, G.t * 3));
  if (G.t > 2.2) { slowmo = 1; toScene('roundend'); }
}
function sceneRoundEnd(dt) {
  drawArena(0.3);
  drawFighter(P1, playerFrame(), RONIN_H);
  drawFighter(R1, rivalFrame(), RIVAL_H);
  if (G.t === dt || (G.t <= dt * 2 && !G.counted)) {
    G.counted = true;
    if (G.koWho === R1) G.wins[0]++; else G.wins[1]++;
  }
  const pWon = G.koWho === R1;
  brush(pWon ? 'RONIN TAKES THE ROUND' : 'THE RIVAL TAKES THE ROUND', W / 2, H / 2 - 30, 34, pWon ? '#e8d9c8' : '#c92222');
  if (G.t > 2) {
    G.counted = false;
    if (G.wins[0] >= ROUNDS_TO_WIN || G.wins[1] >= ROUNDS_TO_WIN) toScene('victory');
    else { G.round++; resetRound(); toScene('round'); S.drum(); }
  }
}
function sceneVictory(dt) {
  drawArena(0.55);
  const pWon = G.wins[0] > G.wins[1];
  const champ = pWon ? P1 : R1;
  const frame = pWon ? frameOf(A.ronin.stance, (G.t * 10) % 32) : frameOf(A.rival.stance, (G.t * 10) % 32);
  drawSprite(g, frame, W / 2, GROUND, pWon ? 360 : 396, champ.face < 0);
  brush(pWon ? 'VICTORY' : 'DEFEAT', W / 2, 120, 72, pWon ? '#e8d9c8' : '#c92222');
  brush(pWon ? '“The storm bows to no one.”' : '“Rise. The moon is still red.”', W / 2, 180, 18, '#9a8a7a');
  if (Math.sin(G.t * 4) > -0.2) brush(touchMode ? 'TAP — REMATCH' : 'ANY KEY — REMATCH', W / 2, H - 60, 20, '#e8d9c8');
  if (G.t > 1 && anyPress) { S.sel(); toScene('attract'); }
}

/* ============================== LOOP =============================== */
let last = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  let dt = Math.min(0.05, (ts - last) / 1000); last = ts;
  if (hitstop > 0) { hitstop -= dt; dt = 0; }
  dt *= slowmo;
  G.t += dt;
  shake = Math.max(0, shake - 60 * (dt || 0.016));
  whiteFlash = Math.max(0, whiteFlash - (dt || 0.016) * 1.6);

  g.save();
  if (shake > 0) g.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  switch (G.scene) {
    case 'boot': sceneBoot(); break;
    case 'attract': sceneAttract(dt); break;
    case 'guide': sceneGuide(); break;
    case 'vs': sceneVs(); break;
    case 'round': sceneRound(dt); break;
    case 'fight': sceneFight(dt); break;
    case 'ko': sceneKo(dt); break;
    case 'roundend': sceneRoundEnd(dt); break;
    case 'victory': sceneVictory(dt); break;
  }
  g.restore();
  if (whiteFlash > 0) { g.fillStyle = `rgba(255,240,230,${whiteFlash})`; g.fillRect(0, 0, W, H); }
  anyPress = false;
}
requestAnimationFrame(loop);

loadAssets((p) => { G.prog = p; }).then(() => {
  if (!A.rival) console.warn('rival strips missing — duel needs CDN');
  toScene('attract');
}).catch((err) => {
  console.error(err);
  brush('failed to load — check connection', W / 2, H / 2 + 90, 16, '#c92222');
});
