import React from "react";
import { staticFile, useCurrentFrame } from "remotion";
import { useAudioData, visualizeAudio } from "@remotion/media-utils";
import { FPS } from "../theme";

type Props = {
  width: number;
  height: number;
  color: string;
  // 0..1 envelope applied on top of the signal
  level: number;
  t: number;
  bars?: number;
  smooth?: boolean;
  seed?: number;
};

// Procedural fallback: layered sines with a slow noise-like modulation.
const procedural = (i: number, n: number, t: number, smooth: boolean, seed: number) => {
  const x = i / n;
  const env = Math.sin(x * Math.PI);
  const a = Math.sin(x * 23 + t * 9 + seed) * 0.5 + Math.sin(x * 41 - t * 13 + seed * 2) * 0.3 + Math.sin(x * 7 + t * 5) * 0.4;
  const v = smooth ? (Math.sin(x * 9 + t * 6 + seed) * 0.5 + 0.5) * 0.8 + 0.2 : Math.abs(a);
  return Math.min(1, env * v * 1.2);
};

export const ProceduralWaveform: React.FC<Props> = ({ width, height, color, level, t, bars = 48, smooth = false, seed = 0 }) => {
  const gap = width / bars;
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      {Array.from({ length: bars }, (_, i) => {
        const h = Math.max(3, procedural(i, bars, t, smooth, seed) * height * level);
        return <rect key={i} x={i * gap + gap * 0.2} y={(height - h) / 2} width={gap * 0.6} height={h} rx={gap * 0.3} fill={color} />;
      })}
    </svg>
  );
};

// Waveform driven by an audio file's amplitude (useAudioData + visualizeAudio).
// `startFrame` is the absolute frame at which the audio starts playing.
export const AudioWaveform: React.FC<Props & { src: string; startFrame: number }> = ({ src, startFrame, width, height, color, level, bars = 48 }) => {
  const frame = useCurrentFrame();
  const audioData = useAudioData(staticFile(src));
  if (!audioData) return <div style={{ width, height }} />;
  const local = frame - startFrame;
  const inRange = local >= 0 && local < audioData.durationInSeconds * FPS;
  const values = inRange ? visualizeAudio({ fps: FPS, frame: local, audioData, numberOfSamples: 64, optimizeFor: "speed" }) : [];
  const gap = width / bars;
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      {Array.from({ length: bars }, (_, i) => {
        // Mirror the low-frequency bins around the centre for a voice-like shape.
        const centre = Math.abs(i - bars / 2) / (bars / 2);
        const bin = Math.min(values.length - 1, Math.floor(centre * 12));
        const v = values.length ? Math.min(1, Math.sqrt((values[bin] ?? 0) * 4)) : 0;
        const h = Math.max(3, v * height * level * (1 - centre * 0.35));
        return <rect key={i} x={i * gap + gap * 0.2} y={(height - h) / 2} width={gap * 0.6} height={h} rx={gap * 0.3} fill={color} />;
      })}
    </svg>
  );
};
