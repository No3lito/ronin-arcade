// Shared mobile layer for RONIN ARCADE.
// One import gives a game: real fullscreen where the browser allows it, an
// honest viewport height, a rotate gate for landscape games, and a touch flag.
//
//   import { initMobile } from '../../shared/mobile.js';
//   const M = initMobile({ landscape: true });
//   if (M.touch) { ...show pads... }

// A phone is not "anything that can be touched" — a Windows touchscreen
// laptop reports maxTouchPoints: 10 and still wants keyboard + mouse. It is
// touch hardware AND touch as the primary way in: no hover, coarse pointer.
const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const touchFirst = matchMedia('(pointer: coarse)').matches ||
                   matchMedia('(hover: none)').matches;
const isTouch = hasTouch && touchFirst;

// iPhone Safari has no Fullscreen API (iPad does). Detect so we can tell the
// player the truth instead of showing a button that does nothing.
const isIOS = /iP(hone|od)/.test(navigator.platform) ||
              (/iPad|Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const isIPhone = /iPhone|iPod/.test(navigator.userAgent) ||
                 (isIOS && !/iPad/.test(navigator.userAgent) && Math.min(screen.width, screen.height) < 500);
const canFullscreen = !!(document.documentElement.requestFullscreen ||
                         document.documentElement.webkitRequestFullscreen);
const standalone = navigator.standalone === true ||
                   matchMedia('(display-mode: fullscreen)').matches ||
                   matchMedia('(display-mode: standalone)').matches;

/* --- viewport height that tells the truth on mobile --- */
function syncVH() {
  document.documentElement.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px');
}

/* --- fullscreen --- */
function inFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}
async function toggleFullscreen() {
  try {
    if (inFullscreen()) {
      await (document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen());
    } else {
      const el = document.documentElement;
      await (el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' })
                                  : el.webkitRequestFullscreen());
      // best effort — phones ignore this unless the page is installed
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    }
  } catch { /* refused — nothing we can do, the chip just stays as-is */ }
}

export function initMobile(opts = {}) {
  const { landscape = true, fullscreenBtn = true } = opts;

  syncVH();
  addEventListener('resize', syncVH);
  addEventListener('orientationchange', () => setTimeout(syncVH, 250));

  if (isTouch) document.body.classList.add('ra-touch');
  if (landscape) document.body.classList.add('ra-landscape');

  // stop the page itself from scrolling/zooming while playing
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) e.preventDefault();          // pinch-zoom
  }, { passive: false });

  // rotate gate for landscape games
  if (landscape && !document.getElementById('ra-rotate')) {
    const g = document.createElement('div');
    g.id = 'ra-rotate';
    g.innerHTML = '<div class="glyph"></div><h2>TURN YOUR PHONE</h2>' +
      '<p>This one is fought sideways. Rotate to landscape to see the whole field.</p>';
    document.body.appendChild(g);
  }

  // fullscreen chip — only where it actually does something
  let chip = null;
  if (fullscreenBtn && isTouch && canFullscreen && !standalone) {
    chip = document.createElement('button');
    chip.className = 'ra-chip ra-full';
    chip.textContent = '⛶';
    chip.setAttribute('aria-label', 'Toggle fullscreen');
    chip.addEventListener('click', (e) => { e.preventDefault(); toggleFullscreen(); });
    document.body.appendChild(chip);
    document.body.classList.add('ra-has-full');
    document.addEventListener('fullscreenchange', () => { chip.textContent = inFullscreen() ? '✕' : '⛶'; });
  }

  // iPhone can't do fullscreen from a page — tell the player how to get it once
  if (isIPhone && !standalone && !sessionStorage.getItem('ra-a2hs')) {
    sessionStorage.setItem('ra-a2hs', '1');
    const tip = document.createElement('div');
    tip.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);' +
      'bottom:calc(env(safe-area-inset-bottom) + 14px);z-index:120;max-width:88vw;' +
      'background:rgba(10,6,10,.9);border:1px solid rgba(255,150,90,.4);border-radius:8px;' +
      'padding:10px 14px;color:#e8d9c8;font:500 12px/1.45 "Yu Mincho",Georgia,serif;' +
      'text-align:center;letter-spacing:.05em;';
    tip.innerHTML = 'For the full screen on iPhone: <b>Share → Add to Home Screen</b>, ' +
                    'then open it from there.<br><span style="opacity:.6">tap to dismiss</span>';
    tip.addEventListener('click', () => tip.remove());
    document.body.appendChild(tip);
    setTimeout(() => tip.remove(), 9000);
  }

  return { touch: isTouch, iOS: isIOS, iPhone: isIPhone, canFullscreen, standalone, toggleFullscreen };
}

