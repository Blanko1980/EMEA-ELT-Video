import React from "react";
import { interpolate, spring } from "remotion";
import { easeIn, FPS, layout, palette, teams, theme } from "../../theme";
import { chat } from "../../lib/data";
import { charsShown, clamp01, enter, exit, progress, toFrame } from "../../lib/time";
import { AudioWaveform, ProceduralWaveform } from "../Waveform";
import { Subtitle } from "../Subtitle";
import { AgentWindow } from "../AgentWindow";
import { production } from "../../config";
import type { VisualProps } from "./CardVisuals";

type Line = { speaker: string; at: number; duration: number; text: string; subtitle: string; audio: string };

// Dec 20, 2024: the first spoken words of the film. Works with audio (amplitude-driven waveform) or without (procedural).
const VoiceMoment: React.FC<VisualProps> = ({ e, local, t }) => {
  const lines = e.visual!.lines as Line[];
  const cx = 1060;
  const cy = layout.danielTop + 150;
  const bubbleIn = enter(t, e.at, 0.4);
  const morph = progress(local, 0.25, 0.6);
  const out = exit(t, e.at + e.dwell, 0.25);

  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      <div
        style={{
          position: "absolute",
          left: cx - 300,
          top: cy - 150,
          fontFamily: theme.fontText,
          fontSize: 22,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: theme.brandMuted,
          opacity: bubbleIn,
        }}
      >
        {e.date}
      </div>
      {lines.map((ln, i) => {
        const isAi = ln.speaker === "ai";
        const y = cy - 70 + i * 120;
        const active = progress(local, ln.at - 0.1, ln.at + 0.15) * (1 - progress(local, ln.at + ln.duration, ln.at + ln.duration + 0.25));
        const present = i === 0 ? 1 : progress(local, ln.at - 0.3, ln.at);
        const level = 0.25 + active * 0.75;
        const color = isAi ? theme.brandMuted : theme.brandLight;
        const useAudio = production.voice !== "none";
        return (
          <div key={i} style={{ position: "absolute", left: cx - 300 + (isAi ? 120 : 0), top: y, width: 600, height: 96, opacity: bubbleIn * present }}>
            {/* Bubble outline that dissolves into the waveform */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 48,
                border: `3px solid ${color}`,
                background: isAi ? "transparent" : theme.brandPrimary,
                opacity: i === 0 ? 1 - morph * 0.75 : 0.25,
              }}
            />
            <div style={{ position: "absolute", left: 40, top: 8 }}>
              {useAudio ? (
                <AudioWaveform src={ln.audio} startFrame={toFrame(e.at + ln.at)} width={520} height={80} color={color} level={1} t={local} bars={44} />
              ) : (
                <ProceduralWaveform width={520} height={80} color={color} level={level * (i === 0 ? morph : 1)} t={local} bars={44} smooth={isAi} seed={i * 3} />
              )}
            </div>
          </div>
        );
      })}
      {lines.map((ln, i) => {
        const op = progress(local, ln.at, ln.at + 0.15) * (1 - progress(local, ln.at + ln.duration + 0.2, ln.at + ln.duration + 0.35));
        if (op <= 0) return null;
        const isAi = ln.speaker === "ai";
        return (
          <Subtitle
            key={i}
            text={ln.subtitle}
            original={ln.subtitle !== ln.text ? ln.text : undefined}
            color={isAi ? theme.brandMuted : theme.brandLight}
            opacity={op}
          />
        );
      })}
    </div>
  );
};

// 2025 callback: "Dad" photo flips to AI-GENERATED; Ray's 2022 line flies back in.
const Callback: React.FC<VisualProps> = ({ e, local, t }) => {
  const v = e.visual! as unknown as { frameLabel: string; stamp: string; flipAt: number; textAt: number; rayAt: number; rayHold: number };
  const out = exit(t, e.at + e.dwell, 0.2);
  const flip = interpolate(local, [v.flipAt, v.flipAt + 0.45], [0, 180], { easing: easeIn, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const showBack = flip > 90;
  const frameIn = enter(t, e.at, 0.35);
  const textIn = progress(local, v.textAt, v.textAt + 0.3);
  const rayP = progress(local, v.rayAt, v.rayAt + 0.3);
  const rayOut = 1 - progress(local, v.rayAt + 0.3 + v.rayHold, v.rayAt + 0.6 + v.rayHold);
  const W = 200;
  const H = 250;
  const fx = 760;
  const fy = layout.danielTop + 60;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      <div style={{ position: "absolute", left: fx, top: fy, width: W, height: H, perspective: 900, opacity: frameIn, transform: `translateY(${(1 - frameIn) * 30}px)` }}>
        <div style={{ position: "absolute", inset: 0, transform: `rotateY(${flip}deg)`, transformStyle: "preserve-3d" }}>
          {!showBack ? (
            <div style={{ position: "absolute", inset: 0, background: palette.naturalWhite, borderRadius: 6, padding: 12 }}>
              <svg width={W - 24} height={H - 64} style={{ display: "block", background: palette.lightPlum50 }}>
                <circle cx={(W - 24) / 2} cy="70" r="34" fill={palette.deepPlum} />
                <path d={`M${(W - 24) / 2 - 70} ${H - 64} c0-60 30-86 70-86 s70 26 70 86z`} fill={palette.deepPlum} />
              </svg>
              <div style={{ fontFamily: theme.fontDisplay, fontStyle: "italic", fontSize: 26, color: palette.deepPlum, textAlign: "center", marginTop: 6 }}>{v.frameLabel}</div>
            </div>
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: palette.naturalWhite,
                borderRadius: 6,
                transform: "rotateY(180deg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontFamily: theme.fontText,
                  fontWeight: 900,
                  fontSize: 23,
                  whiteSpace: "nowrap",
                  letterSpacing: "0.04em",
                  color: palette.lightPlum,
                  border: `5px solid ${palette.lightPlum}`,
                  borderRadius: 8,
                  padding: "6px 10px",
                  transform: "rotate(-14deg)",
                }}
              >
                {v.stamp}
              </div>
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: fx + W + 60,
          top: fy + 70,
          width: 760,
          fontFamily: theme.fontDisplay,
          fontSize: 46,
          lineHeight: 1.25,
          color: theme.brandLight,
          opacity: textIn,
          transform: `translateY(${(1 - textIn) * 16}px)`,
        }}
      >
        {e.label}
      </div>
      {/* Ray's original bubble, back from 2022 */}
      {rayP > 0 && rayOut > 0 ? (
        <div
          style={{
            position: "absolute",
            left: interpolate(rayP, [0, 1], [-520, 90]),
            top: fy + 100,
            opacity: rayOut,
            background: teams.rayBubble,
            color: teams.text,
            fontFamily: teams.font,
            fontSize: 32,
            padding: "14px 24px",
            borderRadius: 8,
            boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
            transform: `rotate(${(1 - rayP) * -6}deg)`,
          }}
        >
          {chat.callbackLine}
        </div>
      ) : null}
    </div>
  );
};

