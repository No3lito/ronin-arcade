// BLADE DASH — a real run-dash game. Brand new for RONIN ARCADE.
// The canon ronin, truly animated: 48-frame sprint / 24-frame jump /
// 16-frame dash strips generated from his master image. A procedurally
// animated skeleton stands in until the strips finish loading.
import { loadStrips, drawSprite, frameOf } from '../../shared/sprites.js';

const W = 960, H = 540;
const cv = document.getElementById('game');
const g = cv.getContext('2d');

/* ------------------------------ audio ------------------------------ */
let ac = null, noiseBuf = null;
function audio() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const len = ac.sampleRate;
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function tone(f0, f1, dur, type = 'square', vol = 0.18) {
  const c = audio(), t = c.currentTime;
  const o = c.createOscillator(), v = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(v).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noiseS(dur, vol, freq, q = 1) {
  const c = audio(), t = c.currentTime;
  const s = c.createBufferSource(); s.buffer = noiseBuf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const v = c.createGain();
  v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(v).connect(c.destination); s.start(t); s.stop(t + dur + 0.02);
}
const S = {
  jump: () => tone(300, 640, 0.16, 'triangle', 0.25),
  djump: () => { tone(420, 880, 0.16, 'triangle', 0.25); noiseS(0.1, 0.3, 1600, 1); },
  dash: () => { tone(140, 900, 0.22, 'sawtooth', 0.3); noiseS(0.22, 0.55, 2000, 0.7); },
  smash: () => { tone(160, 40, 0.2, 'square', 0.45); noiseS(0.2, 0.7, 500, 1); },
  land: () => noiseS(0.07, 0.3, 400, 1),
  die: () => { tone(220, 40, 0.6, 'sawtooth', 0.4); noiseS(0.4, 0.6, 300, 0.8); },
  go: () => tone(520, 1040, 0.25, 'square', 0.3),
};

/* ------------------------------ input ------------------------------ */
const key = {};
let anyPress = false, touchMode = false;
let jumpQueued = false, dashQueued = false;
addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  key[e.code] = true; anyPress = true;
  if (['Space', 'KeyW', 'ArrowUp', 'KeyK'].includes(e.code)) jumpQueued = true;
  if (['ShiftLeft', 'ShiftRight', 'KeyJ', 'KeyD', 'ArrowRight'].includes(e.code)) dashQueued = true;
});
addEventListener('keyup', (e) => { key[e.code] = false; });
function bindBtn(id, fn) {
  const el = document.getElementById(id);
  el.addEventListener('touchstart', (e) => { e.preventDefault(); fn(); anyPress = true; }, { passive: false });
}
bindBtn('tJump', () => { jumpQueued = true; });
bindBtn('tDash', () => { dashQueued = true; });
addEventListener('touchstart', () => {
  if (!touchMode) { touchMode = true; document.body.classList.add('touch'); }
  anyPress = true;
}, { passive: true });
cv.addEventListener('pointerdown', () => { anyPress = true; jumpQueued = true; });

/* ------------------------------ world ------------------------------ */
// endless rooftop segments: {x, w, y} — gaps between them; obstacles on top
let segs = [], obstacles = [], deco = [], genX = 0, rng = Math.random;
function seedGen() { segs = []; obstacles = []; deco = []; genX = -200; }
function genAhead(cam, spd) {
  while (genX < cam + W + 600) {
    const last = segs[segs.length - 1];
    // difficulty ramps with distance: 0 at start -> 1 by ~650m
    const meters = Math.max(0, genX / 42);
    const diff = Math.min(1, meters / 650);
    // flat, unbroken opening stretch — no height changes, no gaps
    const hStep = diff < 0.12 ? 0 : Math.floor(rng() * 5) - 2;
    const y = last ? Math.max(240, Math.min(430, last.y + hStep * Math.round(46 * Math.min(1, diff * 1.6)))) : 380;
    const w = (620 - diff * 240) + rng() * 520;
    let gap = 0;
    if (last && diff > 0.18 && rng() < 0.35 + diff * 0.55) {
      gap = 70 + rng() * (60 + diff * 150 + Math.min(140, spd * 0.14));
    }
    const x = genX + gap;
    segs.push({ x, w, y });
    // deco: forest dressing (visual only) — trees stand behind the ridge,
    // bushes and stone lanterns sit on it
    let dx2 = x + 90;
    while (dx2 < x + w - 90) {
      const t = rng();
      if (t < 0.30) deco.push({ type: 'tree', v: Math.floor(rng() * 3), h: 220 + rng() * 130, x: dx2, y });
      else if (t < 0.52) deco.push({ type: 'bush', h: 46 + rng() * 30, x: dx2, y });
      else if (t < 0.64) deco.push({ type: 'lantern', x: dx2, y });
      dx2 += 190 + rng() * 260;
    }
    // obstacles arrive with distance: spikes after ~80m, walls after ~180m
    let ox = x + 200;
    while (ox < x + w - 170) {
      const t = rng();
      const density = 0.15 + diff * 0.55;
      if (t < density) {
        if (meters > 180 && rng() < 0.42) obstacles.push({ type: 'wall', x: ox, y, hp: 1 });
        else if (meters > 80) obstacles.push({ type: 'spikes', x: ox, y, w: 80 + diff * 40 });
      }
      ox += 300 + rng() * 360;
    }
    genX = x + w;
  }
  segs = segs.filter((s) => s.x + s.w > cam - 300);
  obstacles = obstacles.filter((o) => o.x > cam - 300 && !o.dead);
  deco = deco.filter((d) => d.x > cam - 300);
}
function groundAt(x) {
  for (const s of segs) if (x >= s.x && x <= s.x + s.w) return s.y;
  return null;
}

