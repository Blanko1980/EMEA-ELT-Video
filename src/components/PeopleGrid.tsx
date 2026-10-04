import React from "react";
import { spring } from "remotion";
import { FPS, theme } from "../theme";
import { peopleRows } from "../lib/people";

const SIZE = 26;
const GAP = 8;

const Person: React.FC<{ color: string; s: number }> = ({ color, s }) => (
  <svg width={SIZE} height={SIZE} viewBox="0 0 26 26" style={{ transform: `scale(${s})`, display: "block" }}>
    <circle cx="13" cy="8" r="5.5" fill={color} />
    <path d="M3 25c0-6 4.5-10 10-10s10 4 10 10z" fill={color} />
  </svg>
);

// People icons popping in row by row. `group` is the active group; earlier groups are already complete.
export const PeopleGrid: React.FC<{ group: string; local: number }> = ({ group, local }) => {
  const rows = peopleRows(group);
  const colours = [theme.brandAccent, theme.brandLight, theme.brandMuted, theme.brandLight, theme.brandAccent];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", gap: GAP }}>
            {Array.from({ length: row.count }, (_, i) => {
              const at = row.start + i * row.pop;
              const s = !row.active ? 1 : local < at ? 0 : spring({ frame: (local - at) * FPS, fps: FPS, config: { damping: 11, stiffness: 260 } });
              return <Person key={i} color={colours[ri % colours.length]} s={s} />;
            })}
          </div>
          <div
            style={{
              fontFamily: theme.fontText,
              fontSize: 20,
              color: theme.brandLight,
              opacity: !row.active || local > row.start + row.count * row.pop * 0.5 ? 0.85 : 0,
              whiteSpace: "nowrap",
            }}
          >
            {row.label}
          </div>
        </div>
      ))}
    </div>
  );
};
