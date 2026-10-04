import React from "react";
import { AbsoluteFill, random } from "remotion";
import { layout, theme } from "../theme";
import { acts } from "../lib/data";
import { useT } from "../lib/useT";
import { progress } from "../lib/time";
import { ActLanes } from "./ActLanes";

const act = acts.years.find((y) => y.year === "2025")!;

const MAX = 140;
const nodes = Array.from({ length: MAX }, (_, i) => ({
  x: 260 + random(`net-x-${i}`) * 1600,
  y: layout.danielTop + 30 + random(`net-y-${i}`) * 370,
}));
// Each node links to its nearest earlier node: the network grows outward.
const links = nodes.map((n, i) => {
  let best = -1;
  let bd = Infinity;
  for (let j = 0; j < i; j++) {
    const d = (nodes[j].x - n.x) ** 2 + (nodes[j].y - n.y) ** 2;
    if (d < bd) {
      bd = d;
      best = j;
    }
  }
  return best;
});

// In 2025 the Daniel lane turns from single events into a growing network of dots.
const DotNetwork: React.FC<{ t: number }> = ({ t }) => {
  const grow = progress(t, act.start, act.end);
  const count = Math.floor(6 + grow * grow * (MAX - 6));
  const fade = 1 - progress(t, act.end - 0.3, act.end + 0.4);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 0.26 * fade * progress(t, act.start, act.start + 0.6) }}>
      {nodes.slice(0, count).map((n, i) =>
        links[i] >= 0 ? <line key={`l${i}`} x1={n.x} y1={n.y} x2={nodes[links[i]].x} y2={nodes[links[i]].y} stroke={theme.brandMuted} strokeWidth={1.5} /> : null,
      )}
      {nodes.slice(0, count).map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={i % 7 === 0 ? 6 : 4} fill={i % 7 === 0 ? theme.brandAccent : theme.brandLight} />
      ))}
    </svg>
  );
};

// 1:22–1:47 – 2025, Enabling others: AI literacy becomes a legal duty; curiosity becomes responsibility.
export const Act3_2025: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill>
      <DotNetwork t={t} />
      <ActLanes t={t} from={act.start} to={act.end} />
    </AbsoluteFill>
  );
};