/* ------------------------------ player ----------------------------- */
const PX = 260;
const P = {
  x: 0, y: 380, vy: 0, spd: 300, grounded: true, jumps: 0,
  state: 'run', t: 0, phase: 0, dashT: 0, dashCd: 0, flip: 0, dead: false,
  scarf: [], trail: [],
};
function resetPlayer() {
  Object.assign(P, { x: 0, y: 380, vy: 0, spd: 300, grounded: true, jumps: 0, state: 'run', t: 0, phase: 0, dashT: 0, dashCd: 0, flip: 0, dead: false });
  P.scarf = []; for (let i = 0; i < 9; i++) P.scarf.push({ x: 0, y: 0 });
  P.trail = [];
}

/* ------------------------------ state ------------------------------ */
const G = { scene: 'title', t: 0, dist: 0, best: 0, shake: 0, msg: '', msgT: 0 };
let SPR = null;   // sprite strips of the canon ronin — loads in the background
loadStrips({
  sprint: { src: 'assets/dash-sprint.webp', cols: 8, rows: 6, grade: true },
  jump:   { src: 'assets/dash-jump.webp', cols: 8, rows: 3, grade: true },
  djump:  { src: 'assets/dash-djump.webp', cols: 8, rows: 3, grade: true },
  dash:   { src: 'assets/dash-dash.webp', cols: 8, rows: 2, grade: true },
}).then((s) => { SPR = s; }).catch(() => {}); // skeleton fallback stays
// forest environment art (pre-keyed transparent webp) — world draws boxes until it lands
let ENV = null;
loadStrips({
  pine1: { src: 'assets/env-pine1.webp' },
  pine2: { src: 'assets/env-pine2.webp' },
  dead: { src: 'assets/env-dead.webp' },
  bush: { src: 'assets/env-bush.webp' },
  toro: { src: 'assets/env-toro.webp' },
  ledge: { src: 'assets/env-ledge.webp' },
  treeline: { src: 'assets/env-treeline.webp' },
  spikes: { src: 'assets/env-spikes.webp' },
  wall: { src: 'assets/env-wall.webp' },
}).then((s) => { ENV = s; }).catch(() => {});
try { G.best = Number(localStorage.getItem('bladedash-best') || 0); } catch {}
let fx = [], embers = [];
for (let i = 0; i < 30; i++) embers.push({ x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random() });
function sparks(x, y, n, col) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 420;
    fx.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 140, t: 0, life: 0.5, col });
  }
}

/* --------------------------- update (run) --------------------------- */
function update(dt) {
  G.dist = P.x / 42;                     // meters
  P.spd = Math.min(860, 300 + G.dist * 1.35);   // really ramps
  P.t += dt;
  P.dashCd = Math.max(0, P.dashCd - dt);
  P.flip = Math.max(0, P.flip - dt * 2.4);

  // dash
  if (dashQueued) {
    dashQueued = false;
    if (P.dashCd <= 0 && P.state !== 'dash') {
      P.state = 'dash'; P.dashT = 0.30; P.dashCd = 1.1;
      P.vy = Math.min(P.vy, 0);
      S.dash();
    }
  }
  // jump / double jump
  if (jumpQueued) {
    jumpQueued = false;
    if (P.grounded) { P.vy = -840; P.grounded = false; P.jumps = 1; P.airT = 0; S.jump(); }
    else if (P.jumps === 1) { P.vy = -760; P.jumps = 2; P.flip = 1; P.airT = 0.15; S.djump(); }
  }
  if (!P.grounded) P.airT = (P.airT || 0) + dt;

  // horizontal
  const dashMul = P.state === 'dash' ? 2.1 : 1;
  P.x += P.spd * dashMul * dt;
  if (P.state === 'dash') {
    P.dashT -= dt;
    P.trail.push({ x: P.x, y: P.y, t: 0.28, pose: posePack() });
    if (P.dashT <= 0) { P.state = 'run'; }
  }
  for (const tr of P.trail) tr.t -= dt;
  P.trail = P.trail.filter((tr) => tr.t > 0);

  // vertical
  const gy = groundAt(P.x);
  if (P.state !== 'dash' || !P.grounded) {
    P.vy += 2350 * dt;
    P.y += P.vy * dt;
  }
  if (gy !== null && P.y >= gy && P.vy >= 0) {
    if (!P.grounded) { S.land(); sparks(PX, gy, 4, '#6a5a4c'); }
    P.y = gy; P.vy = 0; P.grounded = true; P.jumps = 0;
  } else if (gy === null || P.y < gy - 2) {
    P.grounded = false;
  }
  // stride phase — cadence locked to real speed so the legs truly run
  if (P.grounded && P.state !== 'dash') P.phase += (P.spd * dashMul * dt) / 34;
  else if (P.state === 'dash') P.phase += dt * 4;

  // fell into a gap
  if (P.y > H + 60) return die();

  // obstacles
  for (const o of obstacles) {
    if (o.dead) continue;
    const dx = o.x - P.x;
    if (o.type === 'wall') {
      if (dx > -26 && dx < 26 && P.y > o.y - 118) {
        if (P.state === 'dash') {
          o.dead = true; S.smash(); G.shake = 12;
          sparks(PX + 40, o.y - 60, 22, '#d8b48a');
        } else return die();
      }
    } else if (o.type === 'spikes') {
      if (P.x > o.x - 12 && P.x < o.x + o.w + 12 && P.y > o.y - 26 && P.state !== 'dash') return die();
    }
  }
  genAhead(P.x - PX, P.spd);
}
function die() {
  P.dead = true; G.scene = 'dead'; G.t = 0; G.shake = 16;
  S.die();
  sparks(PX, P.y - 60, 26, '#c93a2a');
  if (G.dist > G.best) {
    G.best = Math.floor(G.dist);
    try { localStorage.setItem('bladedash-best', String(G.best)); } catch {}
  }
}

