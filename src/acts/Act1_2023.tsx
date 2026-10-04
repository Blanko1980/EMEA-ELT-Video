import React from "react";
import { AbsoluteFill } from "remotion";
import { acts } from "../lib/data";
import { useT } from "../lib/useT";
import { ActLanes } from "./ActLanes";

const act = acts.years.find((y) => y.year === "2023")!;

// 0:35–0:57 – 2023, Exploring: AI can write, but not reliably.
export const Act1_2023: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill>
      <ActLanes t={t} from={act.start} to={act.end} />
    </AbsoluteFill>
  );
};
