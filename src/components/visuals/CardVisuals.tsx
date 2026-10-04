import React from "react";
import { interpolate, random, spring } from "remotion";
import { easeIn, FPS, palette, theme } from "../../theme";
import { LaneEventData } from "../../lib/data";
import { charsShown, clamp01, progress } from "../../lib/time";
import { ProceduralWaveform } from "../Waveform";
import { DiffusionImage } from "../DiffusionImage";
import { WorldMap } from "../WorldMap";
import { PeopleGrid } from "../PeopleGrid";
import { AgentWindow } from "../AgentWindow";

export type VisualProps = { e: LaneEventData; local: number; t: number; lane: "world" | "daniel" };

const text = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: theme.fontText,
  fontSize: size,
  color: theme.brandLight,
  ...extra,
});

const Wordmarks: React.FC<VisualProps> = ({ e, local, lane }) => (
  <div style={{ display: "flex", gap: 14 }}>
    {((e.visual!.items as string[]) ?? []).map((w, i) => {
      const p = progress(local, 0.15 + i * 0.22, 0.45 + i * 0.22);
      return (
        <div
          key={w}
          style={text(30, {
            fontWeight: 700,
            padding: "8px 20px",
            borderRadius: 10,
            border: `2px solid ${lane === "daniel" ? theme.brandLight : theme.brandMuted}`,
            opacity: p,
            transform: `translateX(${(1 - p) * 30}px)`,
            letterSpacing: "0.01em",
          })}
        >
          {w}
        </div>
      );
    })}
  </div>
);

const FakeStamp: React.FC<VisualProps> = ({ e, local }) => {
  const s = local < 0.55 ? 0 : spring({ frame: (local - 0.55) * FPS, fps: FPS, config: { damping: 14, stiffness: 260 } });
  return (
    <div style={{ position: "relative", width: 200, height: 150, borderRadius: 10, background: palette.charcoal70, overflow: "hidden", zoom: 1.35 }}>
      <svg width="200" height="150" style={{ position: "absolute", inset: 0 }}>
        <circle cx="100" cy="52" r="18" fill={palette.charcoal40} />
        <path d="M58 150c0-48 18-74 42-74s42 26 42 74z" fill={palette.iceWhite} opacity={0.85} />
        {[96, 110, 124].map((y) => (
          <line key={y} x1="64" x2="136" y1={y} y2={y} stroke={palette.charcoal40} strokeWidth="3" />
        ))}
      </svg>
      {s > 0 ? (
        <div
          style={text(46, {
            position: "absolute",
            left: 22,
            top: 46,
            fontWeight: 900,
            color: theme.brandAccent,
            border: `5px solid ${theme.brandAccent}`,
            borderRadius: 8,
            padding: "0 14px",
            transform: `rotate(-12deg) scale(${interpolate(s, [0, 1], [2.4, 1])})`,
            opacity: Math.min(1, s * 1.5),
            letterSpacing: "0.08em",
          })}
        >
          {e.visual!.stamp as string}
        </div>
      ) : null}
    </div>
  );
};

const HeadlineCuts: React.FC<VisualProps> = ({ e, local }) => {
  const parts = (e.label ?? "").split(". ").map((s) => s.replace(/\.$/, ""));
  const cut = 1.25;
  const idx = local < cut ? 0 : 1;
  const flash = local < 0.08 || (local > cut && local < cut + 0.08);
  return (
    <div
      style={{
        position: "relative",
        background: flash ? theme.brandLight : "rgba(255,244,237,0.08)",
        borderLeft: `6px solid ${theme.brandAccent}`,
        padding: "16px 26px",
        width: 820,
      }}
    >
      <div style={text(18, { letterSpacing: "0.25em", color: theme.brandAccent, fontWeight: 700 })}>{idx === 0 ? "BREAKING" : "UPDATE"}</div>
      <div style={{ fontFamily: theme.fontDisplay, fontSize: 46, fontWeight: 700, color: flash ? theme.brandDark : theme.brandLight, marginTop: 4 }}>
        {parts[Math.min(idx, parts.length - 1)]}
      </div>
    </div>
  );
};

