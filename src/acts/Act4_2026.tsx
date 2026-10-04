import React from "react";
import { AbsoluteFill, random } from "remotion";
import { layout, palette, theme } from "../theme";
import { acts, personal } from "../lib/data";
import { useT } from "../lib/useT";
import { progress } from "../lib/time";
import { ActLanes } from "./ActLanes";
import { AgentWindow } from "../components/AgentWindow";
import { RingAt } from "../components/IdentityRing";

const act = acts.years.find((y) => y.year === "2026")!;
const agentsLeave = 108;

// Small agent windows keep opening across the world lane for the rest of the film.
const AgentField: React.FC<{ t: number }> = ({ t }) => {
  const n = 16;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const at = agentsLeave + 0.3 + i * 0.9 + random(`af-${i}`) * 0.5;
        if (t < at) return null;
        const x = 280 + random(`afx-${i}`) * 1380;
        const y = layout.worldTop + 150 + random(`afy-${i}`) * 200;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, opacity: 0.28, transform: "scale(0.55)", transformOrigin: "top left" }}>
            <AgentWindow title={`agent-${String(i + 1).padStart(2, "0")}`} local={t - at} width={300} speed={0.8} seed={`af-${i}`} />
          </div>
        );
      })}
    </>
  );
};

// 2:03 – crescendo: agent windows around a central circle, Daniel conducting.
const Crescendo: React.FC<{ t: number }> = ({ t }) => {
  const c = personal.crescendo;
  if (t < c.at) return null;
  const cx = 1080;
  const cy = 540;
  const n = c.windows.length;
  const centreIn = progress(t, c.at, c.at + 0.3);
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {c.windows.map((w, i) => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2 + 0.3;
          const x = cx + Math.cos(a) * 600;
          const y = cy + Math.sin(a) * 330;
          const at = c.at + 0.12 + i * 0.12;
          const p = progress(t, at, at + 0.22);
          const bend = (random(`cb-${i}`) - 0.5) * 220;
          const mx = (cx + x) / 2 - Math.sin(a) * bend;
          const my = (cy + y) / 2 + Math.cos(a) * bend;
          return (
            <path
              key={w}
              d={`M${cx},${cy} Q${mx},${my} ${x},${y}`}
              fill="none"
              stroke={theme.brandAccent}
              strokeWidth={3}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${p} 1`}
            />
          );
        })}
      </svg>
      {c.windows.map((w, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2 + 0.3;
        const x = cx + Math.cos(a) * 600;
        const y = cy + Math.sin(a) * 330;
        const at = c.at + 0.25 + i * 0.12;
        if (t < at) return null;
        return (
          <div key={w} style={{ position: "absolute", left: x - 150, top: y - 60 }}>
            <AgentWindow title={w} local={t - at} width={300} speed={1.6} seed={`cr-${i}`} />
          </div>
        );
      })}
      <RingAt x={cx} y={cy} r={130} variant="ticks" color={theme.brandAccent} width={3} rotate={t * 60} opacity={centreIn} seed="cr-r1" />
      <RingAt x={cx} y={cy} r={160} variant="dots" color={theme.brandLight} width={2.5} rotate={-t * 40} opacity={centreIn * 0.7} seed="cr-r2" />
      <div
        style={{
          position: "absolute",
          left: cx - 100,
          top: cy - 100,
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: palette.lightPlum,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: theme.fontDisplay,
          fontSize: 40,
          color: theme.brandLight,
          transform: `scale(${centreIn})`,
          boxShadow: "0 0 80px rgba(242,199,90,0.35)",
        }}
      >
        {c.centre}
      </div>
    </AbsoluteFill>
  );
};

// 1:47–2:07 – 2026, Directing: events overlap, the frame fills with agents, Daniel conducts.
export const Act4_2026: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill>
      <AgentField t={t} />
      <ActLanes t={t} from={act.start} to={act.end} />
      <Crescendo t={t} />
    </AbsoluteFill>
  );
};