/* ----------------------- the articulated ronin ---------------------- */
// side view, facing right. all joints derived from phase + state.
function posePack() {
  return { phase: P.phase, state: P.state, grounded: P.grounded, vy: P.vy, flip: P.flip, airT: P.airT || 0, x: P.x, jumps: P.jumps };
}
// unified hero draw — real sprite frames when loaded, skeleton until then
function drawHero(x, y, pose, alpha = 1, ghost = false) {
  if (!SPR) return drawRonin(x, y, pose, alpha, ghost ? '#8a1a1a' : null);
  let frame;
  if (pose.state === 'dash') frame = frameOf(SPR.dash, (pose.x / 18) % 16);
  else if (!pose.grounded) {
    // second jump plays the somersault strip when it exists
    if (pose.jumps === 2 && SPR.djump) frame = frameOf(SPR.djump, Math.min(SPR.djump.length - 1, pose.airT * 26));
    else frame = frameOf(SPR.jump, Math.min(23, pose.airT * 22));
  } else frame = frameOf(SPR.sprint, (pose.x / 13) % 48);
  const rot = pose.state === 'dash' ? 0.22 : pose.grounded ? 0.06 + Math.min(1, (P.spd - 300) / 560) * 0.08 : 0.05;
  // the generated frames carry ~16px of empty cell below the feet — sink the
  // sprite so the feet actually meet the ground line
  const sink = y + 168 * 0.062;
  drawSprite(g, frame, x, sink, 168, false, ghost ? alpha * 0.5 : alpha, rot);
  if (ghost) {
    g.save(); g.globalCompositeOperation = 'lighter';
    drawSprite(g, frame, x, sink, 168, false, alpha * 0.35, rot);
    g.restore();
  }
}
function limbAngles(pose) {
  const p = pose.phase * Math.PI * 2;
  if (pose.state === 'dash') {
    return {
      lean: 0.62,
      thighA: 2.5, shinA: 1.1, thighB: 1.5, shinB: 2.2,
      armA: 2.6, foreA: 0.4, armB: 2.9, foreB: 0.3,
    };
  }
  if (!pose.grounded) {
    if (pose.vy < -150) return { lean: 0.28, thighA: 0.5, shinA: 1.9, thighB: 1.7, shinB: 2.1, armA: -0.7, foreA: 0.9, armB: 2.4, foreB: 0.8 };
    return { lean: 0.18, thighA: 0.9, shinA: 1.2, thighB: 1.9, shinB: 1.4, armA: -0.3, foreA: 0.5, armB: 2.1, foreB: 0.6 };
  }
  // sprint cycle: legs counter-phased, knees bend on the swing leg
  const sA = Math.sin(p), sB = Math.sin(p + Math.PI);
  return {
    lean: 0.30,
    thighA: sA * 0.95, shinA: 0.55 + Math.max(0, Math.sin(p - 1.4)) * 1.5,
    thighB: sB * 0.95, shinB: 0.55 + Math.max(0, Math.sin(p + Math.PI - 1.4)) * 1.5,
    armA: sB * 0.85 - 0.2, foreA: 1.15,
    armB: sA * 0.85 - 0.2, foreB: 1.15,
  };
}
function drawRonin(x, y, pose, alpha = 1, tint = null) {
  const L = limbAngles(pose);
  const scale = 1.16;
  const spdK = Math.min(1, (P.spd - 300) / 560);
  g.save();
  g.translate(x, y);
  g.rotate(L.lean);
  g.scale(scale, scale);
  g.globalAlpha = alpha;
  const body = tint || '#1a141f';
  const dark = tint || '#100c14';
  const rim = tint || '#382a40';
  g.lineCap = 'round'; g.lineJoin = 'round';
  const hipY = -58;
  const p2 = pose.phase * Math.PI * 2;

  // tattered coat streaming behind (flaps with stride + speed)
  if (!tint) {
    const flap = (i) => Math.sin(p2 * 2 + i * 1.7) * (4 + spdK * 5);
    g.fillStyle = '#120d16';
    g.beginPath();
    g.moveTo(4, hipY - 32);
    g.lineTo(-20 - spdK * 8, hipY - 20 + flap(0));
    g.lineTo(-30 - spdK * 14, hipY + 2 + flap(1));
    g.lineTo(-24 - spdK * 10, hipY + 12 + flap(2));
    g.lineTo(-32 - spdK * 16, hipY + 24 + flap(3));
    g.lineTo(-14, hipY + 22);
    g.lineTo(-2, hipY + 4);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(122,21,24,.55)'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(-14, hipY + 22); g.lineTo(-30 - spdK * 14, hipY + 8 + flap(1)); g.stroke();
  }

  // back limbs (darker for depth)
  drawLeg(L.thighB, L.shinB, hipY, dark);
  drawArm(L.armB, L.foreB, hipY - 30, dark);

  // torso: broad chest tapering to the hip
  g.strokeStyle = body; g.lineWidth = 19;
  g.beginPath(); g.moveTo(-1, hipY); g.lineTo(7, hipY - 33); g.stroke();
  g.strokeStyle = rim; g.lineWidth = 3.5;
  g.beginPath(); g.moveTo(3, hipY - 8); g.lineTo(10, hipY - 33); g.stroke();
  // crimson sash at the waist + streaming tails
  if (!tint) {
    g.strokeStyle = '#8a1a1e'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(-8, hipY - 2); g.lineTo(8, hipY - 6); g.stroke();
    g.strokeStyle = '#7a1518'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(-6, hipY); g.lineTo(-20 - Math.sin(p2) * 5 - spdK * 6, hipY + 14 + Math.cos(p2 * 2) * 3); g.stroke();
    g.beginPath(); g.moveTo(-4, hipY + 2); g.lineTo(-14 - Math.sin(p2 + 1.2) * 4 - spdK * 4, hipY + 20); g.stroke();
  }

  // head: skull + jaw, brow shadow, glowing eye
  g.fillStyle = body;
  g.beginPath(); g.arc(12, hipY - 47, 11, 0, 7); g.fill();
  g.beginPath(); g.moveTo(12, hipY - 40); g.lineTo(22, hipY - 44); g.lineTo(14, hipY - 52); g.closePath(); g.fill();
  g.fillStyle = dark;
  g.beginPath(); g.arc(10, hipY - 51, 8, Math.PI * 0.9, Math.PI * 2.05); g.fill(); // brow/hairline
  if (!tint) {
    g.fillStyle = '#ff3a2a';
    g.fillRect(17.5, hipY - 49.5, 4, 2.8);
    g.globalAlpha = alpha * 0.35;
    g.fillRect(13, hipY - 49.5, 4, 2.2); // eye glow bleed
    g.globalAlpha = alpha;
  }
  // streaming topknot ponytail
  if (!tint) {
    g.strokeStyle = '#0d0a10';
    for (let i = 0; i < 3; i++) {
      g.lineWidth = 4.5 - i;
      g.beginPath();
      g.moveTo(7, hipY - 56);
      g.quadraticCurveTo(-6 - spdK * 8, hipY - 62 + i * 2 + Math.sin(G.t * 9 + i) * 2, -20 - spdK * 14 - i * 5, hipY - 54 + i * 4 + Math.sin(G.t * 7 + i * 2) * 3);
      g.stroke();
    }
  }

  // katana sheathed across the back, red cord + glint
  g.strokeStyle = tint || '#26202c'; g.lineWidth = 5.5;
  g.beginPath(); g.moveTo(-9, hipY - 34); g.lineTo(-27, hipY - 64); g.stroke();
  if (!tint) {
    g.strokeStyle = '#5a1515'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-7, hipY - 31); g.lineTo(-13, hipY - 41); g.stroke();
    g.strokeStyle = 'rgba(255,120,90,.7)'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(-22, hipY - 56); g.lineTo(-26, hipY - 62); g.stroke();
  }

  // dash: blade drawn, red streak
  if (!tint && pose.state === 'dash') {
    g.strokeStyle = 'rgba(255,70,50,.9)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(14, hipY - 26); g.lineTo(58, hipY - 34); g.stroke();
    g.strokeStyle = 'rgba(255,160,120,.5)'; g.lineWidth = 9;
    g.beginPath(); g.moveTo(20, hipY - 27); g.lineTo(70, hipY - 36); g.stroke();
  }

  // front limbs (main tone + rim)
  drawLeg(L.thighA, L.shinA, hipY, body, rim);
  drawArm(L.armA, L.foreA, hipY - 30, body, rim);
  g.restore();
}
function drawLeg(thigh, shin, hipY, col, rim) {
  const t = 20, s2 = 19;
  const kx = Math.sin(thigh) * t, ky = hipY + Math.cos(thigh) * t;
  const fx2 = kx + Math.sin(thigh - shin) * s2, fy = ky + Math.cos(thigh - shin) * s2;
  g.strokeStyle = col; g.lineWidth = 11;
  g.beginPath(); g.moveTo(0, hipY); g.lineTo(kx, ky); g.stroke();
  g.lineWidth = 8.5;
  g.beginPath(); g.moveTo(kx, ky); g.lineTo(fx2, fy); g.stroke();
  // tabi foot
  g.lineWidth = 5.5;
  g.beginPath(); g.moveTo(fx2, fy); g.lineTo(fx2 + 9, fy - 1.5); g.stroke();
  if (rim) {
    g.strokeStyle = rim; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(1, hipY - 2); g.lineTo(kx + 1, ky - 3); g.stroke();
  }
}
function drawArm(arm, fore, shY, col, rim) {
  const u = 16, f2 = 15;
  const ex = 6 + Math.sin(arm) * u, ey = shY + Math.cos(arm) * u;
  const hx = ex + Math.sin(arm - fore) * f2, hy = ey + Math.cos(arm - fore) * f2;
  g.strokeStyle = col; g.lineWidth = 8.5;
  g.beginPath(); g.moveTo(6, shY); g.lineTo(ex, ey); g.stroke();
  g.lineWidth = 7;
  g.beginPath(); g.moveTo(ex, ey); g.lineTo(hx, hy); g.stroke();
  // fist
  g.fillStyle = col;
  g.beginPath(); g.arc(hx, hy, 4.4, 0, 7); g.fill();
  if (rim) {
    g.strokeStyle = rim; g.lineWidth = 2;
    g.beginPath(); g.moveTo(7, shY - 2); g.lineTo(ex + 1, ey - 2); g.stroke();
  }
}
// scarf — verlet ribbon streaming off the neck
function updateScarf(dt) {
  const neckX = PX + 4, neckY = P.y - 92;
  const windX = -(P.spd * (P.state === 'dash' ? 2.1 : 1)) * 0.055;
  let px = neckX, py = neckY;
  for (let i = 0; i < P.scarf.length; i++) {
    const s = P.scarf[i];
    s.x += (px + windX * (i + 1) * 0.36 - s.x) * Math.min(1, dt * (16 - i));
    s.y += (py + Math.sin(G.t * 7 + i) * 2.4 + i * 1.1 - s.y) * Math.min(1, dt * (16 - i));
    px = s.x; py = s.y;
  }
}
function drawScarf() {
  g.strokeStyle = '#a01824'; g.lineCap = 'round';
  for (let i = 0; i < P.scarf.length - 1; i++) {
    g.lineWidth = 7 - i * 0.6;
    g.globalAlpha = 1 - i * 0.07;
    g.beginPath(); g.moveTo(P.scarf[i].x, P.scarf[i].y); g.lineTo(P.scarf[i + 1].x, P.scarf[i + 1].y); g.stroke();
  }
  g.globalAlpha = 1;
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
function drawWorld(cam) {
  // sky
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#120a10'); sky.addColorStop(0.55, '#1c0f14'); sky.addColorStop(1, '#0a0507');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // blood moon
  const mg = g.createRadialGradient(720, 120, 20, 720, 120, 150);
  mg.addColorStop(0, '#8a1414'); mg.addColorStop(0.75, '#4a0c0c'); mg.addColorStop(1, 'rgba(60,8,8,0)');
  g.fillStyle = mg; g.beginPath(); g.arc(720, 120, 150, 0, 7); g.fill();
  g.fillStyle = '#6a1010'; g.beginPath(); g.arc(720, 120, 74, 0, 7); g.fill();
  // far + mid forest treelines (parallax) — art strips when loaded, silhouettes until then
  if (ENV && ENV.treeline) {
    const tw = 620, th = 230;
    g.save(); g.globalAlpha = 0.55;
    for (let i = -1; i < 3; i++) {
      const mx = i * tw - (cam * 0.12) % tw;
      g.drawImage(ENV.treeline, mx, 190, tw, th);
    }
    g.restore();
    g.save(); g.globalAlpha = 0.85;
    for (let i = -1; i < 3; i++) {
      const bx = i * tw - (cam * 0.3) % tw;
      g.drawImage(ENV.treeline, bx, 255, tw, th);
    }
    g.restore();
  } else {
    g.fillStyle = '#150c11';
    for (let i = -1; i < 6; i++) {
      const mx = ((i * 320 - (cam * 0.12) % 320));
      g.beginPath(); g.moveTo(mx, 400); g.lineTo(mx + 160, 205 + (i % 3) * 34); g.lineTo(mx + 340, 400); g.fill();
    }
    g.fillStyle = '#0e080c';
    for (let i = -1; i < 5; i++) {
      const bx = ((i * 430 - (cam * 0.3) % 430));
      g.fillRect(bx + 60, 300, 90, 240);
      g.fillRect(bx + 40, 288, 130, 16);
      g.fillRect(bx + 52, 252, 106, 14);
    }
  }
  // embers
  g.fillStyle = '#ff7b3a';
  for (const e of embers) {
    e.y -= e.s * 0.5; e.x -= e.s * 0.9;
    if (e.y < -4 || e.x < -4) { e.y = H + 4; e.x = Math.random() * W * 1.4; }
    g.globalAlpha = 0.25 + 0.3 * Math.sin(e.y * 0.05);
    g.fillRect(e.x, e.y, e.s * 2, e.s * 2);
  }
  g.globalAlpha = 1;
  // trees and bushes stand BEHIND the ridge line — nothing decorative sits on
  // the run line, so anything on the track reads as a real obstacle
  if (ENV) {
    const TREES = [ENV.pine1, ENV.pine2, ENV.dead];
    for (const d of deco) {
      const dxp = d.x - cam;
      if (dxp < -220 || dxp > W + 220) continue;
      if (d.type === 'tree') {
        const img = TREES[d.v] || TREES[0];
        if (!img) continue;
        const tw = d.h * (img.width / img.height);
        g.drawImage(img, dxp - tw / 2, d.y - d.h + 26, tw, d.h);
      } else if (d.type === 'bush' && ENV.bush) {
        const bw = d.h * (ENV.bush.width / ENV.bush.height);
        g.drawImage(ENV.bush, dxp - bw / 2, d.y - d.h + 20, bw, d.h);
      }
    }
  }
  // forest ridge platforms
  for (const s of segs) {
    const sx = s.x - cam;
    if (sx > W || sx + s.w < 0) continue;
    g.fillStyle = ENV ? '#171009' : '#16101a';
    g.fillRect(sx, s.y, s.w, H - s.y);
    if (ENV && ENV.ledge) {
      // thin mossy lip tiled along the top of the ridge
      g.save();
      g.beginPath(); g.rect(sx, s.y - 6, s.w, 62); g.clip();
      for (let tx = sx; tx < sx + s.w; tx += 218) g.drawImage(ENV.ledge, tx, s.y - 8, 220, 66);
      g.restore();
    } else {
      g.fillStyle = '#241a2a';
      g.fillRect(sx, s.y, s.w, 9);
      g.fillStyle = '#100b14';
      for (let tx = sx + 22; tx < sx + s.w - 10; tx += 46) g.fillRect(tx, s.y + 9, 24, 5);
      g.fillStyle = '#2e2234';
      g.fillRect(sx - 5, s.y, 10, 14);
      g.fillRect(sx + s.w - 5, s.y, 10, 14);
    }
  }
  // deco standing on the ridge (thin, clearly non-obstacle)
  for (const d of deco) {
    const dxp = d.x - cam;
    if (dxp < -60 || dxp > W + 60) continue;
    if (d.type === 'lantern' && ENV && ENV.toro) {
      const lh = 74, lw = lh * (ENV.toro.width / ENV.toro.height);
      g.drawImage(ENV.toro, dxp - lw / 2, d.y - lh + 2, lw, lh);
      g.fillStyle = `rgba(255,120,50,${0.10 + 0.05 * Math.sin(G.t * 5 + d.x)})`;
      g.beginPath(); g.arc(dxp, d.y - lh * 0.55, 26, 0, 7); g.fill();
    } else if (d.type === 'lantern') {
      g.fillStyle = '#241a20'; g.fillRect(dxp - 2, d.y - 46, 4, 46);
      g.fillRect(dxp - 2, d.y - 48, 20, 4);
      g.strokeStyle = '#1a1216'; g.beginPath(); g.moveTo(dxp + 16, d.y - 46); g.lineTo(dxp + 16, d.y - 34); g.stroke();
      g.fillStyle = `rgba(255,120,50,${0.7 + 0.25 * Math.sin(G.t * 5 + d.x)})`;
      g.fillRect(dxp + 11, d.y - 34, 10, 13);
      g.fillStyle = '#1a1216'; g.fillRect(dxp + 11, d.y - 36, 10, 3); g.fillRect(dxp + 11, d.y - 22, 10, 3);
    }
  }
  // low ground fog
  const fog = g.createLinearGradient(0, H - 130, 0, H);
  fog.addColorStop(0, 'rgba(40,22,34,0)'); fog.addColorStop(1, 'rgba(48,26,38,.30)');
  g.fillStyle = fog; g.fillRect(0, H - 130, W, 130);
  // obstacles — generated art with a pulsing red danger glow so they can never
  // be mistaken for scenery
  for (const o of obstacles) {
    if (o.dead) continue;
    const ox = o.x - cam;
    if (ox < -120 || ox > W + 120) continue;
    const pulse = 0.45 + 0.3 * Math.sin(G.t * 6 + o.x * 0.05);
    if (o.type === 'wall') {
      if (ENV && ENV.wall) {
        const wh = 132, ww = wh * (ENV.wall.width / ENV.wall.height);
        g.fillStyle = `rgba(255,50,40,${pulse * 0.35})`;
        g.beginPath(); g.ellipse(ox, o.y - wh * 0.45, ww * 0.9, wh * 0.62, 0, 0, 7); g.fill();
        g.drawImage(ENV.wall, ox - ww / 2, o.y - wh, ww, wh);
      } else {
        g.fillStyle = '#1f1418';
        g.fillRect(ox - 16, o.y - 112, 32, 112);
        g.fillStyle = `rgba(255,60,40,${0.5 + 0.3 * Math.sin(G.t * 5)})`;
        g.fillRect(ox - 16, o.y - 112, 32, 4);
        g.fillRect(ox - 3, o.y - 90, 6, 56);
        g.strokeStyle = 'rgba(200,60,60,.5)'; g.strokeRect(ox - 16, o.y - 112, 32, 112);
      }
    } else if (ENV && ENV.spikes) {
      const sw = o.w + 26, sh = sw * (ENV.spikes.height / ENV.spikes.width);
      g.fillStyle = `rgba(255,50,40,${pulse * 0.3})`;
      g.beginPath(); g.ellipse(ox + o.w / 2, o.y - 12, sw * 0.62, 30, 0, 0, 7); g.fill();
      g.drawImage(ENV.spikes, ox + o.w / 2 - sw / 2, o.y - sh + 4, sw, sh);
    } else {
      g.fillStyle = '#241a1e';
      for (let i = 0; i < o.w; i += 18) {
        g.beginPath(); g.moveTo(ox + i, o.y); g.lineTo(ox + i + 9, o.y - 24); g.lineTo(ox + i + 18, o.y); g.fill();
      }
      g.fillStyle = `rgba(255,120,50,${0.35 + 0.2 * Math.sin(G.t * 6)})`;
      for (let i = 0; i < o.w; i += 18) {
        g.beginPath(); g.moveTo(ox + i + 4, o.y); g.lineTo(ox + i + 9, o.y - 14); g.lineTo(ox + i + 14, o.y); g.fill();
      }
    }
  }
}
function drawFxAll(dt) {
  for (const s of fx) {
    s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 1000 * dt;
    g.globalAlpha = Math.max(0, 1 - s.t / s.life);
    g.fillStyle = s.col; g.fillRect(s.x - P.x + PX, s.y, 3.4, 3.4);
  }
  g.globalAlpha = 1;
  fx = fx.filter((s) => s.t < s.life);
}
function drawHud() {
  brush(Math.floor(G.dist) + 'm', W / 2, 34, 34, '#e8d9c8');
  brush('BEST ' + G.best + 'm', W - 24, 26, 14, '#9a8a7a', 'right');
  // dash cooldown pip
  const ready = P.dashCd <= 0;
  g.fillStyle = ready ? '#ff5a3a' : 'rgba(90,40,36,.8)';
  g.beginPath(); g.arc(34, 30, 11, 0, 7); g.fill();
  if (!ready) {
    g.fillStyle = '#1a0e0c';
    g.beginPath(); g.moveTo(34, 30); g.arc(34, 30, 11, -Math.PI / 2, -Math.PI / 2 + (P.dashCd / 1.1) * Math.PI * 2); g.fill();
  }
  brush('DASH', 54, 30, 12, ready ? '#ff8a5a' : '#6a5a56', 'left');
  if (P.spd > 640) {
    g.strokeStyle = `rgba(232,217,200,${Math.min(0.3, (P.spd - 640) / 700)})`; g.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const y = 60 + i * 70 + (P.x * 3 + i * 37) % 40;
      const x = W - ((P.x * 5 + i * 173) % (W + 200));
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 110, y); g.stroke();
    }
  }
}

