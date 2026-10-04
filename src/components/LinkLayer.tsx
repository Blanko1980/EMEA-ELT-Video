import React from "react";
import { layout, theme } from "../theme";
import { eventById, personal } from "../lib/data";
import { eventVisible, eventX } from "./LaneEvent";
import { progress } from "../lib/time";

// Cross-links: thin brandAccent lines drawing in between a Daniel event and the world event it connects to.
export const LinkLayer: React.FC<{ t: number }> = ({ t }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    <defs>
      <filter id="linkGlow" x="-200%" y="-10%" width="500%" height="120%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
    </defs>
    {personal.events
      .filter((d) => d.link && eventVisible(d, t))
      .map((d) => {
        const w = eventById(d.link!.to);
        if (!eventVisible(w, t)) return null;
        const start = d.at + d.link!.at;
        const strong = !!d.link!.strong;
        const p = progress(t, start, start + (strong ? 0.12 : 0.5));
        if (p <= 0) return null;
        const fade = 1 - progress(t, Math.min(d.at + d.dwell, w.at + w.dwell) - 0.15, Math.min(d.at + d.dwell, w.at + w.dwell));
        const xd = eventX(d, t) + 2;
        const xw = eventX(w, t) + 2;
        const y1 = layout.danielTop + (d.y ?? 40);
        const y2 = layout.worldBottom - (w.lift ?? 24);
        const yEnd = y1 + (y2 - y1) * p;
        const xEnd = xd + (xw - xd) * p;
        return (
          <g key={d.id} opacity={fade}>
            {strong ? <line x1={xd} y1={y1} x2={xEnd} y2={yEnd} stroke={theme.brandAccent} strokeWidth={14} opacity={0.5} filter="url(#linkGlow)" /> : null}
            <line x1={xd} y1={y1} x2={xEnd} y2={yEnd} stroke={theme.brandAccent} strokeWidth={strong ? 5 : 2.5} strokeLinecap="round" />
            <circle cx={xEnd} cy={yEnd} r={strong ? 9 : 6} fill={theme.brandAccent} />
            <circle cx={xd} cy={y1} r={strong ? 9 : 6} fill={theme.brandAccent} />
          </g>
        );
      })}
  </svg>
);
