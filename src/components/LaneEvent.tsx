import React from "react";
import { random } from "remotion";
import { layout, palette, theme } from "../theme";
import { LaneEventData, quoteById } from "../lib/data";
import { enter, exit, scrollAt } from "../lib/time";
import { cardVisuals } from "./visuals/CardVisuals";
import { stageVisuals } from "./visuals/StageVisuals";
import { QuoteCard } from "./QuoteCard";

export type Lane = "world" | "daniel";

const DEFAULT_X = 760;
// World cards sit on the timeline side of their lane: anchored by their bottom edge, `lift` px above the lane edge.
// Daniel cards hang below the timeline: anchored by their top edge, `y` px below the lane edge.
const DEFAULT_LIFT = 24;
const DEFAULT_Y = 40;
// From 2024 on, lane events carry a small image thumbnail: the first colour in the frame.
const THUMBS_FROM = 57;

export const eventX = (e: LaneEventData, t: number) => (e.x ?? DEFAULT_X) - (e.pinned ? 0 : scrollAt(t) - scrollAt(e.at));
export const eventVisible = (e: LaneEventData, t: number) => t >= e.at && t <= e.at + e.dwell;

const Thumb: React.FC<{ id: string }> = ({ id }) => {
  const c = [palette.canaryYellow, palette.aquaGreen, palette.lightPlum50, palette.naturalWhite];
  const a = c[Math.floor(random(`th-a-${id}`) * c.length)];
  const b = c[Math.floor(random(`th-b-${id}`) * c.length)];
  return (
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 10,
        flexShrink: 0,
        background: `radial-gradient(circle at ${30 + random(`th-x-${id}`) * 40}% 40%, ${a} 0 26%, transparent 27%), linear-gradient(160deg, ${palette.lightPlum}, ${b})`,
      }}
    />
  );
};

// Nodes fade out before they slide under the year counter.
const nodeFade = (x: number) => Math.max(0, Math.min(1, (x - 330) / 50));

const flickerOpacity = (local: number) => {
  if (local < 0.6 || local > 1.25) return 1;
  if (local > 1.1) return Math.floor(local * 40) % 2 ? 1 : 0.2;
  return local < 0.75 ? (Math.floor(local * 40) % 2 ? 0.2 : 1) : 0;
};

export const LaneEvent: React.FC<{ e: LaneEventData; lane: Lane; t: number }> = ({ e, lane, t }) => {
  if (!eventVisible(e, t)) return null;
  const local = t - e.at;

  if (e.quote) {
    return <QuoteCard quote={quoteById(e.quote)} t={t} at={e.at} dwell={e.dwell} style={e.style} y={e.y} />;
  }

  const Stage = e.visual ? stageVisuals[e.visual.type] : undefined;
  if (Stage) return <Stage e={e} local={local} t={t} lane={lane} />;

  const Visual = e.visual ? cardVisuals[e.visual.type] : e.people ? cardVisuals.people : undefined;
  const inP = enter(t, e.at, 0.45);
  const op = inP * exit(t, e.at + e.dwell) * (e.visual?.type === "flicker" ? flickerOpacity(local) : 1);
  const x = eventX(e, t);
  const daniel = lane === "daniel";
  const edge = daniel ? layout.danielTop + (e.y ?? DEFAULT_Y) : layout.worldBottom - (e.lift ?? DEFAULT_LIFT);
  const anchor: React.CSSProperties = daniel ? { top: edge } : { bottom: 1080 - edge };
  const accent = !!e.accent;
  const compact = !!e.compact;
  const showThumb = e.at >= THUMBS_FROM && !compact && !e.hideLabel && !e.visual && !e.people;

  const cardStyle: React.CSSProperties = daniel
    ? {
        background: accent ? theme.brandAccent : theme.brandPrimary,
        borderRadius: 16,
        padding: compact ? "12px 18px" : "16px 24px",
        boxShadow: "0 14px 34px rgba(50,0,20,0.35)",
      }
    : {
        borderLeft: `3px solid ${accent || e.highlight ? theme.brandAccent : theme.brandMuted}`,
        padding: compact ? "6px 0 6px 18px" : "4px 0 4px 22px",
        ...(e.highlight ? { border: `2px solid ${theme.brandAccent}`, borderRadius: 12, padding: "10px 18px", background: "rgba(242,199,90,0.08)" } : {}),
      };
  const labelColor = daniel && accent ? theme.brandDark : accent ? theme.brandAccent : theme.brandLight;
  const dateColor = daniel ? (accent ? theme.brandDark : theme.brandLight) : theme.brandMuted;
  const nodeColor = accent || e.highlight ? theme.brandAccent : daniel ? theme.brandPrimarySoft : theme.brandLight;
  const stemFrom = layout.timelineY;
  const stemTo = edge;

  return (
    <>
      {/* Node on the timeline + stem into the lane */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: op * nodeFade(x) }}>
        <line
          x1={x + 2}
          x2={x + 2}
          y1={stemFrom}
          y2={stemFrom + (stemTo - stemFrom) * inP}
          stroke={nodeColor}
          strokeOpacity={0.55}
          strokeWidth={2}
          strokeDasharray="2 6"
        />
        <circle cx={x + 2} cy={stemFrom} r={9 * inP} fill={nodeColor} />
        <circle cx={x + 2} cy={stemFrom} r={16 * inP} fill="none" stroke={nodeColor} strokeOpacity={0.5} strokeWidth={2} />
      </svg>

      <div
        style={{
          position: "absolute",
          left: x,
          ...anchor,
          opacity: op,
          transform: `translateY(${(1 - inP) * (daniel ? 24 : -24)}px)`,
          maxWidth: compact ? 520 : 1000,
        }}
      >
        <div style={{ display: "inline-flex", flexDirection: "column", ...cardStyle }}>
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            {showThumb ? <Thumb id={e.id} /> : null}
            <div>
              {e.date ? (
                <div
                  style={{
                    fontFamily: theme.fontText,
                    fontSize: compact ? 18 : 21,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: dateColor,
                    opacity: 0.9,
                    marginBottom: 4,
                  }}
                >
                  {e.date}
                </div>
              ) : null}
              {!e.hideLabel && e.label ? (
                <div
                  style={{
                    fontFamily: theme.fontText,
                    fontSize: compact ? 26 : 33,
                    fontWeight: daniel ? 600 : 400,
                    lineHeight: 1.25,
                    color: labelColor,
                    maxWidth: compact ? 480 : 860,
                  }}
                >
                  {e.label}
                </div>
              ) : null}
            </div>
          </div>
          {Visual ? <div style={{ marginTop: e.hideLabel && !e.date ? 0 : 14 }}><Visual e={e} local={local} t={t} lane={lane} /></div> : null}
        </div>
      </div>
    </>
  );
};
