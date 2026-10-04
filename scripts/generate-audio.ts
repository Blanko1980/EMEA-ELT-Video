// Generates the film's music and sound effects entirely in code.
// Output: public/audio/music.mp3 and public/audio/sfx.mp3 (140 s, aligned to frame 0).
// Every SFX cue is derived from the same /src/data JSON that drives the animation, so picture and sound stay in sync.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import acts from "../src/data/acts.json";
import chatData from "../src/data/chat.json";
import worldData from "../src/data/world.json";
import personalData from "../src/data/personal.json";
import transition from "../src/data/transition.json";
import finale from "../src/data/finale.json";
import { peopleRows } from "../src/lib/people";

const SR = 44100;
const DUR = acts.durationSeconds;
const N = SR * DUR;

// ---------- deterministic noise ----------
let seed = 1234567;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noise = () => rnd() * 2 - 1;

// ---------- buses ----------
const bus = () => [new Float32Array(N), new Float32Array(N)] as [Float32Array, Float32Array];
const drums = bus();
const tonal = bus(); // ducked by the kick
const send = bus(); // reverb send
const sfx = bus();

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

const add = (target: [Float32Array, Float32Array], t0: number, sig: Float32Array, gain: number, pan = 0) => {
  const s0 = Math.round(t0 * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < sig.length; i++) {
    const j = s0 + i;
    if (j < 0 || j >= N) continue;
    target[0][j] += sig[i] * gl;
    target[1][j] += sig[i] * gr;
  }
};

// ---------- instruments ----------
const kick = (punch = 1) => {
  const len = Math.floor(SR * 0.45);
  const out = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 45 + 90 * Math.exp(-t * 28);
    ph += (2 * Math.PI * f) / SR;
    out[i] = Math.sin(ph) * Math.exp(-t * 7) + (i < 220 ? noise() * 0.25 * punch * (1 - i / 220) : 0);
  }
  return out;
};

const pulse = () => {
  const len = Math.floor(SR * 0.9);
  const out = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (52 + 20 * Math.exp(-t * 10))) / SR;
    out[i] = Math.sin(ph) * Math.min(1, t * 60) * Math.exp(-t * 3.2);
  }
  return out;
};

const clap = () => {
  const len = Math.floor(SR * 0.25);
  const out = new Float32Array(len);
  let lp = 0;
  let hp = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const n = noise();
    lp += 0.35 * (n - lp);
    hp = n - lp;
    const env = (t < 0.01 || (t > 0.012 && t < 0.022) ? 1 : 0.8) * Math.exp(-t * 18);
    out[i] = hp * env * 0.9 + Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 30) * 0.3;
  }
  return out;
};

const hat = (open = false) => {
  const len = Math.floor(SR * (open ? 0.18 : 0.05));
  const out = new Float32Array(len);
  let prev = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const n = noise();
    const h = n - prev;
    prev = n;
    out[i] = h * Math.exp(-t * (open ? 22 : 80)) * 0.5;
  }
  return out;
};

// Soft saw with one-pole lowpass and ADSR-ish envelope.
const synth = (freq: number, dur: number, opts: { cutoff: number; attack?: number; release?: number; detune?: number; voices?: number; wave?: "saw" | "tri" | "sine" }) => {
  const { cutoff, attack = 0.01, release = 0.2, detune = 0, voices = 1, wave = "saw" } = opts;
  const len = Math.floor(SR * (dur + release));
  const out = new Float32Array(len);
  const phases = Array.from({ length: voices }, () => rnd());
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  let lp = 0;
  let lp2 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let v = 0;
    for (let k = 0; k < voices; k++) {
      const f = freq * (1 + (voices > 1 ? (k / (voices - 1) - 0.5) * detune : 0));
      phases[k] = (phases[k] + f / SR) % 1;
      const p = phases[k];
      v += wave === "saw" ? 2 * p - 1 : wave === "tri" ? 1 - 4 * Math.abs(p - 0.5) : Math.sin(2 * Math.PI * p);
    }
    v /= voices;
    lp += a * (v - lp);
    lp2 += a * (lp - lp2);
    const env = t < attack ? t / attack : t < dur ? 1 : Math.max(0, 1 - (t - dur) / release);
    out[i] = lp2 * env;
  }
  return out;
};

