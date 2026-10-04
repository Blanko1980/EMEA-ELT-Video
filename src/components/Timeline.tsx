import React from "react";
import { interpolate } from "remotion";
import { layout, theme, WIDTH } from "../theme";
import { progress, scrollAt } from "../lib/time";
import { RingAt } from "./IdentityRing";

export const LINE_START = 330;
export const CHAT_NODE_X = 560;
export const CHAT_NODE_AT = 32.6;

type Props = { t: number; exitAt: number; cutAt: number };

export const Timeline: React.FC<Props> = ({ t, exitAt, cutAt }) => {
  const y = layout.timelineY;
  const grow = progress(t, 32, 33.1);
  const left = CHAT_NODE_X - (CHAT_NODE_X - LINE_START) * grow;
  const right = CHAT_NODE_X + (WIDTH - CHAT_NODE_X) * grow;
  const ex = progress(t, exitAt, cutAt);
  const streak = Math.pow(ex, 1.6);

  const s = scrollAt(t);
  const spacing = 60;
  const ticks: React.ReactNode[] = [];
  const first = Math.floor((s + LINE_START) / spacing);
  for (let k = first; k * spacing - s < WIDTH + spacing; k++) {
    const x = k * spacing - s;
    if (x < left || x > right) continue;
    const major = k % 4 === 0;
    ticks.push(
      <line
        key={k}
        x1={x}
        x2={x}
        y1={y - (major ? 12 : 6)}
        y2={y + (major ? 12 : 6)}
        stroke={theme.brandLight}
        strokeOpacity={(major ? 0.35 : 0.2) * (1 - ex)}
        strokeWidth={2}
      />,
    );
  }

  const nodeX = CHAT_NODE_X - (s - scrollAt(CHAT_NODE_AT));
  const nodeIn = progress(t, CHAT_NODE_AT - 0.1, CHAT_NODE_AT + 0.1) * Math.max(0, Math.min(1, (nodeX - 330) / 50));

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={WIDTH} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <filter id="streakGlow" x="-10%" y="-400%" width="120%" height="900%">
            <feGaussianBlur stdDeviation={2 + streak * 10} />
          </filter>
        </defs>
        {ticks}
        {streak > 0 ? (
          <line
            x1={interpolate(streak, [0, 1], [left, -200])}
            x2={right + 200}
            y1={y}
            y2={y}
            stroke={theme.brandAccent}
            strokeWidth={2 + streak * 10}
            strokeOpacity={streak}
            filter="url(#streakGlow)"
          />
        ) : null}
        <line
          x1={left}
          x2={right}
          y1={y}
          y2={y}
          stroke={streak > 0.4 ? "#ffffff" : theme.brandLight}
          strokeOpacity={0.3 + streak * 0.7}
          strokeWidth={2 + streak * 2}
        />
      </svg>
      {t >= CHAT_NODE_AT - 0.1 && nodeIn > 0 ? (
        <>
          <RingAt x={nodeX} y={y} r={30} variant="dots" color={theme.brandLight} width={2.4} opacity={nodeIn * 0.8 * (1 - ex)} seed="chatnode" />
          <div
            style={{
              position: "absolute",
              left: nodeX - 12,
              top: y - 12,
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: theme.brandLight,
              opacity: nodeIn * (1 - ex),
            }}
          />
        </>
      ) : null}
    </div>
  );
};
