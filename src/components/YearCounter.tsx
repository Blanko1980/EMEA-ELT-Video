import React from "react";
import { interpolate } from "remotion";
import { easeIn, layout, theme } from "../theme";
import { acts } from "../lib/data";
import { progress } from "../lib/time";
import { RingAt } from "./IdentityRing";

export const COUNTER_X = 180;
export const COUNTER_Y = layout.timelineY;
export const COUNTER_R = 112;

type Props = { t: number; appearAt: number; exitAt: number; cutAt: number };

export const YearCounter: React.FC<Props> = ({ t, appearAt, exitAt, cutAt }) => {
  const years = acts.years;
  const idx = years.reduce((acc, y, i) => (t >= y.start ? i : acc), 0);
  const cur = years[idx];
  const prev = idx > 0 ? years[idx - 1] : null;
  const roll = idx > 0 ? interpolate(t, [cur.start, cur.start + 0.45], [0, 1], { easing: easeIn, extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const appear = progress(t, appearAt, appearAt + 0.5);
  const ex = progress(t, exitAt, cutAt);
  const exX = Math.pow(ex, 2) * 2200;

  const title = (acts.titleCardSeconds as Record<string, number>)[cur.year] ?? 0;
  const titleIn = cur.subtitle ? progress(t, cur.start + 0.15, cur.start + 0.55) : 0;
  const titleOut = 1 - progress(t, cur.start + title, cur.start + title + 0.35);
  const titleVis = titleIn * titleOut;
  const pulse = idx > 0 ? progress(t, cur.start, cur.start + 1.1) : 1;
  const spin = t * 6;

  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateX(${exX}px)`, opacity: 1 - ex * 0.6 }}>
      <RingAt x={COUNTER_X} y={COUNTER_Y} r={COUNTER_R + 22} variant="dots" color={theme.brandMuted} width={2.6} rotate={spin} opacity={appear * 0.9} seed="yc-outer" />
      <RingAt x={COUNTER_X} y={COUNTER_Y} r={COUNTER_R} variant="solid" color={theme.brandLight} width={3} draw={appear} opacity={0.9} seed="yc-inner" />
      {pulse < 1 ? (
        <RingAt
          x={COUNTER_X}
          y={COUNTER_Y}
          r={COUNTER_R + pulse * 340}
          variant="ticks"
          color={theme.brandAccent}
          width={3}
          rotate={-spin}
          opacity={(1 - pulse) * 0.7}
          seed="yc-pulse"
        />
      ) : null}

      <div
        style={{
          position: "absolute",
          left: COUNTER_X - COUNTER_R,
          top: COUNTER_Y - COUNTER_R,
          width: COUNTER_R * 2,
          height: COUNTER_R * 2,
          borderRadius: "50%",
          overflow: "hidden",
          opacity: appear,
        }}
      >
        {prev && roll < 1 ? <YearText text={prev.year} offset={-roll * 70} opacity={1 - roll} /> : null}
        <YearText text={cur.year} offset={(1 - roll) * 70} opacity={roll} />
        <div
          style={{
            position: "absolute",
            top: COUNTER_R + 40,
            width: "100%",
            textAlign: "center",
            fontFamily: theme.fontText,
            fontSize: 17,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: theme.brandMuted,
            opacity: roll * (1 - titleVis),
          }}
        >
          {cur.subtitle}
        </div>
      </div>

      {/* Act title card subtitle */}
      {titleVis > 0 ? (
        <div
          style={{
            position: "absolute",
            left: COUNTER_X + COUNTER_R + 60,
            top: COUNTER_Y - 128,
            fontFamily: theme.fontDisplay,
            fontStyle: "italic",
            fontSize: 64,
            color: theme.brandAccent,
            opacity: titleVis,
            transform: `translateX(${(1 - titleIn) * -30}px)`,
            whiteSpace: "nowrap",
          }}
        >
          {cur.subtitle}
        </div>
      ) : null}
    </div>
  );
};

const YearText: React.FC<{ text: string; offset: number; opacity: number }> = ({ text, offset, opacity }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: theme.fontDisplay,
      fontWeight: 700,
      fontSize: 62,
      color: theme.brandLight,
      transform: `translateY(${offset}px)`,
      opacity,
      fontVariantNumeric: "lining-nums",
    }}
  >
    {text}
  </div>
);
