import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { easeIn, theme } from "../theme";
import { chat, quoteById, world } from "../lib/data";
import { useT } from "../lib/useT";
import { progress } from "../lib/time";
import { ChatWindow, CHAT_H, CHAT_W } from "../components/ChatWindow";
import { QuoteCard } from "../components/QuoteCard";
import { CHAT_NODE_AT, CHAT_NODE_X } from "../components/Timeline";
import { COUNTER_X, COUNTER_Y } from "../components/YearCounter";
import { LaneEvent } from "../components/LaneEvent";
import transitionData from "../data/transition.json";

const ease = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], { easing: easeIn, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// 0:27–0:35 – freeze, first quote, the date becomes the year counter, the chat collapses into a timeline node.
export const Transition: React.FC = () => {
  const t = useT();
  const d = transitionData;
  const dim = progress(t, d.freezeAt, d.freezeAt + 0.4);
  const make = ease(t, d.quoteAt, d.quoteAt + 0.6);
  const shrink = ease(t, d.shrinkAt, CHAT_NODE_AT);

  // Chat: centred (scale 1) → lower half (scale 0.62) → collapses into the timeline node.
  const s1 = interpolate(make, [0, 1], [1, 0.62]);
  const cy1 = interpolate(make, [0, 1], [540, 700]);
  const scale = interpolate(shrink, [0, 1], [s1, 60 / CHAT_W]);
  const cx = interpolate(shrink, [0, 1], [960, CHAT_NODE_X]);
  const cy = interpolate(shrink, [0, 1], [cy1, 540]);
  const radius = interpolate(shrink, [0, 0.6, 1], [14, CHAT_H / 2, CHAT_W / 2]);

  // The date "12-Dec-22" detaches from Ray's bubble and flies to the year counter.
  const fly = ease(t, d.dateAt, d.dateAt + 0.8);
  const flying = t >= d.dateAt && t < d.dateAt + 0.95;
  const fromX = 700;
  const fromY = 826;

  const launch = world.find((e) => e.id === "w-launch")!;

  return (
    <AbsoluteFill>
      {t < CHAT_NODE_AT + 0.05 ? (
        <div
          style={{
            position: "absolute",
            left: cx - CHAT_W / 2,
            top: cy - CHAT_H / 2,
            width: CHAT_W,
            height: CHAT_H,
            transform: `scale(${scale})`,
            borderRadius: radius,
            overflow: "hidden",
            opacity: 1 - progress(t, CHAT_NODE_AT - 0.15, CHAT_NODE_AT),
          }}
        >
          <div style={{ opacity: 1 - shrink * 0.8 }}>
            <ChatWindow
              items={chat.coldOpen}
              t={t}
              itemOpacity={(it) => (it.id === "punchline" ? 1 : 1 - dim * 0.8)}
              hideDateOf={t >= d.dateAt ? "punchline" : undefined}
            />
          </div>
          {shrink > 0 ? <div style={{ position: "absolute", inset: 0, background: theme.brandLight, opacity: shrink }} /> : null}
        </div>
      ) : null}

      <QuoteCard quote={quoteById(d.quote)} t={t} at={d.quoteAt} dwell={d.quoteDwell} kicker={d.kicker} y={70} />

      {flying ? (
        <div
          style={{
            position: "absolute",
            left: interpolate(fly, [0, 1], [fromX, COUNTER_X]),
            top: interpolate(fly, [0, 1], [fromY, COUNTER_Y]),
            transform: "translate(-50%, -50%)",
            fontFamily: fly > 0.5 ? theme.fontDisplay : undefined,
            fontWeight: 700,
            fontSize: interpolate(fly, [0, 1], [14, 62]),
            color: theme.brandLight,
            opacity: 1 - progress(t, d.dateAt + 0.75, d.dateAt + 0.95),
            whiteSpace: "nowrap",
          }}
        >
          {fly < 0.6 ? chat.yearSource.text : chat.yearSource.year}
        </div>
      ) : null}

      <LaneEvent e={launch} lane="world" t={t} />
    </AbsoluteFill>
  );
};