const FrameGrid: React.FC<VisualProps> = ({ local }) => {
  const moving = local > 0.7;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 74px)", gap: 8 }}>
      {Array.from({ length: 10 }, (_, i) => {
        const flick = random(`fg-${i}-${Math.floor(local * 12)}`) > 0.5;
        const phase = moving ? local * 1.6 + i * 0.1 : i * 0.1;
        const op = local < 0.7 ? (flick ? 0.9 : 0.3) : 1;
        return (
          <div key={i} style={{ width: 74, height: 48, borderRadius: 6, background: palette.charcoal90, position: "relative", overflow: "hidden", opacity: op }}>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 14, background: palette.aquaGreen }} />
            <div
              style={{
                position: "absolute",
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: theme.brandAccent,
                left: 6 + ((phase * 60) % 60),
                top: 20 - Math.abs(Math.sin(phase * Math.PI)) * 16,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

const Wave: React.FC<VisualProps> = ({ local }) => <ProceduralWaveform width={380} height={80} color={theme.brandLight} level={clamp01(local / 0.3)} t={local} bars={40} />;

const SpinnerThought: React.FC<VisualProps> = ({ local }) => {
  const m = progress(local, 0.45, 0.75);
  return (
    <svg width="220" height="110" style={{ overflow: "visible" }}>
      <g opacity={1 - m} transform={`rotate(${local * 540} 50 55)`}>
        <circle cx="50" cy="55" r="30" fill="none" stroke={theme.brandMuted} strokeOpacity={0.35} strokeWidth="6" />
        <path d="M50 25 a30 30 0 0 1 30 30" fill="none" stroke={theme.brandLight} strokeWidth="6" strokeLinecap="round" />
      </g>
      <g opacity={m} transform={`translate(${(1 - m) * -20} 0)`}>
        <circle cx="38" cy="88" r="7" fill={theme.brandLight} />
        <circle cx="58" cy="70" r="11" fill={theme.brandLight} />
        <ellipse cx="130" cy="44" rx="70" ry="40" fill={theme.brandLight} />
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={108 + i * 22} cy="44" r="6" fill={theme.brandDark} opacity={0.4 + 0.6 * ((Math.floor(local * 6) - i + 3) % 3 === 0 ? 1 : 0.3)} />
        ))}
      </g>
    </svg>
  );
};

const Medals: React.FC<VisualProps> = ({ e, local }) => (
  <div style={{ display: "flex", gap: 28 }}>
    {(e.visual!.items as string[]).map((m, i) => {
      const s = local < 0.1 + i * 0.2 ? 0 : spring({ frame: (local - 0.1 - i * 0.2) * FPS, fps: FPS, config: { damping: 12 } });
      return (
        <div key={m} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transform: `scale(${s})` }}>
          <svg width="86" height="86">
            <circle cx="43" cy="43" r="38" fill={theme.brandAccent} />
            <circle cx="43" cy="43" r="29" fill="none" stroke={theme.brandDark} strokeOpacity={0.35} strokeWidth="3" />
            <text x="43" y="52" textAnchor="middle" fontFamily={theme.fontDisplay} fontSize="26" fontWeight="700" fill={theme.brandDark}>
              N
            </text>
          </svg>
          <div style={text(18, { color: theme.brandMuted })}>{m}</div>
        </div>
      );
    })}
  </div>
);

const StockDrop: React.FC<VisualProps> = ({ local }) => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 30; i++) {
    const x = (i / 30) * 300;
    const y = 90 - i * 2.1 + Math.sin(i * 1.7) * 5;
    pts.push([x, y]);
  }
  pts.push([306, 130], [380, 136], [400, 132]);
  const draw = progress(local, 0, 0.9);
  const n = Math.max(2, Math.floor(draw * pts.length));
  const d = pts.slice(0, n).map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  return (
    <svg width="420" height="150" style={{ overflow: "visible" }}>
      <line x1="0" x2="420" y1="145" y2="145" stroke={theme.brandMuted} strokeOpacity={0.4} />
      <path d={d} fill="none" stroke={n > 31 ? theme.brandAccent : theme.brandLight} strokeWidth="4" strokeLinejoin="round" />
      {n > 31 ? (
        <text x="318" y="112" fontFamily={theme.fontText} fontWeight="700" fontSize="24" fill={theme.brandAccent}>
          NVDA
        </text>
      ) : null}
    </svg>
  );
};

const TileFlood: React.FC<VisualProps> = ({ local }) => {
  const cols = 34;
  const rows = 6;
  const colours = [palette.canaryYellow, palette.aquaGreen, palette.lightPlum50, palette.naturalWhite, palette.lightPlum70, palette.lightPlum];
  return (
    <div style={{ position: "relative", width: cols * 34, height: rows * 34 }}>
      {Array.from({ length: cols * rows }, (_, i) => {
        const at = random(`tile-${i}`) * 0.7 + (i % cols) * 0.012;
        const p = progress(local, at, at + 0.12);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: (i % cols) * 34,
              top: Math.floor(i / cols) * 34,
              width: 28,
              height: 28,
              borderRadius: 4,
              background: colours[Math.floor(random(`tc-${i}`) * colours.length)],
              opacity: p * 0.9,
              transform: `scale(${p})`,
            }}
          />
        );
      })}
    </div>
  );
};

