import React from "react";
import { AbsoluteFill } from "remotion";
import { acts } from "../lib/data";
import { useT } from "../lib/useT";
import { ActLanes } from "./ActLanes";

const act = acts.years.find((y) => y.year === "2024")!;

// 0:57–1:22 – 2024, Expanding: AI learns to see, draw and speak; ends on the voice moment.
export const Act2_2024: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill>
      <ActLanes t={t} from={act.start} to={act.end} />
    </AbsoluteFill>
  );
};
