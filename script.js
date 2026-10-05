/* ==========================================================================
   FOUR YEARS · We. Communications opening film
   ---------------------------------------------------------------------------
   Every frame is a pure function of the playhead time `t` (seconds). There is
   no accumulated animation state, so pause, restart, seek and screen
   recording are all frame-accurate and repeatable.

   Structure
     1. Utilities
     2. Timeline data (scenes, chapters, backgrounds, year rail)
     3. Text engine (word masks, cues)
     4. Scene renderers (DOM + canvas)
     5. Playback, controls, boot
   ========================================================================== */

(() => {
  'use strict';

  const DURATION = 30;
  const W = 1920;
  const H = 1080;

  /* ------------------------------------------------------------------------
     1. Utilities
     ------------------------------------------------------------------------ */

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const frac = (x) => x - Math.floor(x);
  const TAU = Math.PI * 2;

  const E = {
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inCubic: (x) => x * x * x,
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    inOutQuart: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
    outBack: (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  };

  // Deterministic PRNG so every playback is identical.
  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rootCSS = getComputedStyle(document.documentElement);
  const cssVar = (n) => rootCSS.getPropertyValue('--' + n).trim();
  const C = {
    ink: cssVar('ink'), plum: cssVar('plum'), deep: cssVar('plum-deep'),
    cream: cssVar('cream'), coral: cssVar('coral'), lilac: cssVar('lilac'),
  };
  const FONT_MONO = cssVar('font-mono');

  function rgba(hex, a) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  /* ------------------------------------------------------------------------
     2. Timeline data
     ------------------------------------------------------------------------ */

  // Scene windows (DOM visibility). Overlaps let exits and entrances cross.
  const SCENES = [
    { id: 's1', a: 0.0,  b: 3.1 },
    { id: 's2', a: 2.9,  b: 5.6 },
    { id: 's3', a: 5.3,  b: 9.0 },
    { id: 's4', a: 8.9,  b: 12.0 },
    { id: 's5', a: 11.9, b: 15.0 },
    { id: 's6', a: 14.9, b: 18.6 },
    { id: 's7', a: 18.4, b: 22.0 },
    { id: 's8', a: 21.9, b: 26.0 },
    { id: 's9', a: 25.9, b: DURATION + 1 },
  ];

  // Chapter label + year shown top-right. Switch happens mid-wipe.
  const CHAPTERS = [
    { t: 0.0,   label: '00 — The prompt',                year: '2022' },
    { t: 5.48,  label: '01 — Production',                year: '2023' },
    { t: 9.08,  label: '02 — Ideation',                  year: '2023' },
    { t: 12.08, label: '03 — Adaptation & distribution', year: '2024' },
    { t: 15.08, label: '04 — Discovery & visibility',    year: '2025' },
    { t: 18.58, label: '05 — Reputation & trust',        year: '2026' },
    { t: 22.08, label: '06 — Who tells the story',       year: '2026' },
    { t: 26.08, label: '07 — What comes next',           year: 'Now' },
  ];

  // Background wipes: colour, direction and start time. Lead edge carries a coral rule.
  const WIPE = 0.56;
  const BGS = [
    { t: -9,    c: C.ink,   dir: 'up',    light: false },
    { t: 5.2,   c: C.cream, dir: 'up',    light: true  },
    { t: 8.8,   c: C.plum,  dir: 'left',  light: false },
    { t: 11.8,  c: C.cream, dir: 'right', light: true  },
    { t: 14.8,  c: C.deep,  dir: 'up',    light: false },
    { t: 18.3,  c: C.ink,   dir: 'down',  light: false },
    { t: 21.8,  c: C.cream, dir: 'left',  light: true  },
    { t: 25.8,  c: C.plum,  dir: 'up',    light: false },
  ];

  // Story-time on the four-year rail (decimal years) against playhead time.
  const Y0 = 2022 + 333 / 365;     // 30 Nov 2022
  const Y1 = 2026 + 10 / 12;       // the event, four years on
  const YEARKEYS = [
    [0, Y0], [3.0, Y0], [5.5, 2023.05], [9.0, 2023.6], [12.0, 2024.15],
    [15.0, 2025.1], [18.5, 2026.0], [22.0, Y1], [DURATION, Y1],
  ];

  /* ------------------------------------------------------------------------
     3. Text engine
     ------------------------------------------------------------------------ */

  // Wrap every word of an element in a mask so it can rise into place.
  function splitWords(el) {
    const frag = document.createDocumentFragment();
    const words = [];
    const walk = (node, cls) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w' + (cls ? ' ' + cls : '');
            const i = document.createElement('span');
            i.className = 'wi';
            // Optical kerning: Inter Tight spaces full stops generously; tighten them at display sizes.
            const m = part.match(/^(.*\S)([.…])$/);
            if (m) {
              i.textContent = m[1];
              const k = document.createElement('span');
              k.className = 'kp' + (/[TYVWPF]$/.test(m[1]) ? ' kp-open' : '');
              k.textContent = m[2];
              i.appendChild(k);
            } else i.textContent = part;
            w.appendChild(i);
            frag.appendChild(w);
            words.push(i);
          });
        } else if (n.nodeType === 1) {
          if (n.tagName === 'BR' || n.hasAttribute('data-keep') || n.classList.contains('anchor')) frag.appendChild(n);
          else walk(n, n.className || n.tagName.toLowerCase());
        }
      });
    };
    walk(el, '');
    el.textContent = '';
    el.appendChild(frag);
    return words;
  }

  const cues = [];
  function cue(sel, o) {
    const el = $(sel);
    cues.push({
      el,
      words: splitWords(el),
      in: o.in,
      out: o.out ?? 1e6,
      st: o.st ?? 0.06,      // stagger between words
      dur: o.dur ?? 0.85,    // entrance duration per word
      xdur: o.xdur ?? 0.42,  // exit duration per word
      tilt: o.tilt ?? 3,     // a little human irregularity on entry
    });
  }

  function renderCue(c, t) {
    const n = c.words.length;
    const end = c.out + n * c.st * 0.5 + c.xdur;
    const vis = t >= c.in && t <= end;
    c.el.style.visibility = vis ? '' : 'hidden'; // '' inherits the scene's visibility
    if (!vis) return;
    for (let i = 0; i < n; i++) {
      const a = c.in + i * c.st;
      const p = E.outExpo(seg(t, a, a + c.dur));
      const b = c.out + i * c.st * 0.5;
      const q = E.inCubic(seg(t, b, b + c.xdur));
      const y = (1 - p) * 130 - q * 130;
      const r = (1 - p) * c.tilt * (i % 2 ? -1 : 1);
      c.words[i].style.transform = `translate3d(0,${y.toFixed(2)}%,0) rotate(${r.toFixed(2)}deg)`;
    }
  }

  /* ------------------------------------------------------------------------
     Stage, canvas, measurement
     ------------------------------------------------------------------------ */

  const stage = $('#stage');
  const cv = $('#fx');
  const ctx = cv.getContext('2d');
  let scale = 1;
  let res = 1;

  function fit() {
    const vw = window.innerWidth, vh = window.innerHeight;
    scale = Math.min(vw / W, vh / H);
    stage.style.transform = `translate(${((vw - W * scale) / 2).toFixed(2)}px,${((vh - H * scale) / 2).toFixed(2)}px) scale(${scale})`;
    res = clamp(scale * (window.devicePixelRatio || 1), 0.75, 2);
    cv.width = Math.round(W * res);
    cv.height = Math.round(H * res);
    dirty = true;
  }

  // Position of an element in stage coordinates (ignores CSS transforms).
  function box(el) {
    let x = 0, y = 0, n = el;
    while (n && n !== stage) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  }

  const A = {}; // anchors measured after fonts load

  /* ------------------------------------------------------------------------
     4. Scenes
     ------------------------------------------------------------------------ */

  // ---------- Backgrounds and wipes -----------------------------------------
  function drawBackground(t) {
    let k = 0;
    for (let i = 0; i < BGS.length; i++) if (t >= BGS[i].t) k = i;
    const cur = BGS[k];
    const prev = BGS[Math.max(0, k - 1)];
    ctx.fillStyle = prev.c;
    ctx.fillRect(0, 0, W, H);
    if (k === 0) { ctx.fillStyle = cur.c; ctx.fillRect(0, 0, W, H); return; }

    // Four staggered bands: the grid is interrupted rather than faded.
    const bands = 4;
    for (let b = 0; b < bands; b++) {
      const p = E.inOutQuart(seg(t, cur.t + b * 0.045, cur.t + b * 0.045 + WIPE));
      if (p <= 0) continue;
      ctx.fillStyle = cur.c;
      const vertical = cur.dir === 'up' || cur.dir === 'down';
      const size = (vertical ? W : H) / bands;
      const o = b * size;
      let x, y, w, h, ex, ey, ew, eh;
      const bar = 10;
      if (cur.dir === 'up')    { x = o; w = size + 1; h = H * p; y = H - h; ex = x; ey = y - bar; ew = w; eh = bar; }
      if (cur.dir === 'down')  { x = o; w = size + 1; h = H * p; y = 0;     ex = x; ey = h;       ew = w; eh = bar; }
      if (cur.dir === 'left')  { y = o; h = size + 1; w = W * p; x = W - w; ex = x - bar; ey = y; ew = bar; eh = h; }
      if (cur.dir === 'right') { y = o; h = size + 1; w = W * p; x = 0;     ex = w;       ey = y; ew = bar; eh = h; }
      ctx.fillRect(x, y, w, h);
      if (p < 1) { ctx.fillStyle = C.coral; ctx.fillRect(ex, ey, ew, eh); }
    }
  }

  function isLightAt(t) {
    let light = false;
    for (const b of BGS) if (t >= b.t + WIPE * 0.55) light = b.light;
    return light;
  }

  // ---------- Chrome: brand, chapter, year rail -----------------------------
  const chrome = $('#chrome');
  const brand = $('#brand');
  const chapterEl = $('.chapter');
  const chLabel = $('#ch-label');
  const chYear = $('#ch-year');
  const rail = $('#rail');
  const railFill = $('#rail-fill');
  const railHead = $('#rail-head');
  let railTicks = [];

  // The rail is five equal year segments; the playhead starts at 30 Nov 2022.
  const RAIL_A = 2022, RAIL_B = 2027;
  const railX = (y) => clamp((y - RAIL_A) / (RAIL_B - RAIL_A));

  function buildRail() {
    const host = $('#rail-ticks');
    railTicks = [];
    for (let y = RAIL_A; y < RAIL_B; y++) {
      const d = document.createElement('div');
      d.className = 'rail-tick';
      d.textContent = String(y);
      d.style.left = (railX(y) * 100).toFixed(3) + '%';
      d.style.width = (100 / (RAIL_B - RAIL_A)).toFixed(3) + '%';
      host.appendChild(d);
      railTicks.push({ el: d, y });
    }
  }

  function storyYear(t) {
    for (let i = 1; i < YEARKEYS.length; i++) {
      const [ta, ya] = YEARKEYS[i - 1], [tb, yb] = YEARKEYS[i];
      if (t <= tb) return lerp(ya, yb, E.inOutCubic(seg(t, ta, tb)));
    }
    return Y1;
  }

  function renderChrome(t) {
    chrome.classList.toggle('light', isLightAt(t));

    brand.style.opacity = (seg(t, 0.3, 1.2) * (1 - seg(t, 25.7, 26.1))).toFixed(3);
    chapterEl.style.opacity = (seg(t, 0.5, 1.3) * (1 - seg(t, 27.6, 28.1))).toFixed(3);
    rail.style.opacity = (seg(t, 0.6, 1.6) * (1 - seg(t, 26.6, 27.4))).toFixed(3);

    // Chapter + year roll in from below on change.
    let k = 0;
    for (let i = 0; i < CHAPTERS.length; i++) if (t >= CHAPTERS[i].t) k = i;
    const ch = CHAPTERS[k];
    if (chLabel.textContent !== ch.label) chLabel.textContent = ch.label;
    if (chYear.textContent !== ch.year) chYear.textContent = ch.year;
    const p = k === 0 ? 1 : E.outExpo(seg(t, ch.t, ch.t + 0.6));
    const next = CHAPTERS[k + 1];
    const q = next ? E.inCubic(seg(t, next.t - 0.25, next.t)) : 0;
    const y = (1 - p) * 110 - q * 110;
    chLabel.style.transform = `translateY(${y}%)`;
    const yearChanged = k > 0 && CHAPTERS[k - 1].year !== ch.year;
    const nextYearChanges = next && next.year !== ch.year;
    chYear.style.transform = `translateY(${(yearChanged ? (1 - p) * 110 : 0) - (nextYearChanges ? q * 110 : 0)}%)`;

    // Four-year rail
    const yr = storyYear(t);
    const f = railX(yr) * 100;
    railFill.style.width = f.toFixed(3) + '%';
    railHead.style.left = f.toFixed(3) + '%';
    for (const tk of railTicks) tk.el.classList.toggle('past', yr >= tk.y - 0.1);
  }

  // ---------- 00 · The prompt -----------------------------------------------
  const PROMPT = 'Write a press release about our launch.';
  const typedEl = $('#s1-typed');
  const caretEl = $('#s1-caret');
  const promptEl = $('#s1-prompt');
  const lineEl = $('#s1-line');
  const dateEl = $('#s1-date');
  const enterEl = $('#s1-enter');

  // Human typing rhythm: irregular, with small pauses after spaces.
  const charTimes = (() => {
    const r = rng(11);
    const raw = [];
    let acc = 0;
    for (let i = 0; i < PROMPT.length; i++) {
      acc += 0.6 + r() * 0.9 + (PROMPT[i - 1] === ' ' ? 0.7 : 0);
      raw.push(acc);
    }
    const t0 = 0.75, t1 = 2.2;
    return raw.map((v) => t0 + (v / acc) * (t1 - t0));
  })();

  function renderS1(t) {
    let n = 0;
    while (n < charTimes.length && charTimes[n] <= t) n++;
    const s = PROMPT.slice(0, n);
    if (typedEl.textContent !== s) typedEl.textContent = s;

    const typing = t >= 0.7 && t <= 2.25;
    const blink = frac(t * 1.7) < 0.55 ? 1 : 0;
    caretEl.style.opacity = t >= 2.55 ? 0 : (typing ? 1 : blink);

    const lp = E.outExpo(seg(t, 0.2, 1.4));
    const collapse = E.inOutCubic(seg(t, 2.5, 2.85));
    lineEl.style.transform = `scaleX(${(lp * (1 - collapse)).toFixed(4)})`;
    lineEl.style.transformOrigin = t < 2.5 ? '0 50%' : '100% 50%';
    promptEl.style.transform = `scaleX(${(1 - collapse).toFixed(4)})`;
    promptEl.style.opacity = (1 - seg(t, 2.5, 2.72)).toFixed(3);
    dateEl.style.opacity = (seg(t, 0.15, 0.55) * (1 - seg(t, 2.5, 2.75))).toFixed(3);
    enterEl.style.opacity = (seg(t, 2.25, 2.35) * (1 - seg(t, 2.55, 2.75))).toFixed(3);
  }

  function drawDotGrid(t) {
    const a = seg(t, 0, 1.2) * (1 - seg(t, 2.7, 3.4));
    if (a <= 0) return;
    const g = 48;
    const cx = A.caret ? A.caret.x : 960, cy = A.caret ? A.caret.y : 540;
    for (let y = g / 2; y < H; y += g) {
      for (let x = g / 2; x < W; x += g) {
        const d = Math.hypot(x - cx, y - cy);
        const reveal = seg(t * 1500 - d * 0.6, 0, 300);
        if (reveal <= 0) continue;
        ctx.fillStyle = rgba(C.cream, 0.11 * a * reveal);
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
  }

  function roundRect(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // The coral prompt cursor becomes a dot and lands as the full stop of "FOUR YEARS."
  function drawHeroDot(t) {
    if (t < 2.55 || t > 5.4 || !A.caret || !A.period) return;
    const Ca = A.caret, P = A.period, R = P.r;
    let x, y, w, h;
    if (t < 2.95) {
      const p = E.outBack(seg(t, 2.55, 2.95));
      x = Ca.x; y = Ca.y;
      w = Math.max(2, lerp(Ca.w, 2 * R, p)); h = Math.max(2, lerp(Ca.h, 2 * R, p));
    } else if (t < 3.55) {
      const p = E.inOutCubic(seg(t, 2.95, 3.55));
      x = lerp(Ca.x, P.x, p);
      y = lerp(Ca.y, P.y, p) - Math.sin(p * Math.PI) * 220;
      w = h = 2 * R;
    } else {
      const q = seg(t, 3.55, 3.95);
      const sq = Math.sin(q * Math.PI) * (1 - q) * 0.5;
      w = 2 * R * (1 + sq); h = 2 * R * (1 - sq);
      x = P.x; y = P.y + (2 * R - h) / 2;
    }
    const s = 1 - E.inCubic(seg(t, 5.0, 5.3));
    w *= s; h *= s;
    if (w < 0.5) return;
    ctx.fillStyle = C.coral;
    roundRect(x - w / 2, y - h / 2, w, h, Math.min(w, h) / 2 * seg(t, 2.55, 2.85));
    ctx.fill();

    // Four ripples on landing: four years.
    for (let i = 0; i < 4; i++) {
      const p = seg(t, 3.6 + i * 0.16, 4.9 + i * 0.16);
      if (p <= 0 || p >= 1) continue;
      ctx.strokeStyle = rgba(C.coral, 0.55 * (1 - p));
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(P.x, P.y, R + E.outCubic(p) * (220 + i * 120), 0, TAU);
      ctx.stroke();
    }
  }

  // ---------- 01 · Production ---------------------------------------------
  const drafts = $$('#s3-drafts li');
  const s3num = $('#s3-num');
  const s3count = $('#s3-count');
  const s3note = $('#s3-note');

  function renderS3(t) {
    drafts.forEach((li, i) => {
      const a = 5.95 + i * 0.13;
      const p = E.outCubic(seg(t, a, a + 0.32));
      const chosen = li.classList.contains('chosen');
      const dim = chosen ? 1 : lerp(1, 0.2, E.inOutCubic(seg(t, 7.65, 8.0)));
      const out = E.inCubic(seg(t, 8.5 + i * 0.025, 8.8 + i * 0.025));
      li.style.clipPath = `inset(0 ${((1 - p) * 100).toFixed(2)}% 0 0)`;
      li.style.opacity = (dim * (1 - out)).toFixed(3);
      li.style.transform = `translateY(${(-out * 30).toFixed(1)}px)`;
    });
    const n = Math.round(128 * E.outCubic(seg(t, 6.0, 7.9)));
    const s = String(n).padStart(3, '0');
    if (s3num.textContent !== s) s3num.textContent = s;
    s3count.style.opacity = (seg(t, 6.0, 6.3) * (1 - seg(t, 8.5, 8.8))).toFixed(3);
    s3note.style.opacity = (seg(t, 8.18, 8.32) * (1 - seg(t, 8.55, 8.8))).toFixed(3);
    s3note.style.transform = `translateY(${((1 - E.outCubic(seg(t, 8.18, 8.4))) * 16).toFixed(1)}px)`;
  }

  // A hand-drawn circle: deliberately imperfect, the opposite of the machine grid.
  function drawHumanCircle(t) {
    if (t < 7.7 || t > 8.9 || !A.chosen) return;
    const r = A.chosen;
    const cx = r.x + r.w / 2 - 6, cy = r.y + r.h / 2 + 2;
    const rx = r.w / 2 + 34, ry = r.h / 2 + 22;
    const p = E.inOutCubic(seg(t, 7.75, 8.2));
    const alpha = 1 - seg(t, 8.55, 8.85);
    const a0 = -2.5, sweep = (TAU + 0.55) * p;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.035);
    ctx.strokeStyle = rgba(C.coral, alpha);
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const N = 120;
    for (let i = 0; i <= N; i++) {
      const a = a0 + sweep * (i / N);
      const wob = 1 + 0.035 * Math.sin(a * 3 + 1.3) + 0.018 * Math.sin(a * 7 + 0.2);
      const spiral = 1 + (a - a0) * 0.012;
      const x = Math.cos(a) * rx * wob * spiral;
      const y = Math.sin(a) * ry * wob * spiral;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // Hand-drawn arrow down to the note.
    if (!A.note) return;
    const ap = E.inOutCubic(seg(t, 8.05, 8.3));
    if (ap <= 0) return;
    const sx = cx + rx * 0.55, sy = cy + ry * 0.95;
    const ex = A.note.x + 40, ey = A.note.y - 12;
    const c1x = sx + 60, c1y = sy + 50, c2x = ex - 40, c2y = ey - 70;
    ctx.strokeStyle = rgba(C.coral, alpha);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const M = 40;
    let px = sx, py = sy;
    for (let i = 0; i <= M * ap; i++) {
      const u = i / M;
      const [x, y] = bez(sx, sy, c1x, c1y, c2x, c2y, ex, ey, u);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      px = x; py = y;
    }
    if (ap >= 1) {
      ctx.moveTo(px, py); ctx.lineTo(px - 18, py - 10);
      ctx.moveTo(px, py); ctx.lineTo(px + 4, py - 20);
    }
    ctx.stroke();
  }

  function bez(x0, y0, x1, y1, x2, y2, x3, y3, u) {
    const m = 1 - u;
    return [
      m * m * m * x0 + 3 * m * m * u * x1 + 3 * m * u * u * x2 + u * u * u * x3,
      m * m * m * y0 + 3 * m * m * u * y1 + 3 * m * u * u * y2 + u * u * u * y3,
    ];
  }

  // ---------- 02 · Ideation: one dot branches into a field of options -------
  const TREE = (() => {
    const r = rng(23);
    const root = { d: 0, kids: [] };
    const leaves = [];
    const MAXD = 4;
    (function grow(n) {
      if (n.d >= MAXD) { leaves.push(n); return; }
      const k = n.d === 0 ? 3 : (r() < 0.4 ? 3 : 2);
      for (let i = 0; i < k; i++) { const c = { d: n.d + 1, kids: [], parent: n }; n.kids.push(c); grow(c); }
    })(root);
    const yTop = 150, yBot = 590;
    leaves.forEach((l, i) => { l.y = lerp(yTop, yBot, i / (leaves.length - 1)); });
    (function place(n) {
      n.kids.forEach(place);
      if (n.kids.length) n.y = n.kids.reduce((s, c) => s + c.y, 0) / n.kids.length;
      n.x = 210 + n.d * 335;
      n.t0 = 9.15 + (n.d - 1) * 0.3 + r() * 0.14;
    })(root);
    const nodes = [];
    (function collect(n) { nodes.push(n); n.kids.forEach(collect); })(root);
    const LABELS = ['What if…', 'Counter-view', 'Through the CFO’s eyes', 'The cultural moment', 'The tension', 'The data story', 'Flip the brief'];
    const picks = LABELS.map((_, i) => Math.round(lerp(1, leaves.length - 2, i / (LABELS.length - 1))));
    picks.forEach((li, i) => { leaves[li].label = LABELS[i]; });
    const chosen = leaves[picks[4]];
    chosen.chosen = true;
    const path = [];
    for (let n = chosen; n; n = n.parent) path.unshift(n);
    return { root, nodes, leaves, path };
  })();

  function drawTree(t) {
    if (t < 9.0 || t > 12.0) return;
    const fade = 1 - seg(t, 11.55, 11.9);
    ctx.lineCap = 'round';
    for (const n of TREE.nodes) {
      if (!n.parent) continue;
      const p = E.inOutCubic(seg(t, n.t0, n.t0 + 0.42));
      if (p <= 0) continue;
      const P = n.parent;
      const dx = n.x - P.x;
      ctx.strokeStyle = rgba(C.cream, (0.42 - n.d * 0.05) * fade);
      ctx.lineWidth = 2.6 - n.d * 0.35;
      ctx.beginPath();
      const steps = 26;
      for (let i = 0; i <= steps * p; i++) {
        const [x, y] = bez(P.x, P.y, P.x + dx * 0.5, P.y, n.x - dx * 0.5, n.y, n.x, n.y, i / steps);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (p >= 1) {
        const pop = E.outBack(seg(t, n.t0 + 0.42, n.t0 + 0.62));
        ctx.fillStyle = rgba(n.d === 4 ? C.lilac : C.cream, 0.9 * fade);
        ctx.beginPath(); ctx.arc(n.x, n.y, (n.d === 4 ? 4 : 5) * pop, 0, TAU); ctx.fill();
      }
    }

    // Labels on a handful of leaves.
    ctx.font = `500 21px ${FONT_MONO}`;
    ctx.textBaseline = 'middle';
    for (const l of TREE.leaves) {
      if (!l.label) continue;
      const a = seg(t, l.t0 + 0.45, l.t0 + 0.75);
      if (a <= 0) continue;
      const hi = l.chosen ? seg(t, 11.15, 11.35) : 0;
      ctx.fillStyle = hi > 0 ? rgba(C.coral, fade) : rgba(C.cream, 0.78 * a * fade * (l.chosen ? 1 : 1 - 0.5 * seg(t, 10.9, 11.2)));
      ctx.fillText(l.label.toUpperCase(), l.x + 18 + (1 - a) * 12, l.y);
    }

    // The chosen route, drawn by a human hand in coral.
    const cp = seg(t, 10.85, 11.3);
    if (cp > 0) {
      const segs = TREE.path.length - 1;
      ctx.strokeStyle = rgba(C.coral, fade);
      ctx.lineWidth = 5;
      ctx.beginPath();
      let first = true;
      for (let s = 0; s < segs; s++) {
        const local = clamp(cp * segs - s);
        if (local <= 0) break;
        const P = TREE.path[s], n = TREE.path[s + 1], dx = n.x - P.x;
        for (let i = 0; i <= 26 * local; i++) {
          const [x, y] = bez(P.x, P.y, P.x + dx * 0.5, P.y, n.x - dx * 0.5, n.y, n.x, n.y, i / 26);
          if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      const end = TREE.path[TREE.path.length - 1];
      const ep = E.outBack(seg(t, 11.25, 11.45));
      if (ep > 0) { ctx.fillStyle = rgba(C.coral, fade); ctx.beginPath(); ctx.arc(end.x, end.y, 9 * ep, 0, TAU); ctx.fill(); }
    }

    // Origin: the coral dot.
    const o = E.outBack(seg(t, 9.0, 9.3));
    ctx.fillStyle = rgba(C.coral, fade);
    ctx.beginPath(); ctx.arc(TREE.root.x, TREE.root.y, 16 * o, 0, TAU); ctx.fill();
  }

  // ---------- 03 · Adaptation & distribution ---------------------------------
  const TILE = { x0: 1040, y0: 205, cw: 175, ch: 150, gap: 20 };
  const TILES = [
    { c: 0, r: 0, w: 2, h: 1, cls: 't-plum',  k: 'Press release',      deco: 'lines' },
    { c: 2, r: 0, w: 1, h: 1, cls: 't-line',  k: 'Germany',            code: 'DE' },
    { c: 3, r: 0, w: 1, h: 2, cls: 't-ink',   k: 'Video · 9:16',       deco: 'play' },
    { c: 0, r: 1, w: 1, h: 1, cls: 't-coral', k: 'France',             code: 'FR' },
    { c: 1, r: 1, w: 2, h: 1, cls: 't-lilac', k: 'Executive post',     deco: 'lines' },
    { c: 0, r: 2, w: 1, h: 1, cls: 't-line',  k: 'Podcast',            deco: 'wave' },
    { c: 1, r: 2, w: 1, h: 1, cls: 't-plum',  k: 'Spain',              code: 'ES' },
    { c: 2, r: 2, w: 2, h: 1, cls: 't-line',  k: 'Newsletter',         deco: 'lines' },
    { c: 0, r: 3, w: 1, h: 1, cls: 't-lilac', k: 'UAE',                code: 'AE' },
    { c: 1, r: 3, w: 2, h: 1, cls: 't-coral', k: 'Data story',         deco: 'bars' },
    { c: 3, r: 3, w: 1, h: 1, cls: 't-plum',  k: 'Netherlands',        code: 'NL' },
  ];
  const STORY_C = { x: 1420, y: 535 };
  const storyTile = $('#s5-story');

  function buildTiles() {
    const host = $('#s5-tiles');
    const r = rng(5);
    TILES.forEach((tl, i) => {
      const el = document.createElement('div');
      el.className = 'tile ' + tl.cls;
      const x = TILE.x0 + tl.c * (TILE.cw + TILE.gap);
      const y = TILE.y0 + tl.r * (TILE.ch + TILE.gap);
      const w = tl.w * TILE.cw + (tl.w - 1) * TILE.gap;
      const h = tl.h * TILE.ch + (tl.h - 1) * TILE.gap;
      Object.assign(el.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      let inner = `<span class="k">${tl.k}</span>`;
      if (tl.code) inner += `<span class="code">${tl.code}</span>`;
      if (tl.deco === 'lines') inner += '<span class="deco-lines"><i></i><i></i><i></i></span>';
      if (tl.deco === 'play') inner += '<span class="deco-play"></span>';
      if (tl.deco === 'wave') inner += '<span class="deco-wave"></span>';
      if (tl.deco === 'bars') inner += '<span class="deco-bars"><i style="height:35%"></i><i style="height:60%"></i><i style="height:45%"></i><i style="height:85%"></i><i style="height:70%"></i><i style="height:100%"></i></span>';
      el.innerHTML = inner;
      host.appendChild(el);
      tl.el = el;
      tl.cx = x + w / 2; tl.cy = y + h / 2; tl.x = x; tl.y = y; tl.w2 = w; tl.h2 = h;
      tl.rot = (r() - 0.5) * 28;
      tl.i = i;
    });
  }

  function renderS5(t) {
    // The single story appears, then breaks apart into every format and market.
    const sp = E.outExpo(seg(t, 12.1, 12.7));
    const sx = E.inCubic(seg(t, 12.55, 12.85));
    storyTile.style.opacity = (seg(t, 12.1, 12.25) * (1 - sx)).toFixed(3);
    storyTile.style.transform = `scale(${(lerp(0.7, 1, sp) * (1 - 0.6 * sx)).toFixed(4)})`;

    for (const tl of TILES) {
      const a = 12.62 + tl.i * 0.045;
      const p = E.outExpo(seg(t, a, a + 0.9));
      const q = E.inCubic(seg(t, 14.45 + tl.i * 0.02, 14.78 + tl.i * 0.02));
      const dx = (STORY_C.x - tl.cx) * (1 - p);
      const dy = (STORY_C.y - tl.cy) * (1 - p);
      const s = lerp(0.2, 1, p) * (1 - 0.4 * q);
      tl.el.style.opacity = (seg(t, a, a + 0.12) * (1 - q)).toFixed(3);
      tl.el.style.transform = `translate(${dx.toFixed(1)}px,${(dy - q * 40).toFixed(1)}px) rotate(${(tl.rot * (1 - p)).toFixed(2)}deg) scale(${s.toFixed(4)})`;
    }
  }

  // Distribution: every tile streams outward.
  function drawStreams(t) {
    if (t < 13.4 || t > 14.9) return;
    const a = seg(t, 13.4, 13.7) * (1 - seg(t, 14.5, 14.85));
    for (const tl of TILES) {
      let dx = tl.cx - STORY_C.x + 220, dy = tl.cy - STORY_C.y;
      const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
      const col = tl.cls === 't-coral' ? C.coral : C.plum;
      for (let j = 0; j < 6; j++) {
        const ph = frac((t - 13.4) * 0.85 + j / 6 + tl.i * 0.07);
        const d = 30 + ph * 620;
        const off = (j - 2.5) * 9;
        const x = tl.cx + dx * d - dy * off;
        const y = tl.cy + dy * d + dx * off;
        const edge = Math.max(tl.w2, tl.h2) * 0.5;
        if (d < edge) continue;
        ctx.strokeStyle = rgba(col, 0.55 * a * (1 - ph));
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - dx * 26, y - dy * 26);
        ctx.stroke();
      }
    }
  }

  // ---------- 04 · Discovery & visibility -----------------------------------
  const QUERY = 'who leads on sustainable packaging?';
  const qEl = $('#s6-query');
  const qText = $('#s6-qtext');
  const qCaret = $('#s6-caret');
  const BARS = (() => {
    const r = rng(31);
    return Array.from({ length: 9 }, (_, i) => ({ y: 296 + i * 46, w: 740 * (0.45 + r() * 0.55), i }));
  })();
  const ANSWER = { x: 1060, y: 292, w: 740, h: 360 };

  function renderS6(t) {
    qEl.style.opacity = (seg(t, 15.1, 15.3) * (1 - seg(t, 17.95, 18.25))).toFixed(3);
    const n = Math.floor(QUERY.length * seg(t, 15.2, 15.95));
    const s = QUERY.slice(0, n);
    if (qText.textContent !== s) qText.textContent = s;
    qCaret.style.opacity = t < 15.95 ? 1 : (frac(t * 1.7) < 0.55 ? 1 : 0);
  }

  function drawAnswer(t) {
    if (t < 15.2 || t > 18.6) return;
    const fade = 1 - seg(t, 17.95, 18.3);

    // Ten blue links… abstracted into bars, then fused into one answer.
    for (const b of BARS) {
      const appear = E.outExpo(seg(t, 15.35 + b.i * 0.06, 15.85 + b.i * 0.06));
      const m = E.inOutQuart(seg(t, 16.25 + b.i * 0.035, 16.85 + b.i * 0.035));
      if (m >= 1) continue;
      const x = lerp(1060, ANSWER.x, m);
      const y = lerp(b.y, ANSWER.y + (b.i / BARS.length) * ANSWER.h, m);
      const w = lerp(b.w * appear, ANSWER.w, m);
      const h = lerp(20, ANSWER.h / BARS.length + 1, m);
      ctx.fillStyle = rgba(m > 0.5 ? C.cream : C.lilac, lerp(0.45, 1, m) * fade);
      ctx.fillRect(x, y, w, h);
      if (m < 0.05 && appear > 0.5) {
        ctx.fillStyle = rgba(C.lilac, 0.9 * fade);
        ctx.fillRect(1060, b.y, 6, 20);
      }
    }

    const done = seg(t, 16.8, 16.95);
    if (done <= 0) return;
    ctx.fillStyle = rgba(C.cream, fade);
    roundRect(ANSWER.x, ANSWER.y, ANSWER.w, ANSWER.h, 6);
    ctx.fill();

    // The synthesised answer writes itself.
    ctx.font = `500 18px ${FONT_MONO}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = rgba(C.plum, 0.6 * fade * seg(t, 16.9, 17.1));
    ctx.fillText('ONE ANSWER', ANSWER.x + 36, ANSWER.y + 52);
    const lines = [0.88, 0.82, 0.9, 0.7, 0.46];
    lines.forEach((lw, i) => {
      const p = E.outCubic(seg(t, 16.95 + i * 0.09, 17.2 + i * 0.09));
      ctx.fillStyle = rgba(C.plum, 0.85 * fade);
      ctx.fillRect(ANSWER.x + 36, ANSWER.y + 84 + i * 34, (ANSWER.w - 72) * lw * p, 14);
    });

    // Sources: is your brand one of them?
    const chips = [
      { label: 'SOURCE 1', fill: true },
      { label: 'SOURCE 2', fill: true },
      { label: 'YOUR BRAND?', fill: false },
    ];
    let cx = ANSWER.x + 36;
    ctx.font = `700 17px ${FONT_MONO}`;
    chips.forEach((c, i) => {
      const p = E.outBack(seg(t, 17.35 + i * 0.12, 17.6 + i * 0.12));
      const w = ctx.measureText(c.label).width + 36;
      const y = ANSWER.y + ANSWER.h - 78;
      if (p > 0) {
        ctx.save();
        ctx.translate(cx + w / 2, y + 21);
        ctx.scale(p, p);
        roundRect(-w / 2, -21, w, 42, 21);
        if (c.fill) { ctx.fillStyle = rgba(C.plum, 0.12 * fade); ctx.fill(); ctx.fillStyle = rgba(C.plum, 0.8 * fade); }
        else {
          ctx.setLineDash([6, 5]);
          ctx.lineDashOffset = -t * 30;
          ctx.strokeStyle = rgba(C.coral, fade); ctx.lineWidth = 2.5; ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = rgba(C.coral, fade);
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.label, 0, 1);
        ctx.restore();
      }
      cx += w + 14;
    });
    ctx.textAlign = 'left';
  }

  // ---------- 05 · Reputation & trust: the new information environment ------
  const NET = (() => {
    const r = rng(42);
    const B = { x: 1290, y: 400 };
    const nodes = [];
    let guard = 0;
    while (nodes.length < 170 && guard++ < 8000) {
      const x = 40 + r() * 1840, y = 120 + r() * 860;
      if (x < 1210 && y > 590) continue;            // keep the headline clear
      if (y > 960) continue;                         // keep the rail clear
      if (Math.hypot(x - B.x, y - B.y) < 90) continue;
      nodes.push({ x, y, s: r() * TAU, z: 0.4 + r() * 0.6 });
    }
    const LABELS = ['Interpreted', 'Summarised', 'Compared', 'Cited', 'Ranked', 'Recommended', 'Trusted?'];
    const hubs = LABELS.map((label, i) => {
      const a = -Math.PI / 2 + (i / LABELS.length) * TAU + 0.25;
      return { x: B.x + Math.cos(a) * 420, y: B.y + Math.sin(a) * 255, label, a, i, s: r() * TAU };
    });
    const near = (p, list, k) => list
      .map((q) => ({ q, d: Math.hypot(q.x - p.x, q.y - p.y) }))
      .filter((o) => o.q !== p).sort((u, v) => u.d - v.d).slice(0, k).map((o) => o.q);
    const edges = [];
    nodes.forEach((n) => near(n, nodes, 2).forEach((m) => edges.push([n, m, 0])));
    hubs.forEach((h) => { h.links = near(h, nodes, 5); h.links.forEach((m) => edges.push([h, m, 1])); });
    nodes.forEach((n) => { n.t0 = 18.5 + Math.hypot(n.x - B.x, n.y - B.y) / 1500 * 1.1; });
    hubs.forEach((h) => { h.t0 = 19.15 + h.i * 0.14; });
    return { B, nodes, hubs, edges };
  })();

  const drift = (n, t) => [n.x + Math.sin(t * 0.55 + n.s) * 6, n.y + Math.cos(t * 0.45 + n.s * 1.3) * 5];

  function drawNetwork(t) {
    if (t < 18.4 || t > 22.0) return;
    const fade = 1 - seg(t, 21.5, 21.85);
    const { B, nodes, hubs, edges } = NET;

    // Mesh
    ctx.lineWidth = 1;
    for (const [a, b, kind] of edges) {
      const ta = a.t0, tb = b.t0;
      const p = seg(t, Math.max(ta, tb), Math.max(ta, tb) + 0.4);
      if (p <= 0) continue;
      const [ax, ay] = drift(a, t), [bx, by] = drift(b, t);
      ctx.strokeStyle = rgba(kind ? C.lilac : C.cream, (kind ? 0.32 : 0.13) * p * fade);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lerp(ax, bx, p), lerp(ay, by, p)); ctx.stroke();
    }
    for (const n of nodes) {
      const p = seg(t, n.t0, n.t0 + 0.3);
      if (p <= 0) continue;
      const [x, y] = drift(n, t);
      ctx.fillStyle = rgba(C.cream, 0.55 * n.z * p * fade);
      ctx.beginPath(); ctx.arc(x, y, 2 + n.z * 2, 0, TAU); ctx.fill();
    }

    // The brand, and the intermediaries that now tell its story.
    for (const h of hubs) {
      const p = E.outCubic(seg(t, h.t0 - 0.2, h.t0 + 0.3));
      if (p <= 0) continue;
      const [hx, hy] = drift(h, t);
      ctx.strokeStyle = rgba(C.lilac, 0.5 * fade);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(B.x, B.y); ctx.lineTo(lerp(B.x, hx, p), lerp(B.y, hy, p)); ctx.stroke();

      // Signals flowing out from the brand through each intermediary.
      if (p >= 1) {
        for (let m = 0; m < 2; m++) {
          const ph = frac((t - h.t0) * 0.75 + m * 0.5 + h.i * 0.11);
          ctx.fillStyle = rgba(C.coral, fade * (1 - ph * 0.3));
          ctx.beginPath(); ctx.arc(lerp(B.x, hx, ph), lerp(B.y, hy, ph), 4, 0, TAU); ctx.fill();
        }
        h.links.forEach((n, j) => {
          const ph = frac((t - h.t0) * 0.6 + j * 0.23);
          const [nx, ny] = drift(n, t);
          ctx.fillStyle = rgba(C.lilac, 0.8 * fade * (1 - ph));
          ctx.beginPath(); ctx.arc(lerp(hx, nx, ph), lerp(hy, ny, ph), 2.5, 0, TAU); ctx.fill();
        });
      }

      const isQ = h.label.endsWith('?');
      const pop = E.outBack(seg(t, h.t0, h.t0 + 0.3));
      ctx.fillStyle = rgba(isQ ? C.coral : C.cream, fade);
      ctx.beginPath(); ctx.arc(hx, hy, 8 * pop, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(isQ ? C.coral : C.cream, 0.4 * fade);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(hx, hy, 16 * pop, 0, TAU); ctx.stroke();

      const la = seg(t, h.t0 + 0.05, h.t0 + 0.35);
      if (la > 0) {
        const right = Math.cos(h.a) >= -0.05;
        ctx.font = `500 23px ${FONT_MONO}`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = right ? 'left' : 'right';
        ctx.fillStyle = rgba(isQ ? C.coral : C.cream, la * fade);
        ctx.fillText(h.label.toUpperCase(), hx + (right ? 30 : -30) + (1 - la) * (right ? -10 : 10), hy);
      }
    }
    ctx.textAlign = 'left';

    const bp = E.outBack(seg(t, 18.55, 18.9));
    for (let i = 0; i < 3; i++) {
      const ph = frac((t - 18.6) * 0.6 + i / 3);
      ctx.strokeStyle = rgba(C.coral, 0.5 * (1 - ph) * fade * bp);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(B.x, B.y, 20 + ph * 110, 0, TAU); ctx.stroke();
    }
    ctx.fillStyle = rgba(C.coral, fade);
    ctx.beginPath(); ctx.arc(B.x, B.y, 20 * bp, 0, TAU); ctx.fill();
    const bl = seg(t, 18.85, 19.15);
    if (bl > 0) {
      ctx.font = `700 20px ${FONT_MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = rgba(C.coral, bl * fade);
      ctx.fillText('YOUR BRAND', B.x, B.y + 40);
      ctx.textAlign = 'left';
    }
  }

  // ---------- 06 · Who tells the story --------------------------------------
  const slotWords = $$('#s8-slot .sw').map((el) => {
    const txt = el.textContent;
    el.textContent = '';
    const chars = Array.from(txt).map((c) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = c;
      el.appendChild(s);
      return s;
    });
    return { el, chars, in: parseFloat(el.dataset.in) };
  });
  const SLOT_OUT = 25.55;

  function renderS8(t) {
    slotWords.forEach((w, k) => {
      const next = slotWords[k + 1];
      const outAt = next ? next.in - 0.06 : SLOT_OUT;
      const vis = t >= w.in && t <= outAt + 0.6;
      w.el.style.visibility = vis ? '' : 'hidden';
      if (!vis) return;
      w.chars.forEach((c, i) => {
        const a = w.in + i * 0.022;
        const p = E.outExpo(seg(t, a, a + 0.6));
        const b = outAt + i * 0.01;
        const q = E.inCubic(seg(t, b, b + 0.24));
        c.style.transform = `translate3d(0,${((1 - p) * 130 - q * 130).toFixed(2)}%,0)`;
      });
    });
  }

  // ---------- 07 · What comes next ------------------------------------------
  const FINAL = (() => {
    const r = rng(77);
    return Array.from({ length: 180 }, (_, i) => ({
      x: r() * W, y: r() * H,
      t0: 27.35 + r() * 0.5,
      d: 0.75 + r() * 0.45,
      bend: (r() - 0.5) * 420,
      c: i % 9 === 0 ? C.coral : (i % 3 === 0 ? C.lilac : C.cream),
      s: 2 + r() * 2.5,
    }));
  })();

  function drawFinale(t) {
    if (t < 27.3 || !A.dot) return;
    const D = A.dot;
    for (const p of FINAL) {
      const u = seg(t, p.t0, p.t0 + p.d);
      if (u <= 0 || u >= 1) continue;
      const e = E.inOutCubic(u);
      const nx = -(D.y - p.y), ny = D.x - p.x;
      const nl = Math.hypot(nx, ny) || 1;
      const bend = Math.sin(e * Math.PI) * p.bend;
      const x = lerp(p.x, D.x, e) + (nx / nl) * bend;
      const y = lerp(p.y, D.y, e) + (ny / nl) * bend;
      ctx.fillStyle = rgba(p.c, 0.85 * seg(u, 0, 0.15));
      ctx.beginPath(); ctx.arc(x, y, p.s * (1 - e * 0.5), 0, TAU); ctx.fill();
    }
    const dp = E.outBack(seg(t, 28.25, 28.6));
    if (dp > 0) {
      ctx.fillStyle = C.coral;
      ctx.beginPath(); ctx.arc(D.x, D.y, D.r * dp, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < 2; i++) {
      const ph = seg(t, 28.45 + i * 0.22, 29.6 + i * 0.22);
      if (ph <= 0 || ph >= 1) continue;
      ctx.strokeStyle = rgba(C.coral, 0.6 * (1 - ph));
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(D.x, D.y, D.r + E.outCubic(ph) * 260, 0, TAU); ctx.stroke();
    }
  }

  /* ------------------------------------------------------------------------
     Cues: every typographic statement and its timing
     ------------------------------------------------------------------------ */

  function buildCues() {
    cue('#s2-four',  { in: 3.05,  out: 4.95, st: 0.09, dur: 0.95 });
    cue('#s2-from',  { in: 3.85,  out: 5.0,  st: 0.09 });

    cue('#s3-lede',  { in: 5.55,  out: 8.5 });
    cue('#s3-head',  { in: 5.7,   out: 8.55, st: 0.075 });

    cue('#s4-lede',  { in: 9.15,  out: 11.55 });
    cue('#s4-head',  { in: 9.3,   out: 11.6, st: 0.09 });

    cue('#s5-a',     { in: 12.1,  out: 14.45, st: 0.08 });
    cue('#s5-b',     { in: 12.5,  out: 14.5,  st: 0.08 });
    cue('#s5-c',     { in: 12.9,  out: 14.55, st: 0.08 });

    cue('#s6-a',     { in: 15.1,  out: 17.95, st: 0.1 });
    cue('#s6-b',     { in: 15.75, out: 18.0,  st: 0.1 });
    cue('#s6-sub',   { in: 17.1,  out: 18.05, st: 0.035, tilt: 0 });

    cue('#s7-lede',  { in: 18.75, out: 21.45 });
    cue('#s7-head',  { in: 18.95, out: 21.5,  st: 0.12 });

    cue('#s8-a',     { in: 22.05, out: 23.45, st: 0.04, tilt: 0 });
    cue('#s8-c',     { in: 23.6,  out: 25.5,  st: 0.04, tilt: 0 });
    cue('#s8-story', { in: 22.3,  out: 25.55, st: 0.1 });

    cue('#s9-a',     { in: 26.15, st: 0.1, dur: 1.0 });
    cue('#s9-we',    { in: 28.1, st: 0, dur: 0.9, tilt: 0 });
  }

  /* ------------------------------------------------------------------------
     Grain: a fixed noise tile, jittered at 12 fps for a filmic texture
     ------------------------------------------------------------------------ */

  const grain = $('#grain');
  function buildGrain() {
    const g = document.createElement('canvas');
    g.width = g.height = 220;
    const gx = g.getContext('2d');
    const img = gx.createImageData(220, 220);
    const r = rng(99);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(r() * 255);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    gx.putImageData(img, 0, 0);
    grain.style.backgroundImage = `url(${g.toDataURL()})`;
  }
  function renderGrain(t) {
    const f = Math.floor(t * 12);
    const r = rng(f + 1);
    grain.style.backgroundPosition = `${Math.floor(r() * 220)}px ${Math.floor(r() * 220)}px`;
  }

  /* ------------------------------------------------------------------------
     Measure anchors (after fonts load, so positions are exact)
     ------------------------------------------------------------------------ */

  function measure() {
    // Caret position at the end of the fully typed prompt.
    const prev = typedEl.textContent;
    typedEl.textContent = PROMPT;
    const cb = box(caretEl);
    A.caret = { x: cb.x + cb.w / 2, y: cb.y + cb.h / 2, w: cb.w, h: cb.h };
    typedEl.textContent = prev;

    const pe = $('#s2-period');
    const pb = box(pe);
    const fs = parseFloat(getComputedStyle($('#s2-four')).fontSize);
    A.period = { x: pb.x + fs * 0.11, y: pb.y + pb.h - fs * 0.095, r: fs * 0.088 };

    A.chosen = box($('#s3-drafts .chosen'));
    A.note = box($('#s3-note'));

    const de = $('#s9-dot');
    const db = box(de);
    const mfs = parseFloat(getComputedStyle($('#s9-mark')).fontSize);
    A.dot = { x: db.x + mfs * 0.1, y: db.y + db.h - mfs * 0.095, r: mfs * 0.088 };
  }

  /* ------------------------------------------------------------------------
     Render one frame at time t
     ------------------------------------------------------------------------ */

  const sceneEls = SCENES.map((s) => ({ ...s, el: document.getElementById(s.id) }));
  let dirty = true;

  function render(t) {
    for (const s of sceneEls) s.el.classList.toggle('on', t >= s.a && t <= s.b);

    renderChrome(t);
    for (const c of cues) renderCue(c, t);
    if (t <= 3.1) renderS1(t);
    if (t >= 5.3 && t <= 9.0) renderS3(t);
    if (t >= 11.9 && t <= 15.0) renderS5(t);
    if (t >= 14.9 && t <= 18.6) renderS6(t);
    if (t >= 21.9 && t <= 26.0) renderS8(t);
    renderGrain(t);

    ctx.setTransform(res, 0, 0, res, 0, 0);
    drawBackground(t);
    drawDotGrid(t);
    drawHeroDot(t);
    drawHumanCircle(t);
    drawTree(t);
    drawStreams(t);
    drawAnswer(t);
    drawNetwork(t);
    drawFinale(t);

    renderUI(t);
  }

  /* ------------------------------------------------------------------------
     5. Playback & controls
     ------------------------------------------------------------------------ */

  const params = new URLSearchParams(location.search);
  const LOOP = params.has('loop');
  const CLEAN = params.has('clean');
  const DELAY = parseFloat(params.get('delay') || '0') || 0;
  let t = clamp(parseFloat(params.get('t') || '0') || 0, 0, DURATION);
  let playing = false;
  let anchorNow = 0, anchorT = 0;
  let lastRendered = -1;

  const uiFill = $('#ui-fill');
  const uiTime = $('#ui-time');
  const uiState = $('#ui-state');
  const uiBar = $('#ui-bar');

  function renderUI(tt) {
    uiFill.style.width = (tt / DURATION * 100).toFixed(3) + '%';
    uiTime.textContent = `${tt.toFixed(1).padStart(4, '0')} / ${DURATION.toFixed(1)}`;
  }

  let stateTimer = 0;
  function flash(msg) {
    uiState.textContent = msg;
    uiState.classList.add('show');
    clearTimeout(stateTimer);
    stateTimer = setTimeout(() => uiState.classList.remove('show'), 900);
  }

  function play() {
    if (t >= DURATION) t = 0;
    playing = true;
    anchorNow = performance.now();
    anchorT = t;
  }
  function pause() { playing = false; }
  function seek(v) {
    t = clamp(v, 0, DURATION);
    anchorNow = performance.now();
    anchorT = t;
    dirty = true;
  }

  function tick(now) {
    if (playing) {
      t = anchorT + (now - anchorNow) / 1000;
      if (t >= DURATION) {
        if (LOOP) { t = 0; anchorT = 0; anchorNow = now; }
        else { t = DURATION; playing = false; }
      }
    }
    if (dirty || t !== lastRendered) {
      render(t);
      lastRendered = t;
      dirty = false;
    }
    requestAnimationFrame(tick);
  }

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (playing) { pause(); flash('Paused'); } else { play(); flash('Playing'); }
    } else if (k === 'r') {
      seek(0); play(); flash('Restart');
    } else if (k === 'f') {
      toggleFullscreen();
    } else if (k === 'arrowright') {
      seek(t + (e.shiftKey ? 5 : 1)); if (playing) play();
    } else if (k === 'arrowleft') {
      seek(t - (e.shiftKey ? 5 : 1)); if (playing) play();
    } else if (k === 'h') {
      document.body.classList.toggle('hide-ui');
    } else if (k === 'home') {
      seek(0);
    } else if (k === 'end') {
      seek(DURATION); pause();
    }
  });

  function toggleFullscreen() {
    const d = document;
    if (!d.fullscreenElement && !d.webkitFullscreenElement) {
      const el = d.documentElement;
      (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    } else {
      (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    }
  }

  // Click / drag on the progress bar to scrub.
  let scrubbing = false;
  const scrubTo = (e) => { const r = uiBar.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * DURATION); };
  uiBar.addEventListener('pointerdown', (e) => { scrubbing = true; uiBar.setPointerCapture(e.pointerId); scrubTo(e); });
  uiBar.addEventListener('pointermove', (e) => { if (scrubbing) scrubTo(e); });
  uiBar.addEventListener('pointerup', () => { scrubbing = false; if (playing) play(); });
  stage.addEventListener('dblclick', toggleFullscreen);

  // Hide UI and cursor when the mouse is idle (clean screen recordings).
  let idleTimer = 0;
  function wake() {
    document.body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => document.body.classList.add('idle'), 2200);
  }
  window.addEventListener('mousemove', wake);
  window.addEventListener('pointerdown', wake);
  if (CLEAN) document.body.classList.add('clean', 'idle');

  window.addEventListener('resize', fit);
  document.addEventListener('fullscreenchange', fit);

  // Small API for automation / recording tools.
  window.film = { play, pause, seek, get time() { return t; }, duration: DURATION };

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */

  async function boot() {
    buildCues();
    buildTiles();
    buildRail();
    buildGrain();
    fit();

    const fontLoads = [
      '900 100px "Inter Tight"', '800 100px "Inter Tight"', '600 100px "Inter Tight"',
      '500 100px "Inter Tight"', 'italic 600 100px "Inter Tight"',
      '500 20px "JetBrains Mono"', '700 20px "JetBrains Mono"',
    ].map((f) => document.fonts.load(f).catch(() => null));
    await Promise.race([
      Promise.all(fontLoads).then(() => document.fonts.ready),
      new Promise((r) => setTimeout(r, 6000)),
    ]);

    measure();
    // Re-measure if a font finishes late, so canvas anchors always match the type.
    document.fonts.addEventListener('loadingdone', () => { measure(); dirty = true; });
    [800, 2000, 4000].forEach((ms) => setTimeout(() => { measure(); dirty = true; }, ms));
    document.body.classList.remove('loading');
    render(t);
    requestAnimationFrame(tick);
    if (!params.has('paused')) setTimeout(() => { play(); }, DELAY * 1000 + 250);
    if (!CLEAN) wake();
  }

  boot();
})();
