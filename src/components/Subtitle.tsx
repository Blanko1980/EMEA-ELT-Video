import React from "react";
import { theme } from "../theme";

export const Subtitle: React.FC<{ text: string; original?: string; color?: string; opacity: number }> = ({
  text,
  original,
  color = theme.brandLight,
  opacity,
}) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 64,
      textAlign: "center",
      opacity,
      fontFamily: theme.fontText,
    }}
  >
    {original ? (
      <div style={{ fontSize: 26, fontStyle: "italic", color: theme.brandMuted, marginBottom: 6 }}>„{original}“</div>
    ) : null}
    <div
      style={{
        display: "inline-block",
        fontSize: 44,
        fontWeight: 600,
        color,
        background: "rgba(60,0,25,0.55)",
        padding: "6px 22px",
        borderRadius: 8,
      }}
    >
      {text}
    </div>
  </div>
);
