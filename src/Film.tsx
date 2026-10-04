import React from "react";
import { AbsoluteFill, Audio, interpolateColors, Sequence, staticFile } from "remotion";
import { layout, theme } from "./theme";
import { acts, personal } from "./lib/data";
import { FilmTimeProvider, useT } from "./lib/useT";
import { progress, toFrame } from "./lib/time";
import { production } from "./config";
import { Act0ColdOpen } from "./acts/Act0ColdOpen";
import { Transition } from "./acts/Transition";
import { Act1_2023 } from "./acts/Act1_2023";
import { Act2_2024 } from "./acts/Act2_2024";
import { Act3_2025 } from "./acts/Act3_2025";
import { Act4_2026 } from "./acts/Act4_2026";
import { Finale } from "./acts/Finale";
import { Timeline } from "./components/Timeline";
import { YearCounter } from "./components/YearCounter";
import { UserCounter } from "./components/UserCounter";
import { LinkLayer } from "./components/LinkLayer";

const EXIT = personal.exit;
const STAGE_FROM = acts.years[0].start;
const year = (y: string) => acts.years.find((a) => a.year === y)!;

const Background: React.FC<{ t: number }> = ({ t }) => {
  let bg: string = "#141414";
  if (t >= 31 && t < EXIT.cut) bg = interpolateColors(progress(t, 31, 31.9), [0, 1], ["#141414", theme.brandDark]);
  else if (t >= EXIT.cut) bg = "#000";
  return <AbsoluteFill style={{ background: bg }} />;
};

const LaneLabels: React.FC<{ t: number }> = ({ t }) => {
  const op = progress(t, 32.2, 33);
  const style: React.CSSProperties = {
    position: "absolute",
    left: layout.gutter,
    fontFamily: theme.fontText,
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: "0.3em",
    opacity: op,
  };
  return (
    <>
      <div style={{ ...style, top: 36, color: theme.brandMuted }}>{acts.laneLabels.world}</div>
      <div style={{ ...style, top: layout.danielTop + 56, color: theme.brandPrimarySoft }}>{acts.laneLabels.daniel}</div>
    </>
  );
};

const Scenes: React.FC = () => {
  const t = useT();
  const ex = progress(t, EXIT.at, EXIT.cut);
  const inRange = (from: number, to: number) => t >= from && t < to;
  const voice = personal.events.find((e) => e.visual?.type === "voice")!;
  const voiceLines = (voice.visual!.lines as { at: number; audio: string }[]) ?? [];

  return (
    <AbsoluteFill>
      <Background t={t} />
      {inRange(0, 27.05) ? <Act0ColdOpen /> : null}

      {inRange(STAGE_FROM, EXIT.cut) ? (
        <>
          <Timeline t={t} exitAt={EXIT.at} cutAt={EXIT.cut} />
          <YearCounter t={t} appearAt={31.8} exitAt={EXIT.at} cutAt={EXIT.cut} />
          <UserCounter t={t} exitAt={EXIT.at} cutAt={EXIT.cut} />
          <AbsoluteFill style={{ transform: `translateX(${Math.pow(ex, 2.2) * 2600}px)` }}>
            <LaneLabels t={t} />
            <LinkLayer t={t} />
            {inRange(year("2023").start, year("2024").start + 3) ? <Act1_2023 /> : null}
            {inRange(year("2024").start, year("2025").start + 3) ? <Act2_2024 /> : null}
            {inRange(year("2025").start, year("2026").start + 3) ? <Act3_2025 /> : null}
            {inRange(year("2026").start, EXIT.cut) ? <Act4_2026 /> : null}
          </AbsoluteFill>
        </>
      ) : null}

      {inRange(27, 35.5) ? <Transition /> : null}
      {t >= EXIT.cut ? <Finale /> : null}

      {production.music ? <Audio src={staticFile("audio/music.mp3")} /> : null}
      {production.sfx ? <Audio src={staticFile("audio/sfx.mp3")} /> : null}
      {production.voice !== "none"
        ? voiceLines.map((ln) => (
            <Sequence key={ln.audio} from={toFrame(voice.at + ln.at)} layout="none">
              <Audio src={staticFile(ln.audio)} />
            </Sequence>
          ))
        : null}
    </AbsoluteFill>
  );
};

export const Film: React.FC = () => (
  <FilmTimeProvider>
    <Scenes />
  </FilmTimeProvider>
);
