import { interpolate } from "remotion";
import acts from "../data/acts.json";
import { easeIn, FPS } from "../theme";

export type YearDef = (typeof acts.years)[number];

export const toFrame = (seconds: number) => Math.round(seconds * FPS);
export const toSec = (frame: number) => frame / FPS;

export const yearAt = (t: number): YearDef => {
  const ys = acts.years;
  for (let i = ys.length - 1; i >= 0; i--) if (t >= ys[i].start) return ys[i];
  return ys[0];
};

// Timeline scroll position in px: integral of the per-year speed (speed doubles at each year change).
export const scrollAt = (t: number): number => {
  let p = 0;
  for (const y of acts.years) {
    if (t <= y.start) break;
    p += (Math.min(t, y.end) - y.start) * y.speed;
  }
  const last = acts.years[acts.years.length - 1];
  if (t > last.end) p += (t - last.end) * last.speed;
  return p;
};

// 0 → 1 entry progress with the brand entry easing.
export const enter = (t: number, at: number, dur = 0.4) =>
  interpolate(t, [at, at + dur], [0, 1], { easing: easeIn, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// 1 → 0 quick exit.
export const exit = (t: number, end: number, dur = 0.18) =>
  interpolate(t, [end - dur, end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const progress = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

// Words revealed one by one over a duration.
export const wordsShown = (text: string, t: number, at: number, perWord: number) => {
  const words = text.split(" ");
  const n = Math.max(0, Math.min(words.length, Math.floor((t - at) / perWord) + 1));
  return { words, n };
};

export const charsShown = (text: string, t: number, at: number, cps: number) =>
  Math.max(0, Math.min(text.length, Math.floor((t - at) * cps)));