const pluck = (freq: number, bright = 1) => {
  const len = Math.floor(SR * 0.6);
  const out = new Float32Array(len);
  let ph = 0;
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    ph = (ph + freq / SR) % 1;
    const v = 0.6 * (2 * ph - 1) + 0.4 * Math.sin(2 * Math.PI * ph);
    const cut = 300 + 4200 * bright * Math.exp(-t * 14);
    lp += (1 - Math.exp((-2 * Math.PI * cut) / SR)) * (v - lp);
    out[i] = lp * Math.exp(-t * 6) * Math.min(1, t * 400);
  }
  return out;
};

// ---------- harmony: F – C – Dm – Bb ----------
const CHORDS = [
  { root: 41, notes: [53, 57, 60, 64] }, // Fmaj7
  { root: 36, notes: [52, 55, 60, 62] }, // C(add9)
  { root: 38, notes: [53, 57, 60, 62] }, // Dm7
  { root: 34, notes: [50, 53, 58, 62] }, // Bbmaj7-ish
];

type Layers = { pulse?: boolean; kick?: "half" | "four"; clap?: boolean; hats?: 0 | 1 | 2; bass?: "long" | "eighths"; pad?: number; arp?: 0 | 8 | 16; lead?: boolean };
const sections: { start: number; end: number; bpm: number; layers: Layers }[] = [
  { start: 31, end: 35, bpm: acts.years[0].bpm, layers: { pulse: true } },
  { start: 35, end: 57, bpm: acts.years[1].bpm, layers: { kick: "half", hats: 1, bass: "long", pad: 0.5 } },
  { start: 57, end: 82, bpm: acts.years[2].bpm, layers: { kick: "half", hats: 1, bass: "long", pad: 0.6, arp: 8 } },
  { start: 82, end: 107, bpm: acts.years[3].bpm, layers: { kick: "four", clap: true, hats: 1, bass: "eighths", pad: 0.6, arp: 16 } },
  { start: 107, end: 127, bpm: acts.years[4].bpm, layers: { kick: "four", clap: true, hats: 2, bass: "eighths", pad: 0.7, arp: 16, lead: true } },
];

const kickTimes: number[] = [];
const LEAD = [72, 74, 76, 72, 69, 72, 74, 67];

for (const sec of sections) {
  const beat = 60 / sec.bpm;
  const L = sec.layers;
  for (let b = 0; sec.start + b * beat < sec.end - 0.01; b++) {
    const t = sec.start + b * beat;
    const bar = Math.floor(b / 4);
    const chord = CHORDS[bar % 4];
    const inBar = b % 4;
    if (L.pulse) add(drums, t, pulse(), 0.9);
    if (L.kick === "four" || (L.kick === "half" && inBar % 2 === 0)) {
      add(drums, t, kick(L.kick === "four" ? 1 : 0.4), L.kick === "four" ? 0.95 : 0.7);
      kickTimes.push(t);
    }
    if (L.clap && inBar % 2 === 1) add(drums, t, clap(), 0.35, 0.05);
    if (L.hats) {
      add(drums, t + beat / 2, hat(), 0.22, 0.3);
      if (L.hats === 2) {
        add(drums, t + beat / 4, hat(), 0.12, -0.3);
        add(drums, t + (3 * beat) / 4, hat(), 0.12, -0.3);
        if (inBar === 3) add(drums, t + beat / 2, hat(true), 0.18, 0.2);
      }
    }
    if (inBar === 0) {
      const barLen = 4 * beat;
      if (L.pad) {
        chord.notes.forEach((m, k) =>
          add(tonal, t, synth(mtof(m), barLen, { cutoff: 900 + L.pad! * 900, attack: 0.25, release: 0.5, detune: 0.012, voices: 3 }), 0.07 * L.pad!, k % 2 ? 0.4 : -0.4),
        );
        chord.notes.forEach((m) => add(send, t, synth(mtof(m), barLen, { cutoff: 1500, attack: 0.25, release: 0.5 }), 0.03 * L.pad!));
      }
      if (L.bass === "long") add(tonal, t, synth(mtof(chord.root), barLen * 0.95, { cutoff: 260, attack: 0.02, release: 0.15, wave: "saw" }), 0.38);
    }
    if (L.bass === "eighths") {
      for (let k = 0; k < 2; k++) add(tonal, t + (k * beat) / 2, synth(mtof(chord.root + (k === 1 && inBar === 3 ? 12 : 0)), beat * 0.42, { cutoff: 420, release: 0.05 }), 0.36);
    }
    if (L.arp) {
      const steps = L.arp === 16 ? 4 : 2;
      for (let k = 0; k < steps; k++) {
        const idx = (b * steps + k) % 8;
        const note = chord.notes[[0, 1, 2, 3, 2, 1, 3, 2][idx]] + 12;
        const sig = pluck(mtof(note), L.arp === 16 ? 1 : 0.7);
        add(tonal, t + (k * beat) / steps, sig, 0.09, idx % 2 ? 0.5 : -0.5);
        add(send, t + (k * beat) / steps, sig, 0.05);
      }
    }
    if (L.lead && inBar % 2 === 0 && t > 111) {
      const note = LEAD[(b / 2) % LEAD.length] + 12;
      const sig = synth(mtof(note), beat * 1.6, { cutoff: 2400, attack: 0.02, release: 0.3, wave: "tri" });
      add(tonal, t, sig, 0.07, 0.15);
      add(send, t, sig, 0.06);
    }
  }
}