const VideoWave: React.FC<VisualProps> = ({ local }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ width: 240, height: 134, borderRadius: 10, overflow: "hidden", position: "relative", background: `linear-gradient(${palette.lightPlum70}, ${palette.aquaGreen})` }}>
      <div style={{ position: "absolute", width: 46, height: 46, borderRadius: "50%", background: theme.brandAccent, left: 30 + local * 70, top: 28 }} />
      <svg width="240" height="134" style={{ position: "absolute", inset: 0 }}>
        <path d="M108 50 L136 67 L108 84 Z" fill={theme.brandLight} opacity={0.9} />
      </svg>
    </div>
    <ProceduralWaveform width={240} height={36} color={theme.brandLight} level={clamp01(local / 0.3)} t={local} bars={30} seed={2} />
  </div>
);

const AgentSwarm: React.FC<VisualProps> = ({ local }) => (
  <div style={{ display: "flex", gap: 12 }}>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{ opacity: local > i * 0.3 ? 1 : 0 }}>
        <AgentWindow title={["Agent", "Agent", "Agent"][i] + " " + (i + 1)} local={local - i * 0.3} width={200} speed={1.4} seed={`sw-${i}`} />
      </div>
    ))}
  </div>
);

const RewriteBlocks: React.FC<VisualProps> = ({ e, local }) => (
  <div style={{ display: "flex", gap: 16 }}>
    {(e.visual!.items as string[]).map((title, b) => {
      const off = b * 0.18;
      const strike = progress(local, 1.0 + off, 1.25 + off);
      const rewrite = local > 1.35 + off;
      return (
        <div key={title} style={{ width: 250, background: "rgba(255,244,237,0.1)", borderRadius: 10, padding: "12px 16px" }}>
          <div style={text(17, { fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: theme.brandAccent, marginBottom: 8 })}>{title}</div>
          {[0, 1, 2].map((l) => {
            const seed = rewrite ? "b" : "a";
            const w = 55 + random(`rw-${b}-${l}-${seed}`) * 40;
            const typed = rewrite ? progress(local, 1.35 + off + l * 0.15, 1.6 + off + l * 0.15) : progress(local, 0.1 + off + l * 0.2, 0.4 + off + l * 0.2);
            return (
              <div key={l} style={{ position: "relative", height: 16, marginBottom: 6 }}>
                <div style={{ width: `${w * typed}%`, height: 8, marginTop: 4, borderRadius: 4, background: theme.brandLight, opacity: rewrite ? 0.9 : 0.55 }} />
                {!rewrite && strike > 0 ? (
                  <div style={{ position: "absolute", left: 0, top: 7, height: 3, width: `${w * strike}%`, background: theme.brandAccent }} />
                ) : null}
              </div>
            );
          })}
        </div>
      );
    })}
  </div>
);

const PromptInput: React.FC<VisualProps> = ({ e, local }) => {
  const label = e.label ?? "";
  const n = charsShown(label, local, 0.15, label.length / 1.3);
  return (
    <div
      style={{
        width: 980,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "20px 26px",
        borderRadius: 18,
        border: `2px solid ${theme.brandMuted}`,
        background: "rgba(0,0,0,0.12)",
      }}
    >
      <div style={text(38, { flex: 1 })}>
        {label.slice(0, n)}
        <span style={{ opacity: Math.floor(local * 2.5) % 2 ? 0 : 1, color: theme.brandAccent }}>|</span>
      </div>
      <svg width="40" height="40">
        <circle cx="20" cy="20" r="19" fill={theme.brandMuted} opacity={0.35} />
        <path d="M13 20h14M21 13l7 7-7 7" stroke={theme.brandLight} strokeWidth="3" fill="none" strokeLinecap="round" opacity={0.5} />
      </svg>
    </div>
  );
};

