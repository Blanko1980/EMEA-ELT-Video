import React from "react";
import { random } from "remotion";
import { theme } from "../theme";
import { Quote } from "../lib/data";
import { enter, exit, progress } from "../lib/time";

type Props = {
  quote: Quote;
  t: number;
  at: number;
  dwell: number;
  style?: string;
  kicker?: string;
  x?: number;
  y?: number;
  width?: number;
};

export const QuoteCard: React.FC<Props> = ({ quote, t, at, dwell, style, kicker, x = 330, y = 40, width = 1260 }) => {
  if (t < at || t > at + dwell) return null;
  const local = t - at;
  const op = enter(t, at, 0.35) * exit(t, at + dwell);
  const text = quote.screenText ?? quote.text;
  const words = text.split(" ");
  const perWord = Math.min(0.09, (dwell * 0.35) / words.length);
  const shown = Math.min(words.length, Math.floor(local / perWord) + 1);
  const size = style === "minimal" ? 190 : text.length > 110 ? 46 : text.length > 60 ? 52 : 64;
  const attribution = `${quote.speaker}, ${quote.role} · ${quote.date}`;

  return (
    <div style={{ position: "absolute", left: x, top: y, width, opacity: op, transform: `translateY(${(1 - enter(t, at, 0.4)) * 20}px)` }}>
      {kicker ? (
        <div style={{ fontFamily: theme.fontText, fontSize: 22, letterSpacing: "0.2em", textTransform: "uppercase", color: theme.brandAccent, marginBottom: 14, marginLeft: 100 }}>
          {kicker}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 28 }}>
        <div
          style={{
            fontFamily: theme.fontDisplay,
            fontSize: 190,
            lineHeight: 0.8,
            color: theme.brandAccent,
            width: 72,
            flexShrink: 0,
            transform: `scale(${0.6 + enter(t, at, 0.5) * 0.4})`,
            transformOrigin: "top left",
          }}
        >
          “
        </div>
        <div>
          <div
            style={{
              fontFamily: theme.fontDisplay,
              fontStyle: style === "minimal" ? "italic" : "normal",
              fontSize: size,
              lineHeight: style === "minimal" ? 1 : 1.32,
              color: theme.brandLight,
              paddingTop: style === "minimal" ? 0 : 10,
            }}
          >
            {style === "drip" ? (
              <DripText text={text} local={local} perChar={Math.min(0.045, (dwell * 0.35) / text.length)} />
            ) : (
              words.map((w, i) => (
                <span key={i} style={{ opacity: i < shown ? 1 : 0 }}>
                  {w}
                  {i < words.length - 1 ? " " : ""}
                </span>
              ))
            )}
          </div>
          <div style={{ fontFamily: theme.fontText, fontSize: 22, color: theme.brandMuted, marginTop: 18, opacity: progress(local, 0.3, 0.7) }}>{attribution}</div>
        </div>
      </div>
    </div>
  );
};

// Letters appear one by one, then sag and drip slightly: the film's one playful moment.
const DripText: React.FC<{ text: string; local: number; perChar: number }> = ({ text, local, perChar }) => (
  <>
    {text.split("").map((ch, i) => {
      const at = i * perChar;
      const age = Math.max(0, local - at);
      const sag = Math.min(1, age / 1.4);
      const drips = random(`drip-${i}`) > 0.72 && ch !== " ";
      return (
        <span
          key={i}
          style={{
            display: "inline-block",
            whiteSpace: "pre",
            opacity: local >= at ? 1 : 0,
            transform: `translateY(${sag * (3 + random(`d-${i}`) * 6)}px) scaleY(${1 + sag * 0.1})`,
            transformOrigin: "top",
            position: "relative",
          }}
        >
          {ch}
          {drips && age > 0.3 ? (
            <span
              style={{
                position: "absolute",
                left: "40%",
                top: "88%",
                width: 7,
                height: 7 + Math.min(1, (age - 0.3) / 0.8) * 14,
                borderRadius: "0 0 6px 6px",
                background: theme.brandAccent,
                opacity: 0.9,
              }}
            />
          ) : null}
        </span>
      );
    })}
  </>
);