// Riser into the exit at 2:05.
{
  const exitAt = personalData.exit.at;
  const start = exitAt - 2.4;
  const len = Math.floor(SR * (exitAt - start + 2));
  const sig = new Float32Array(len);
  let lp = 0;
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const p = Math.min(1, t / (exitAt - start));
    const cut = 400 + 9000 * p * p;
    lp += (1 - Math.exp((-2 * Math.PI * cut) / SR)) * (noise() - lp);
    ph += (2 * Math.PI * (180 + 900 * p * p)) / SR;
    sig[i] = (lp * 0.7 + Math.sin(ph) * 0.25) * p * p;
  }
  add(drums, start, sig, 0.5);
}

// Finale: one soft chord under the logo.
{
  const at = finale.ringsAt + 0.4;
  [41, 53, 57, 60, 67, 69].forEach((m, k) =>
    add(send, at, synth(mtof(m), DUR - at - 0.5, { cutoff: 1300, attack: 0.6, release: 0.5, detune: 0.01, voices: 3 }), 0.08, k % 2 ? 0.3 : -0.3),
  );
}

// Room tone during the cold open (very quiet, brown-ish noise).
{
  const len = Math.floor(SR * transition.dateAt);
  const sig = new Float32Array(len);
  let b = 0;
  for (let i = 0; i < len; i++) {
    b = (b + 0.02 * noise()) * 0.995;
    sig[i] = b * Math.min(1, i / SR / 1.5);
  }
  add(drums, 0, sig, 0.05);
}

// ---------- mix ----------
// Kick-driven ducking on the tonal bus.
const duck = new Float32Array(N).fill(1);
for (const kt of kickTimes) {
  const s0 = Math.round(kt * SR);
  for (let i = 0; i < SR * 0.3; i++) {
    const j = s0 + i;
    if (j >= N) break;
    duck[j] = Math.min(duck[j], 0.45 + 0.55 * Math.min(1, i / (SR * 0.25)));
  }
}

// Simple Schroeder reverb on the send bus.
const reverb = (inp: Float32Array, offset: number) => {
  const out = new Float32Array(N);
  const combs = [1557, 1617, 1491, 1422].map((d) => d + offset);
  for (const d of combs) {
    const buf = new Float32Array(d);
    let idx = 0;
    let lp = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx];
      lp = y * 0.7 + lp * 0.3;
      buf[idx] = inp[i] + lp * 0.84;
      out[i] += y * 0.25;
      idx = (idx + 1) % d;
    }
  }
  for (const d of [556 + offset, 441 + offset]) {
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < N; i++) {
      const b = buf[idx];
      const y = -out[i] + b;
      buf[idx] = out[i] + b * 0.5;
      out[i] = y;
      idx = (idx + 1) % d;
    }
  }
  return out;
};
const revL = reverb(send[0], 0);
const revR = reverb(send[1], 23);

// Global automation: music drops out under the voice lines, returns louder for 2025, stops dead at the exit cut.
const voiceEv = personalData.events.find((e) => e.id === "d-voice")!;
const voiceLines = (voiceEv.visual as unknown as { lines: { at: number; duration: number }[] }).lines;
const dropStart = voiceEv.at + voiceLines[0].at - 0.35;
const dropEnd = voiceEv.at + voiceLines[voiceLines.length - 1].at + voiceLines[voiceLines.length - 1].duration + 0.1;
const cut = personalData.exit.cut;
const gainAt = (t: number) => {
  let g = 1;
  if (t > dropStart - 0.3 && t < dropEnd + 0.4) {
    if (t < dropStart) g = 1 - (t - (dropStart - 0.3)) / 0.3;
    else if (t < dropEnd) g = 0;
    else g = (t - dropEnd) / 0.4;
  }
  if (t >= acts.years[3].start) g *= 1.35;
  if (t >= cut && t < finale.ringsAt) g = 0;
  return g;
};

