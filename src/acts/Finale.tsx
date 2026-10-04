import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile } from "remotion";
import { easeIn, FPS, logo, palette, theme } from "../theme";
import { chat, ChatItem } from "../lib/data";
import { useT } from "../lib/useT";
import { progress } from "../lib/time";
import { ChatWindow, CHAT_H, CHAT_W } from "../components/ChatWindow";
import { RingAt, RingVariant } from "../components/IdentityRing";
import finaleData from "../data/finale.json";

// The old conversation is already there (scrolled up, dimmed); the new one continues below it.
const oldItems: ChatItem[] = chat.coldOpen
  .filter((it) => it.type === "message")
  .map((it) => ({ ...it, at: 0, highlightAt: undefined, reactionAt: it.reactionAt !== undefined ? 0 : undefined }));
const items = [...oldItems, ...chat.finale];

const Wink: React.FC<{ s: number }> = ({ s }) => (
  <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: `scale(${s}) rotate(${(1 - s) * -30}deg)`, marginLeft: 18, verticalAlign: "middle" }}>
    <circle cx="32" cy="32" r="28" fill="none" stroke={theme.brandAccent} strokeWidth="4" />
    <circle cx="22" cy="26" r="4" fill={theme.brandAccent} />
    <path d="M37 27 q6 -5 11 0" fill="none" stroke={theme.brandAccent} strokeWidth="4" strokeLinecap="round" />
    <path d="M20 40 q12 11 24 0" fill="none" stroke={theme.brandAccent} strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const RINGS: { variant: RingVariant; r: number; w: number }[] = [
  { variant: "ticks", r: 980, w: 5 },
  { variant: "dots", r: 820, w: 5 },
  { variant: "segments", r: 680, w: 10 },
  { variant: "fine", r: 560, w: 4 },
  { variant: "dashes", r: 450, w: 6 },
  { variant: "scatter", r: 350, w: 4 },
  { variant: "double", r: 270, w: 5 },
];

// 2:07–2:20 – back to the chat, an unanswered question, the reveal, the logo.
export const Finale: React.FC = () => {
  const t = useT();
  const f = finaleData;

  if (t < f.chatIn) return <AbsoluteFill style={{ background: "#000" }} />;

  if (t < f.cutToBrand) {
    const op = progress(t, f.chatIn, f.chatIn + 0.6);
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: op }}>
        <div style={{ width: CHAT_W, height: CHAT_H }}>
          <ChatWindow items={items} t={t} itemOpacity={(it) => (it.at === 0 ? 0.3 : 1)} />
        </div>
      </AbsoluteFill>
    );
  }

  const words = chat.outro.line1.split(" ");
  const shown = Math.min(words.length, Math.floor((t - f.cutToBrand - 0.15) / f.perWord) + 1);
  const line2 = progress(t, f.line2At, f.line2At + 0.4);
  const winkS = t < f.line2At + 0.5 ? 0 : spring({ frame: (t - f.line2At - 0.5) * FPS, fps: FPS, config: { damping: 9 } });
  const close = interpolate(t, [f.ringsAt, f.ringsAt + f.ringsDur], [0, 1], { easing: easeIn, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textOut = 1 - progress(t, f.ringsAt, f.ringsAt + 0.3);
  const wipe = interpolate(t, [f.wipeAt, f.wipeAt + 0.45], [0, 1], { easing: easeIn, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const logoIn = interpolate(t, [f.wipeAt, f.wipeAt + 0.4], [0.85, 1], { easing: easeIn, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const R = f.logoDiameter / 2;

  return (
    <AbsoluteFill style={{ background: theme.brandDark }}>
      {/* Reveal text */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: textOut }}>
        <div style={{ fontFamily: theme.fontDisplay, fontSize: 68, color: theme.brandLight, textAlign: "center", maxWidth: 1500 }}>
          {words.map((w, i) => (
            <span key={i} style={{ opacity: i < shown ? 1 : 0 }}>
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          ))}
        </div>
        <div style={{ fontFamily: theme.fontText, fontSize: 40, color: theme.brandMuted, marginTop: 30, opacity: line2, display: "flex", alignItems: "center" }}>
          {chat.outro.line2}
          <Wink s={winkS} />
        </div>
      </AbsoluteFill>

      {/* Identity rings close in on the centre */}
      {t >= f.ringsAt && wipe < 1
        ? RINGS.map((ring, i) => {
            const p = progress(close, i * 0.04, 1);
            const r = R + (ring.r - R) * (1 - p) + 40 * (1 - p) * (i % 2);
            return (
              <RingAt
                key={i}
                x={960}
                y={540}
                r={r}
                variant={ring.variant}
                color={i % 2 ? palette.lightPlum50 : palette.naturalWhite}
                width={ring.w}
                rotate={(i % 2 ? -1 : 1) * close * 90}
                opacity={Math.min(1, close * 3) * (0.9 - p * 0.3)}
                seed={`fin-${i}`}
              />
            );
          })
        : null}

      {/* Natural White opens from the logo outward; the official Positive logo sits in the centre */}
      {wipe > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 960,
            top: 540,
            width: 0,
            height: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: -(R + wipe * 1200),
              top: -(R + wipe * 1200),
              width: 2 * (R + wipe * 1200),
              height: 2 * (R + wipe * 1200),
              borderRadius: "50%",
              background: palette.naturalWhite,
            }}
          />
          {logo.available ? (
            <Img
              src={staticFile(logo.file)}
              style={{ position: "absolute", left: -R, top: -R, width: 2 * R, height: 2 * R, transform: `scale(${logoIn})` }}
            />
          ) : null}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
