import React from "react";
import { teams } from "../theme";

export const TypingIndicator: React.FC<{ t: number; color?: string; size?: number }> = ({
  t,
  color = teams.timestamp,
  size = 12,
}) => (
  <div style={{ display: "flex", gap: size * 0.7, alignItems: "center", height: size * 2.4 }}>
    {[0, 1, 2].map((i) => {
      const phase = (t * 2.6 - i * 0.22) % 1;
      const pulse = Math.max(0, Math.sin(Math.max(0, phase) * Math.PI));
      return (
        <div
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: color,
            opacity: 0.35 + pulse * 0.65,
            transform: `translateY(${-pulse * size * 0.45}px)`,
          }}
        />
      );
    })}
  </div>
);