const music = bus();
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const g = gainAt(t);
  const keepTail = t >= finale.ringsAt; // the closing chord lives on the send bus
  for (let c = 0; c < 2; c++) {
    const rev = c === 0 ? revL[i] : revR[i];
    const v = (drums[c][i] + tonal[c][i] * duck[i]) * g + rev * (keepTail ? 1 : g) * 0.9;
    music[c][i] = Math.tanh(v * 1.1);
  }
}

// ---------- SFX (derived from the data) ----------
const blip = (f0: number, f1: number, dur: number) => {
  const len = Math.floor(SR * dur);
  const out = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (f0 + (f1 - f0) * (t / dur))) / SR;
    out[i] = Math.sin(ph) * Math.exp(-t * (6 / dur)) * Math.min(1, t * 2000);
  }
  return out;
};
const tick = (bright = 1) => {
  const len = Math.floor(SR * 0.03);
  const out = new Float32Array(len);
  let prev = 0;
  for (let i = 0; i < len; i++) {
    const n = noise();
    out[i] = (n - prev * (1 - bright * 0.5)) * Math.exp((-i / SR) * 260);
    prev = n;
  }
  return out;
};
const whoosh = (dur: number, up = true) => {
  const len = Math.floor(SR * dur);
  const out = new Float32Array(len);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const p = i / len;
    const cut = up ? 300 + 5000 * p : 5300 - 5000 * p;
    lp += (1 - Math.exp((-2 * Math.PI * cut) / SR)) * (noise() - lp);
    out[i] = lp * Math.sin(Math.PI * p) * 1.6;
  }
  return out;
};
const shimmer = () => {
  const len = Math.floor(SR * 1.2);
  const out = new Float32Array(len);
  const fs = [2093, 2637, 3136, 4186];
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let v = 0;
    fs.forEach((f, k) => (v += Math.sin(2 * Math.PI * f * t + k) * Math.exp(-t * (2.5 + k)) * Math.min(1, Math.max(0, (t - k * 0.06) * 30))));
    out[i] = v * 0.25;
  }
  return out;
};
const thud = () => {
  const len = Math.floor(SR * 0.3);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    out[i] = Math.sin(2 * Math.PI * (70 + 60 * Math.exp(-t * 30)) * t) * Math.exp(-t * 14) + noise() * Math.exp(-t * 60) * 0.3;
  }
  return out;
};

type ChatItem = { at: number; type: string; from?: string; until?: number; reactionAt?: number };
const typingTicks = (from: number, to: number, perSec = 9) => {
  for (let t = from; t < to; t += 1 / perSec + (rnd() - 0.5) * 0.05) add(sfx, t, tick(0.6 + rnd() * 0.4), 0.18 + rnd() * 0.08, (rnd() - 0.5) * 0.4);
};

// Cold open + finale chat
for (const it of chatData.coldOpen as ChatItem[]) {
  if (it.type === "message") {
    if (it.from === "daniel") typingTicks(Math.max(0, it.at - 0.9), it.at - 0.05);
    add(sfx, it.at, blip(it.from === "ray" ? 880 : 660, it.from === "ray" ? 1180 : 990, 0.12), 0.35);
  }
  if (it.type === "clock") for (let k = 0; k < 3; k++) add(sfx, it.at + k * 0.3, tick(1), 0.3);
  if (it.reactionAt !== undefined) add(sfx, it.reactionAt, blip(1200, 1600, 0.09), 0.3);
}
for (const it of chatData.finale as ChatItem[]) {
  if (it.type === "compose") typingTicks(it.at, it.until ?? it.at + 1, 11);
  if (it.type === "message") add(sfx, it.at, blip(660, 990, 0.12), 0.35);
}

// Transition: the chat shrinks into the node
add(sfx, transition.shrinkAt - 0.1, whoosh(0.8, false), 0.4);
add(sfx, transition.dateAt, whoosh(0.7, true), 0.2);

type Ev = { id: string; at: number; dwell: number; visual?: Record<string, unknown>; people?: { group: string } };
const allEvents = [...(worldData as Ev[]), ...(personalData.events as Ev[])];

