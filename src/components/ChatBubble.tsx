import React from "react";
import { interpolate, spring } from "remotion";
import { teams, theme, FPS } from "../theme";
import { progress } from "../lib/time";

export const CHAT_FONT = 30;

type Props = {
  side: "left" | "right";
  text: string;
  t: number;
  name?: string;
  initials?: string;
  timestamp?: string;
  hideDate?: boolean;
  highlight?: string;
  highlightAt?: number;
  reaction?: string;
  reactionAt?: number;
  children?: React.ReactNode;
};

const Avatar: React.FC<{ initials: string; size?: number }> = ({ initials, size = 48 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: "#5B5FC7",
      color: "#fff",
      fontSize: size * 0.38,
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    {initials}
  </div>
);

const Highlighted: React.FC<{ text: string; phrase?: string; p: number }> = ({ text, phrase, p }) => {
  if (!phrase || !text.includes(phrase) || p <= 0) return <>{text}</>;
  const i = text.indexOf(phrase);
  return (
    <>
      {text.slice(0, i)}
      <span
        style={{
          backgroundImage: `linear-gradient(${theme.brandAccent}, ${theme.brandAccent})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "0 100%",
          backgroundSize: `${p * 100}% 4px`,
          paddingBottom: 3,
          boxDecorationBreak: "clone",
          WebkitBoxDecorationBreak: "clone",
        }}
      >
        {phrase}
      </span>
      {text.slice(i + phrase.length)}
    </>
  );
};

export const ChatBubble: React.FC<Props> = ({
  side,
  text,
  t,
  name,
  initials,
  timestamp,
  hideDate,
  highlight,
  highlightAt,
  reaction,
  reactionAt,
  children,
}) => {
  const left = side === "left";
  const hp = highlightAt !== undefined ? progress(t, highlightAt, highlightAt + 0.6) : 0;
  const rs =
    reactionAt !== undefined && t >= reactionAt
      ? spring({ frame: (t - reactionAt) * FPS, fps: FPS, config: { damping: 10, stiffness: 180 } })
      : 0;
  const [datePart, timePart] = timestamp ? splitTimestamp(timestamp) : ["", ""];

  return (
    <div style={{ display: "flex", flexDirection: left ? "row" : "row-reverse", gap: 16, alignItems: "flex-start" }}>
      {left ? (
        <div style={{ width: 48, flexShrink: 0 }}>{timestamp && initials ? <Avatar initials={initials} /> : null}</div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", alignItems: left ? "flex-start" : "flex-end", maxWidth: 820 }}>
        {timestamp ? (
          <div style={{ fontSize: 21, color: teams.timestamp, marginBottom: 6, display: "flex", gap: 12 }}>
            {left && name ? <span style={{ color: "#D6D6D6", fontWeight: 600 }}>{name}</span> : null}
            <span>
              <span style={{ opacity: hideDate ? 0 : 1 }}>{datePart}</span> {timePart}
            </span>
          </div>
        ) : null}
        <div
          style={{
            position: "relative",
            background: left ? teams.rayBubble : teams.danielBubble,
            color: teams.text,
            fontSize: CHAT_FONT,
            lineHeight: 1.4,
            padding: "12px 20px",
            borderRadius: 8,
          }}
        >
          {children ?? <Highlighted text={text} phrase={highlight} p={hp} />}
          {reaction && rs > 0 ? (
            <div
              style={{
                position: "absolute",
                right: -14,
                bottom: -24,
                background: "#3B3B3B",
                border: "2px solid #1F1F1F",
                borderRadius: 20,
                padding: "2px 10px",
                fontSize: 26,
                transform: `scale(${interpolate(rs, [0, 1], [0.2, 1])})`,
                opacity: Math.min(1, rs * 2),
              }}
            >
              {reaction}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const splitTimestamp = (ts: string): [string, string] => {
  const i = ts.indexOf(" ");
  return i < 0 ? [ts, ""] : [ts.slice(0, i), ts.slice(i + 1)];
};

export { Avatar };