/* Bind a round thumb stick. Returns a live vector you can read each frame. */
export function bindStick(el, knob) {
  const v = { x: 0, y: 0, active: false };
  let id = null, cx = 0, cy = 0, R = 52, viaTouch = false;
  const setKnob = (dx, dy) => {
    if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const start = (t) => {
    const r = el.getBoundingClientRect();
    cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    R = r.width * 0.4;
    id = t.identifier; v.active = true;
    move(t);
  };
  const move = (t) => {
    const dx = t.clientX - cx, dy = t.clientY - cy;
    const len = Math.hypot(dx, dy) || 1;
    const cl = Math.min(len, R);
    v.x = (dx / len) * (cl / R);
    v.y = (dy / len) * (cl / R);
    setKnob((dx / len) * cl, (dy / len) * cl);
  };
  const end = () => { id = null; v.active = false; v.x = v.y = 0; setKnob(0, 0); };

  el.addEventListener('touchstart', (e) => { e.preventDefault(); viaTouch = true; start(e.changedTouches[0]); }, { passive: false });
  el.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) if (t.identifier === id) move(t);
  }, { passive: false });
  el.addEventListener('touchend', (e) => {
    for (const t of e.changedTouches) if (t.identifier === id) end();
  }, { passive: false });
  el.addEventListener('touchcancel', end, { passive: false });

  // Pointer events cover stylus, mouse, and the browsers that never emit
  // touch events. viaTouch keeps a real finger from being handled twice.
  el.addEventListener('pointerdown', (e) => {
    if (viaTouch) return;
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    start({ identifier: e.pointerId, clientX: e.clientX, clientY: e.clientY });
  });
  el.addEventListener('pointermove', (e) => { if (!viaTouch && id === e.pointerId) move(e); });
  const pEnd = (e) => { if (!viaTouch && id === e.pointerId) end(); };
  el.addEventListener('pointerup', pEnd);
  el.addEventListener('pointercancel', pEnd);
  return v;
}

/* Bind a round action button. onDown fires once per press. */
export function bindButton(el, onDown, onUp) {
  el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); onDown && onDown(); }, { passive: false });
  el.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); onUp && onUp(); }, { passive: false });
  el.addEventListener('touchcancel', () => { onUp && onUp(); });
  el.addEventListener('mousedown', (e) => { e.preventDefault(); onDown && onDown(); });
  addEventListener('mouseup', () => { onUp && onUp(); });
}

/* Widen a camera-driven game's canvas to the phone's aspect instead of
   letterboxing it. Keeps the design height; the extra width just shows more
   world. Call BEFORE the game reads cv.width/cv.height. Room-based games
   (fixed screens) must NOT use this — they'd see outside the room. */
export function fitCanvas(cv, opts = {}) {
  const { designH = cv.height, minW = cv.width, maxW = cv.width * 1.6 } = opts;
  if (!isTouch) return { w: cv.width, h: cv.height };
  const vw = Math.max(window.innerWidth, window.innerHeight);   // landscape long edge
  const vh = Math.min(window.innerWidth, window.innerHeight);
  const target = Math.round(designH * (vw / vh));
  cv.width = Math.max(minW, Math.min(maxW, target));
  cv.height = designH;
  return { w: cv.width, h: cv.height };
}

/* ------------------------------ mute ------------------------------ */
// One setting for the whole arcade: mute in THE SWARM and BLADE DASH is
// already quiet when you get there. Games gate their own sound primitives on
// isMuted(), so nothing is even scheduled while muted.
const MUTE_KEY = 'ronin:muted';
let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (_) {}

/** Call at the top of every sound primitive. */
export function isMuted() { return muted; }

export function setMuted(v) {
  muted = !!v;
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (_) {}
  document.body.classList.toggle('ra-muted', muted);
  return muted;
}

/* Speaker chip, top right. Shown on every device — a phone on a quiet train
   and a laptop in an office both want this button. */
export function initMute() {
  const api = { get muted() { return muted; }, toggle };
  if (document.getElementById('ra-mute')) return api;

  const b = document.createElement('button');
  b.id = 'ra-mute';
  b.className = 'ra-chip ra-mute';
  const paint = () => {
    b.textContent = muted ? '🔇' : '🔊';
    b.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    b.setAttribute('aria-pressed', muted ? 'true' : 'false');
  };
  function toggle() { setMuted(!muted); paint(); }

  b.addEventListener('click', (e) => { e.preventDefault(); toggle(); });
  // the chip sits over the canvas; do not let the tap reach the game
  b.addEventListener('pointerdown', (e) => e.stopPropagation());
  b.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); toggle(); }, { passive: false });

  // M mutes, captured so the game never sees the key and starts a run
  addEventListener('keydown', (e) => {
    if (e.code !== 'KeyM' || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    e.stopPropagation();
    toggle();
  }, true);

  paint();
  document.body.appendChild(b);
  document.body.classList.toggle('ra-muted', muted);
  return api;
}