const Verbs: React.FC<VisualProps> = ({ e, local, t }) => {
  const words = (e.label ?? "").split(" ");
  const interval = e.visual!.interval as number;
  const out = exit(t, e.at + e.dwell, 0.15);
  const scrim = Math.min(progress(local, 0, 0.2), out);
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 46, opacity: out }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, rgba(70,0,30,0.92) 0%, rgba(70,0,30,0.75) 55%, rgba(70,0,30,0.4) 100%)`, opacity: scrim }} />
      {words.map((w, i) => {
        const at = i * interval;
        const s = local < at ? 0 : spring({ frame: (local - at) * FPS, fps: FPS, config: { damping: 12, stiffness: 220 } });
        return (
          <div
            key={i}
            style={{
              fontFamily: theme.fontDisplay,
              fontWeight: 700,
              fontSize: 100,
              color: theme.brandAccent,
              transform: `scale(${s})`,
              opacity: Math.min(1, s * 2),
              textShadow: "0 8px 40px rgba(60,0,25,0.6)",
              position: "relative",
            }}
          >
            {w}
          </div>
        );
      })}
    </div>
  );
};

const TitleWrite: React.FC<VisualProps> = ({ e, local, t }) => {
  const p = progress(local, 0.05, 0.75);
  const out = exit(t, e.at + e.dwell, 0.15);
  return (
    <div style={{ position: "absolute", left: 300, right: 120, top: layout.danielTop + 120, opacity: out }}>
      <div style={{ fontFamily: theme.fontText, fontSize: 22, letterSpacing: "0.2em", textTransform: "uppercase", color: theme.brandMuted, marginBottom: 12, opacity: p > 0 ? 1 : 0 }}>
        {e.date}
      </div>
      <div
        style={{
          fontFamily: theme.fontDisplay,
          fontSize: 56,
          lineHeight: 1.2,
          color: theme.brandLight,
          clipPath: `inset(0 ${100 - p * 100}% 0 0)`,
        }}
      >
        {e.label}
      </div>
      <div style={{ height: 3, width: `${p * 100}%`, background: theme.brandAccent, marginTop: 14, maxWidth: 1400 }} />
    </div>
  );
};

const AgentPair: React.FC<VisualProps> = ({ e, local, t }) => {
  const out = exit(t, e.at + e.dwell, 0.15);
  return (
    <div style={{ position: "absolute", left: 300, top: layout.danielTop + 50, display: "flex", gap: 40, opacity: out }}>
      {(e.visual!.windows as string[]).map((w, i) => (
        <AgentWindow key={w} title={w} local={local - i * 0.15} width={520} speed={1.1} seed={`pair-${i}`} />
      ))}
    </div>
  );
};

const Question: React.FC<VisualProps> = ({ e, local, t }) => {
  const label = e.label ?? "";
  const n = charsShown(label, local, 0.05, label.length / 1.4);
  const out = exit(t, e.at + e.dwell, 0.25);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 46,
        textAlign: "center",
        fontFamily: theme.fontDisplay,
        fontStyle: "italic",
        fontSize: 44,
        color: theme.brandLight,
        opacity: out,
      }}
    >
      <span style={{ background: "rgba(60,0,25,0.6)", padding: "6px 24px", borderRadius: 8 }}>
        {label.slice(0, n)}
        <span style={{ color: theme.brandAccent, opacity: clamp01(Math.floor(local * 2.5) % 2 ? 0 : 1) }}>|</span>
      </span>
    </div>
  );
};

export const stageVisuals: Record<string, React.FC<VisualProps>> = {
  voice: VoiceMoment,
  callback: Callback,
  verbs: Verbs,
  titleWrite: TitleWrite,
  agentPair: AgentPair,
  question: Question,
};
