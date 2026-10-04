import React from "react";
import { teams } from "../theme";
import { ChatItem, chat } from "../lib/data";
import { charsShown, progress } from "../lib/time";
import { Avatar, ChatBubble, CHAT_FONT } from "./ChatBubble";
import { TypingIndicator } from "./TypingIndicator";

export const CHAT_W = 1240;
export const CHAT_H = 940;

const BUBBLE_TEXT_W = 760;
const CHAR_W = CHAT_FONT * 0.47;

const estimateHeight = (item: ChatItem) => {
  if (item.type === "typing") return 66;
  if (item.type === "divider") return 70;
  if (item.type !== "message" || !item.text) return 0;
  const lines = Math.max(1, Math.ceil((item.text.length * CHAR_W) / BUBBLE_TEXT_W));
  return (item.timestamp ? 33 + 22 : 8) + lines * CHAT_FONT * 1.4 + 24;
};

type Props = {
  items: ChatItem[];
  t: number;
  // Opacity multiplier per item (used for dimming in the transition and finale).
  itemOpacity?: (item: ChatItem) => number;
  hideDateOf?: string;
};

const isVisible = (item: ChatItem, t: number) =>
  item.type !== "clock" && item.type !== "compose" && t >= item.at && (item.until === undefined || t < item.until);

export const ChatWindow: React.FC<Props> = ({ items, t, itemOpacity, hideDateOf }) => {
  const ray = chat.participants.ray;
  const daniel = chat.participants.daniel;
  const visible = items.filter((it) => isVisible(it, t));

  // Smooth scroll: newly arriving items push the column up over 6 frames.
  const offset = visible.reduce((acc, it) => acc + (1 - progress(t, it.at, it.at + 0.2)) * estimateHeight(it), 0);

  const compose = items.find((it) => it.type === "compose" && t >= it.at && t < (it.until ?? Infinity));
  const composeText = compose?.text ? compose.text.slice(0, charsShown(compose.text, t, compose.at, compose.text.length / ((compose.until! - compose.at) * 0.85))) : "";
  const clock = items.find((it) => it.type === "clock" && t >= it.at - 0.2 && t < (it.until ?? it.at) + 0.6);

  return (
    <div
      style={{
        width: CHAT_W,
        height: CHAT_H,
        background: teams.background,
        borderRadius: 14,
        border: "1px solid #333",
        boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
        overflow: "hidden",
        position: "relative",
        fontFamily: teams.font,
        color: teams.text,
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 92,
          background: teams.panel,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "0 32px",
          borderBottom: "1px solid #383838",
        }}
      >
        <Avatar initials={ray.initials} size={52} />
        <div style={{ fontSize: 28, fontWeight: 600 }}>{ray.name}</div>
        <div style={{ marginLeft: 26, fontSize: 22, color: "#D6D6D6", borderBottom: "3px solid #7F85F5", paddingBottom: 6, marginTop: 12 }}>
          Chat
        </div>
      </div>

      {/* Messages */}
      <div style={{ position: "absolute", top: 92, bottom: 104, left: 0, right: 0, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: 40,
            right: 40,
            bottom: 26,
            display: "flex",
            flexDirection: "column",
            transform: `translateY(${offset}px)`,
          }}
        >
          {visible.map((it, i) => {
            const p = progress(t, it.at, it.at + 0.2);
            const base = itemOpacity ? itemOpacity(it) : 1;
            const style: React.CSSProperties = {
              opacity: p * base,
              transform: `translateY(${(1 - p) * 12}px)`,
              marginTop: i === 0 ? 0 : it.timestamp || it.type !== "message" ? 26 : 8,
            };
            if (it.type === "divider") {
              return (
                <div key={i} style={{ ...style, display: "flex", alignItems: "center", gap: 20, color: teams.timestamp, fontSize: 21, margin: "26px 0 6px" }}>
                  <div style={{ flex: 1, height: 1, background: teams.divider }} />
                  {chat.finaleDate}
                  <div style={{ flex: 1, height: 1, background: teams.divider }} />
                </div>
              );
            }
            if (it.type === "typing") {
              return (
                <div key={i} style={{ ...style, display: "flex", gap: 16, alignItems: "center" }}>
                  <Avatar initials={ray.initials} />
                  <div style={{ background: teams.rayBubble, borderRadius: 8, padding: "6px 20px" }}>
                    <TypingIndicator t={t} />
                  </div>
                </div>
              );
            }
            const left = it.from === "ray";
            return (
              <div key={i} style={style}>
                <ChatBubble
                  side={left ? "left" : "right"}
                  text={it.text ?? ""}
                  t={t}
                  name={left ? ray.name : daniel.name}
                  initials={left ? ray.initials : daniel.initials}
                  timestamp={it.timestamp}
                  hideDate={hideDateOf !== undefined && it.id === hideDateOf}
                  highlight={it.highlight}
                  highlightAt={it.highlightAt}
                  reaction={it.reaction}
                  reactionAt={it.reactionAt}
                />
              </div>
            );
          })}
        </div>

        {clock ? <ClockChip item={clock} t={t} /> : null}
      </div>

      {/* Compose box */}
      <div
        style={{
          position: "absolute",
          left: 32,
          right: 32,
          bottom: 24,
          height: 64,
          borderRadius: 8,
          background: "#292929",
          borderBottom: compose ? "2px solid #7F85F5" : "2px solid #3a3a3a",
          display: "flex",
          alignItems: "center",
          padding: "0 22px",
          fontSize: 26,
          color: composeText ? teams.text : "#8A8A8A",
        }}
      >
        {composeText || "Type a message"}
        {compose ? <span style={{ opacity: Math.floor(t * 2.5) % 2 ? 0 : 1, marginLeft: 2 }}>|</span> : null}
      </div>
    </div>
  );
};

const ClockChip: React.FC<{ item: ChatItem; t: number }> = ({ item, t }) => {
  const [h, m0] = (item.from ?? "00:00").split(":").map(Number);
  const m1 = Number((item.to ?? "00:00").split(":")[1]);
  const p = progress(t, item.at, item.until ?? item.at + 1);
  const minute = Math.round(m0 + (m1 - m0) * p);
  const fade = Math.min(progress(t, item.at - 0.2, item.at), 1 - progress(t, (item.until ?? item.at) + 0.3, (item.until ?? item.at) + 0.6));
  return (
    <div
      style={{
        position: "absolute",
        top: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#2E2E2E",
        border: "1px solid #444",
        borderRadius: 30,
        padding: "8px 26px",
        fontSize: 26,
        color: teams.timestamp,
        opacity: fade,
        fontVariantNumeric: "tabular-nums",
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
    >
      <svg width="26" height="26" viewBox="0 0 26 26">
        <circle cx="13" cy="13" r="11" fill="none" stroke={teams.timestamp} strokeWidth="2" />
        <line x1="13" y1="13" x2="13" y2="6" stroke={teams.timestamp} strokeWidth="2" strokeLinecap="round" />
        <line
          x1="13"
          y1="13"
          x2={13 + 7 * Math.sin(p * Math.PI * 2)}
          y2={13 - 7 * Math.cos(p * Math.PI * 2)}
          stroke={teams.timestamp}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      {String(h).padStart(2, "0")}:{String(minute).padStart(2, "0")}
    </div>
  );
};
