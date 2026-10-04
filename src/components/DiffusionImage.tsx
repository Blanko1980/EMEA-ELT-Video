import React from "react";
import { random } from "remotion";
import { palette } from "../theme";
import { clamp01 } from "../lib/time";

const NOISE = [palette.lightPlum50, palette.charcoal70, palette.naturalWhite, palette.lightPlum80, palette.charcoal40, palette.aquaGreen];

const mix = (a: string, b: string, p: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * p)).join(",")})`;
};

// Abstract target: a sun over a horizon, in brand colours.
const target = (u: number, v: number) => {
  const dx = u - 0.62;
  const dy = v - 0.42;
  if (dx * dx + dy * dy < 0.045) return palette.canaryYellow;
  if (v > 0.62) return v > 0.8 ? palette.deepPlum : palette.lightPlum;
  if (v > 0.56) return palette.aquaGreen;
  return palette.lightPlum50;
};

// Image resolving from noise, cell by cell: a stylised diffusion process.
export const DiffusionImage: React.FC<{ width: number; height: number; p: number; seed?: string; cols?: number }> = ({
  width,
  height,
  p,
  seed = "diff",
  cols = 30,
}) => {
  const rows = Math.round((cols * height) / width);
  const cw = width / cols;
  const ch = height / rows;
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = `${seed}-${r}-${c}`;
      const local = clamp01((p - random(k) * 0.45) / 0.55);
      const step = Math.floor(p * 8);
      const noise = NOISE[Math.floor(random(`${k}-${step}`) * NOISE.length)];
      cells.push(<rect key={k} x={c * cw} y={r * ch} width={cw + 0.5} height={ch + 0.5} fill={mix(noise, target((c + 0.5) / cols, (r + 0.5) / rows), local)} />);
    }
  }
  return (
    <svg width={width} height={height} style={{ borderRadius: 10, display: "block" }}>
      {cells}
    </svg>
  );
};