const Regenerate: React.FC<VisualProps> = ({ e, local }) => {
  const clicks = e.visual!.clicks as number[];
  const resolveAt = e.visual!.resolveAt as number;
  const count = clicks.filter((c) => local >= c).length;
  const lastClick = clicks.filter((c) => local >= c).pop() ?? -10;
  const press = local - lastClick < 0.12 ? 0.92 : 1;
  const clean = local >= resolveAt;
  const btnX = 0;
  // Cursor travels to the button, hesitates between clicks.
  const cx = interpolate(local, [0, clicks[0]], [260, btnX + 120], { extrapolateRight: "clamp", easing: easeIn });
  const cy = interpolate(local, [0, clicks[0]], [-40, 30], { extrapolateRight: "clamp", easing: easeIn }) + Math.sin(local * 9) * 3;
  return (
    <div style={{ position: "relative", display: "flex", gap: 30, alignItems: "flex-start" }}>
      <div style={{ position: "relative" }}>
        <div
          style={text(28, {
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 26px",
            borderRadius: 12,
            border: `2px solid ${theme.brandLight}`,
            transform: `scale(${press})`,
            background: local - lastClick < 0.12 ? "rgba(255,244,237,0.18)" : "transparent",
          })}
        >
          <svg width="26" height="26" viewBox="0 0 26 26">
            <path d="M21 13a8 8 0 1 1-2.3-5.6" fill="none" stroke={theme.brandLight} strokeWidth="2.6" strokeLinecap="round" />
            <path d="M19 3v5h-5" fill="none" stroke={theme.brandLight} strokeWidth="2.6" strokeLinecap="round" />
          </svg>
          {e.label}
        </div>
        {count > 0 ? (
          <div style={text(30, { position: "absolute", right: -70, top: 12, fontWeight: 700, color: theme.brandAccent })}>×{count}</div>
        ) : null}
        <svg width="32" height="40" style={{ position: "absolute", left: cx, top: cy, transform: `scale(${press})` }}>
          <path d="M3 2 L3 30 L10 23 L15 35 L20 33 L15 21 L25 21 Z" fill={theme.brandLight} stroke={theme.brandDark} strokeWidth="2" />
        </svg>
      </div>
      <div style={{ width: 560, marginLeft: 110, paddingTop: 6 }}>
        {[0, 1, 2, 3].map((l) => {
          const w = clean ? [100, 96, 98, 62][l] : 30 + random(`rg-${count}-${l}`) * 70;
          return (
            <div
              key={l}
              style={{
                height: 10,
                width: `${w}%`,
                marginBottom: 12,
                borderRadius: 5,
                background: theme.brandLight,
                opacity: clean ? 0.95 : 0.35,
                transform: clean ? "none" : `translateX(${(random(`rgx-${count}-${l}`) - 0.5) * 30}px)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

const MapVisual: React.FC<VisualProps> = ({ e, local }) => (
  <WorldMap width={700} cities={e.visual!.cities as string[]} newCity={e.visual!.newCity as string | undefined} local={local} />
);

const Diffusion: React.FC<VisualProps> = ({ local }) => <DiffusionImage width={300} height={180} p={progress(local, 0.1, 1.7)} />;

const PromptToPoster: React.FC<VisualProps> = ({ e, local }) => {
  const m = progress(local, 0.6, 1.3);
  const prompt = e.visual!.prompt as string;
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 26 }}>
      <div
        style={text(24, {
          fontFamily: "monospace",
          padding: "10px 16px",
          borderRadius: 8,
          background: "rgba(0,0,0,0.18)",
          opacity: 1 - m * 0.6,
          transform: `translateX(${m * 30}px) scale(${1 - m * 0.15})`,
          whiteSpace: "nowrap",
        })}
      >
        /imagine {prompt.slice(0, charsShown(prompt, local, 0, prompt.length / 0.55))}
      </div>
      <svg width="140" height="200" style={{ opacity: m, transform: `scale(${0.6 + m * 0.4})`, borderRadius: 6, flexShrink: 0 }}>
        <rect width="140" height="200" fill={palette.deepPlum} />
        <circle cx="70" cy="86" r="34" fill={palette.canaryYellow} />
        {Array.from({ length: 7 }, (_, i) => (
          <line key={i} x1="0" x2="140" y1={122 + i * 7} y2={122 + i * 7} stroke={palette.aquaGreen} strokeWidth="2" opacity={1 - i * 0.12} />
        ))}
        {Array.from({ length: 40 }, (_, i) => (
          <circle key={i} cx={10 + (i % 10) * 13} cy={14 + Math.floor(i / 10) * 9} r={1.6} fill={palette.lightPlum50} />
        ))}
        <rect x="20" y="176" width="100" height="5" rx="2" fill={palette.naturalWhite} />
        <rect x="40" y="186" width="60" height="3" rx="1.5" fill={palette.naturalWhite} opacity={0.6} />
      </svg>
    </div>
  );
};

const Citations: React.FC<VisualProps> = ({ e, local }) => {
  const brand = e.visual!.brand as string;
  const n = 7;
  return (
    <div style={{ position: "relative", width: 360, height: 150 }}>
      <svg width="360" height="150" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2 + local * 0.6;
          const p = progress(local, 0.15 + i * 0.07, 0.35 + i * 0.07);
          const x = 180 + Math.cos(a) * 150;
          const y = 75 + Math.sin(a) * 62;
          return (
            <g key={i} opacity={p}>
              <line x1="180" y1="75" x2={x} y2={y} stroke={theme.brandMuted} strokeOpacity={0.5} strokeDasharray="3 5" />
              <circle cx={x} cy={y} r="15" fill={i % 3 === 0 ? theme.brandAccent : theme.brandLight} />
              <text x={x} y={y + 6} textAnchor="middle" fontFamily={theme.fontText} fontSize="16" fontWeight="700" fill={theme.brandDark}>
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <div
        style={text(28, {
          position: "absolute",
          left: 180,
          top: 75,
          transform: "translate(-50%,-50%)",
          fontWeight: 700,
          padding: "8px 22px",
          borderRadius: 30,
          background: theme.brandLight,
          color: theme.brandDark,
        })}
      >
        {brand}
      </div>
    </div>
  );
};

const Dashboard: React.FC<VisualProps> = ({ e, local }) => (
  <div style={{ width: 520, background: palette.naturalWhite, borderRadius: 14, padding: "16px 20px" }}>
    {(e.visual!.bars as { label: string; value: number }[]).map((b, i) => {
      const p = progress(local, 0.15 + i * 0.15, 0.85 + i * 0.15);
      return (
        <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: i < 2 ? 12 : 0 }}>
          <div style={{ width: 230, fontFamily: theme.fontText, fontSize: 19, fontWeight: 600, color: palette.charcoal }}>{b.label}</div>
          <div style={{ flex: 1, height: 16, borderRadius: 8, background: palette.charcoal40 + "55", overflow: "hidden" }}>
            <div style={{ width: `${b.value * p * 100}%`, height: "100%", borderRadius: 8, background: i === 1 ? palette.lightPlum : palette.aquaGreen }} />
          </div>
        </div>
      );
    })}
  </div>
);

const CodeEditor: React.FC<VisualProps> = ({ e, local }) => {
  const lines: [string, string][] = [
    ["#c96897", "export const Film = () => ("],
    [palette.naturalWhite, "  <AbsoluteFill>"],
    [palette.canaryYellow, "    <Act1_2023 /> <Act2_2024 />"],
    [palette.canaryYellow, "    <Act3_2025 /> <Act4_2026 />"],
    [palette.naturalWhite, "  </AbsoluteFill>"],
  ];
  const shown = Math.floor(local / 0.14) + 1;
  return (
    <div style={{ width: 520, borderRadius: 12, overflow: "hidden", background: palette.charcoal, boxShadow: "0 18px 40px rgba(0,0,0,0.35)" }}>
      <div style={{ display: "flex", background: palette.charcoal90 }}>
        <div style={{ padding: "8px 18px", fontFamily: theme.fontText, fontSize: 18, color: palette.naturalWhite, background: palette.charcoal, borderTop: `3px solid ${theme.brandAccent}` }}>
          {e.visual!.file as string}
        </div>
      </div>
      <div style={{ padding: "8px 18px", fontFamily: "monospace", fontSize: 17, lineHeight: 1.4 }}>
        {lines.slice(0, shown).map(([c, l], i) => (
          <div key={i} style={{ color: c, whiteSpace: "pre" }}>
            <span style={{ color: palette.charcoal70, marginRight: 14 }}>{i + 1}</span>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
};

const People: React.FC<VisualProps> = ({ e, local }) => <PeopleGrid group={e.people!.group} local={local} />;

export const cardVisuals: Record<string, React.FC<VisualProps>> = {
  wordmarks: Wordmarks,
  fakeStamp: FakeStamp,
  headlineCuts: HeadlineCuts,
  frameGrid: FrameGrid,
  waveform: Wave,
  spinnerThought: SpinnerThought,
  medals: Medals,
  stockDrop: StockDrop,
  tileFlood: TileFlood,
  videoWave: VideoWave,
  agentSwarm: AgentSwarm,
  rewriteBlocks: RewriteBlocks,
  promptInput: PromptInput,
  regenerate: Regenerate,
  map: MapVisual,
  diffusion: Diffusion,
  promptToPoster: PromptToPoster,
  citations: Citations,
  dashboard: Dashboard,
  codeEditor: CodeEditor,
  people: People,
};
