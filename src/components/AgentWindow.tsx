import React from "react";
import { random } from "remotion";
import { palette, theme } from "../theme";
import { clamp01 } from "../lib/time";

type Props = {
  title: string;
  // seconds since the window opened
  local: number;
  width?: number;
  speed?: number;
  seed?: string;
};

// A small agent at work: title bar, log lines appearing, a progress bar filling.
export const AgentWindow: React.FC<Props> = ({ title, local, width = 380, speed = 1, seed = "agent" }) => {
  const open = clamp01(local / 0.25);
  const prog = clamp01((local * speed) / 1.8);
  const lines = 4;
  return (
    <div
      style={{
        width,
        background: palette.naturalWhite,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 18px 40px rgba(40,0,15,0.35)",
        transform: `scale(${0.85 + open * 0.15})`,
        opacity: open,
        fontFamily: theme.fontText,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: palette.lightPlum50 + "33" }}>
        {[palette.lightPlum, palette.canaryYellow, palette.aquaGreen].map((c) => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
        ))}
        <div style={{ marginLeft: 8, fontSize: 18, fontWeight: 600, color: palette.charcoal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
      </div>
      <div style={{ padding: "12px 16px 16px" }}>
        {Array.from({ length: lines }, (_, i) => {
          const at = (i / lines) * 1.4;
          const w = clamp01((local * speed - at) / 0.35) * (45 + random(`${seed}-${i}`) * 50);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, height: 16, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: w > 0 ? palette.aquaGreen : "transparent" }} />
              <div style={{ height: 7, width: `${w}%`, borderRadius: 4, background: palette.charcoal40 }} />
            </div>
          );
        })}
        <div style={{ height: 8, borderRadius: 4, background: palette.charcoal40 + "55", marginTop: 8, overflow: "hidden" }}>
          <div style={{ width: `${prog * 100}%`, height: "100%", background: palette.aquaGreen }} />
        </div>
      </div>
    </div>
  );
};