for (const e of allEvents) {
  const v = e.visual;
  // UI ticks on event entries: from 2025 on, and overlapping in 2026.
  if (e.at >= acts.years[3].start && !("quote" in e)) add(sfx, e.at, tick(1), e.at >= acts.years[4].start ? 0.45 : 0.3, (rnd() - 0.5) * 0.6);
  if (!v) continue;
  switch (v.type) {
    case "rewriteBlocks":
      typingTicks(e.at + 0.1, e.at + 0.9, 12);
      typingTicks(e.at + 1.35, e.at + 2.1, 12);
      break;
    case "promptInput":
      typingTicks(e.at + 0.15, e.at + 1.45, 11);
      break;
    case "regenerate":
      (v.clicks as number[]).forEach((c) => add(sfx, e.at + c, blip(1900, 1500, 0.035), 0.4));
      add(sfx, e.at + (v.resolveAt as number), blip(880, 1320, 0.25), 0.25);
      break;
    case "fakeStamp":
      add(sfx, e.at + 0.55, thud(), 0.5);
      break;
    case "diffusion":
    case "promptToPoster":
    case "frameGrid":
      add(sfx, e.at + (v.type === "promptToPoster" ? 0.6 : 0.3), shimmer(), 0.35);
      break;
    case "headlineCuts":
      add(sfx, e.at, thud(), 0.25);
      add(sfx, e.at + 1.25, thud(), 0.25);
      break;
    case "callback":
      add(sfx, e.at + (v.flipAt as number), whoosh(0.45, true), 0.3);
      add(sfx, e.at + (v.flipAt as number) + 0.45, thud(), 0.35);
      add(sfx, e.at + (v.rayAt as number), whoosh(0.35, true), 0.3);
      add(sfx, e.at + (v.rayAt as number) + 0.3, blip(880, 1180, 0.12), 0.3);
      break;
    case "verbs":
      (e as { label?: string }).label!.split(" ").forEach((_, i) => add(sfx, e.at + i * (v.interval as number), thud(), 0.4));
      break;
    case "question":
      typingTicks(e.at + 0.05, e.at + 1.45, 12);
      break;
    case "titleWrite":
      add(sfx, e.at, whoosh(0.7, true), 0.25);
      break;
  }
  if (e.people) {
    // A pop per person icon, pitched up as they accelerate.
    for (const row of peopleRows(e.people.group).filter((r) => r.active)) {
      for (let i = 0; i < row.count; i++) {
        const f = 600 * Math.pow(2, (row.index * 3 + i * 0.12) / 12);
        add(sfx, e.at + row.start + i * row.pop, blip(f, f * 1.25, 0.05), 0.4, (i / row.count - 0.5) * 0.8);
      }
    }
  }
}

// Crescendo: agent windows opening, overlapping
for (let i = 0; i < personalData.crescendo.windows.length; i++) add(sfx, personalData.crescendo.at + 0.25 + i * 0.12, blip(1400 + i * 120, 1800 + i * 120, 0.06), 0.25, (i % 2 ? 0.5 : -0.5));

// ---------- write ----------
const writeWav = (path: string, [l, r]: [Float32Array, Float32Array], normalizePeak?: number) => {
  let peak = 0;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
  const g = normalizePeak && peak > 0 ? normalizePeak / peak : 1;
  const buf = Buffer.alloc(44 + N * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + N * 4, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) {
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(l[i] * g * 32767))), 44 + i * 4);
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(r[i] * g * 32767))), 46 + i * 4);
  }
  writeFileSync(path, buf);
};

mkdirSync("public/audio", { recursive: true });
mkdirSync("out", { recursive: true });
writeWav("out/music.wav", music, 0.9);
writeWav("out/sfx.wav", sfx, 0.5);

// Two-pass loudness normalisation to a LUFS target with ffmpeg, then MP3.
const twoPass = (inp: string, out: string, target: number) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", inp, "-af", `loudnorm=I=${target}:TP=-1.5:LRA=11:print_format=json`, "-f", "null", "-"], { encoding: "utf8" });
  const json = JSON.parse(r.stderr.slice(r.stderr.lastIndexOf("{")));
  const af = `loudnorm=I=${target}:TP=-1.5:LRA=11:measured_I=${json.input_i}:measured_TP=${json.input_tp}:measured_LRA=${json.input_lra}:measured_thresh=${json.input_thresh}:offset=${json.target_offset}:linear=true`;
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", inp, "-af", af, "-ar", "44100", "-b:a", "192k", out]);
  console.log(`${out}: input ${json.input_i} LUFS → target ${target} LUFS`);
};

twoPass("out/music.wav", "public/audio/music.mp3", -18);
execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", "out/sfx.wav", "-b:a", "192k", "public/audio/sfx.mp3"]);
rmSync("out/music.wav");
rmSync("out/sfx.wav");
console.log("public/audio/sfx.mp3 written");