/* ------------------------------ scenes ----------------------------- */
function startRun() {
  seedGen(); resetPlayer();
  genAhead(0, 300);
  const gy = groundAt(PX) || 380;
  P.y = gy;
  G.scene = 'run'; G.t = 0;
  S.go();
}
function sceneTitle() {
  drawWorld(G.t * 60);
  // hero sprinting in place on his own rooftop pedestal
  g.fillStyle = '#16101a'; g.fillRect(150, 392, 220, H - 392);
  g.fillStyle = '#241a2a'; g.fillRect(150, 392, 220, 9);
  g.fillStyle = '#2e2234'; g.fillRect(145, 392, 10, 14); g.fillRect(360, 392, 10, 14);
  const pose = { phase: G.t * 2.6, state: 'run', grounded: true, vy: 0, flip: 0, airT: 0, x: G.t * 420 };
  drawHero(PX, 392, pose);
  brush('BLADE DASH', W / 2, 120, 60, '#c92222');
  brush('刃 走', W / 2, 172, 24, '#e8d9c8');
  brush('run the burning rooftops · how far can you go?', W / 2, 235, 16, '#9a8a7a');
  brush('SPACE jump · SPACE again — double jump · SHIFT (or J) — DASH through the cracked walls', W / 2, 265, 14, '#9a8a7a');
  if (G.best > 0) brush('BEST — ' + G.best + 'm', W / 2, 300, 16, '#ff8a5a');
  if (Math.sin(G.t * 4) > -0.2) brush(touchMode ? 'TAP TO RUN' : 'PRESS ANY KEY', W / 2, 350, 22, '#e8d9c8');
  brush(touchMode ? 'GUIDE button (top left)' : 'T — how to run', W / 2, 384, 13, '#ff8a5a');
  if (key.KeyT) { key.KeyT = false; G.scene = 'guide'; G.t = 0; return; }
  if (anyPress) startRun();
}
function sceneGuide() {
  g.fillStyle = '#0a0608'; g.fillRect(0, 0, W, H);
  brush('HOW TO RUN', W / 2, 50, 38, '#c92222');
  const rows = [
    ['HE RUNS ON HIS OWN', 'and the longer you survive, the faster the rooftops come'],
    [touchMode ? 'JUMP' : 'SPACE — JUMP', 'clear the spikes and the gaps between roofs'],
    [touchMode ? 'JUMP x2' : 'SPACE x2 — DOUBLE JUMP', 'press again mid-air: a flip, and more distance'],
    [touchMode ? 'DASH' : 'SHIFT — DASH', 'a burst of speed that SMASHES the red-cracked walls · short cooldown'],
    ['THE FALL', 'miss a roof and the night takes you — distance is your score'],
  ];
  rows.forEach((r, i) => {
    brush(r[0], 130, 130 + i * 62, 19, '#ff8a5a', 'left');
    brush(r[1], 130, 158 + i * 62, 14, '#d8c9b8', 'left');
  });
  if (Math.sin(G.t * 4) > -0.2) brush(touchMode ? 'TAP — BACK' : 'ANY KEY — BACK', W / 2, H - 26, 15, '#e8d9c8');
  if (G.t > 0.4 && anyPress) { G.scene = 'title'; G.t = 0; }
}
function sceneRun(dt) {
  update(dt);
  updateScarf(dt);
  if (G.scene !== 'run') return;
  const cam = P.x - PX;
  g.save();
  if (G.shake > 0) { G.shake = Math.max(0, G.shake - 70 * dt); g.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake); }
  drawWorld(cam);
  // dash afterimages
  for (const tr of P.trail) drawHero(tr.x - cam, tr.y, tr.pose, tr.t * 2.2, true);
  if (!SPR) drawScarf();   // sprite carries its own scarf
  drawHero(PX, P.y, posePack());
  drawFxAll(dt);
  g.restore();
  drawHud();
}
function sceneDead(dt) {
  const cam = P.x - PX;
  drawWorld(cam);
  drawFxAll(dt);
  g.fillStyle = 'rgba(4,2,3,.66)'; g.fillRect(0, 0, W, H);
  brush('THE NIGHT TAKES YOU', W / 2, H / 2 - 70, 42, '#c92222');
  brush(Math.floor(G.dist) + 'm', W / 2, H / 2 - 6, 46, '#ff8a5a');
  brush('BEST — ' + G.best + 'm', W / 2, H / 2 + 44, 17, '#d8c9b8');
  if (G.t > 0.7 && Math.sin(G.t * 4) > -0.2) brush(touchMode ? 'TAP — RUN AGAIN' : 'ANY KEY — RUN AGAIN', W / 2, H / 2 + 108, 19, '#e8d9c8');
  if (G.t > 0.7 && anyPress) startRun();
}

/* ------------------------------- loop ------------------------------ */
let last = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
  G.t += dt;
  switch (G.scene) {
    case 'title': sceneTitle(); break;
    case 'guide': sceneGuide(); break;
    case 'run': sceneRun(dt); break;
    case 'dead': sceneDead(dt); break;
  }
  anyPress = false; jumpQueued = jumpQueued && G.scene === 'run'; dashQueued = dashQueued && G.scene === 'run';
}
seedGen(); genAhead(0, 300);
resetPlayer();
requestAnimationFrame(loop);
window.__dash = { G, P, key, get segs() { return segs; }, get obstacles() { return obstacles; }, startRun, jump: () => { jumpQueued = true; }, dash: () => { dashQueued = true; }, press: () => { anyPress = true; } };
const guideBtn = document.getElementById('guideBtn');
if (guideBtn) guideBtn.onclick = (e) => { e.preventDefault(); if (G.scene === 'title' || G.scene === 'dead') { G.scene = 'guide'; G.t = 0; } };
