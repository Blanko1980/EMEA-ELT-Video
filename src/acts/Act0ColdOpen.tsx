import React from "react";
import { AbsoluteFill } from "remotion";
import { chat } from "../lib/data";
import { useT } from "../lib/useT";
import { ChatWindow, CHAT_H, CHAT_W } from "../components/ChatWindow";

// 0:00–0:27 – the original Teams chat of Dec 12, 2022, typed out in compressed real time.
export const Act0ColdOpen: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: CHAT_W, height: CHAT_H }}>
        <ChatWindow items={chat.coldOpen} t={t} />
      </div>
    </AbsoluteFill>
  );
};
