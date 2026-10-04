import React from "react";
import { interpolate } from "remotion";
import { easeIn, theme } from "../theme";
import { acts, world } from "../lib/data";
import { progress } from "../lib/time";

const steps = world
  .filter((e) => e.userCount)
  .map((e) => ({ at: e.at + 0.3, value: e.userCount!.value, unit: e.userCount!.unit, ramp: e.userCount!.rampSeconds ?? 0.4 }));

const format = (v: number) => (v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${Math.round(v / 1e6)}M` : `${Math.round(v / 1e3)}K`);

export const UserCounter: React.FC<{ t: number; exitAt: number; cutAt: number }> = ({ t, exitAt, cutAt }) => {
  if (steps.length === 0 || t < steps[0].at) return null;
  let i = 0;
  while (i + 1 < steps.length && t >= steps[i + 1].at) i++;
  const cur = steps[i];
  const prev = i > 0 ? steps[i - 1] : null;
  const p = prev ? interpolate(t, [cur.at, cur.at + cur.ramp], [0, 1], { easing: easeIn, extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  // Count on a log scale so 1M → 100M reads as a race, not a jump.
  const from = prev ? Math.log10(prev.value) : Math.log10(cur.value);
  const value = Math.pow(10, from + (Math.log10(cur.value) - from) * p);
  const appear = progress(t, steps[0].at, steps[0].at + 0.4);
  const bump = prev ? 1 + Math.sin(Math.min(1, p) * Math.PI) * 0.12 : 1;
  const ex = progress(t, exitAt, cutAt);

  return (
    <div
      style={{
        position: "absolute",
        right: 72,
        top: 34,
        textAlign: "right",
        opacity: appear * (1 - ex),
        transform: `translateX(${Math.pow(ex, 2) * 600}px)`,
      }}
    >
      <div
        style={{
          fontFamily: theme.fontDisplay,
          fontWeight: 700,
          fontSize: 60,
          lineHeight: 1,
          color: theme.brandLight,
          transform: `scale(${bump})`,
          transformOrigin: "right center",
          fontVariantNumeric: "tabular-nums lining-nums",
        }}
      >
        {format(value)}
      </div>
      <div style={{ fontFamily: theme.fontText, fontSize: 19, letterSpacing: "0.16em", textTransform: "uppercase", color: theme.brandMuted, marginTop: 8 }}>
        {acts.userCounterLabel} {cur.unit}
      </div>
    </div>
  );
};
