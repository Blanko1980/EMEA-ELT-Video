import React from "react";
import { personal, world } from "../lib/data";
import { LaneEvent } from "../components/LaneEvent";

// Renders every world and Daniel event whose start falls inside [from, to).
export const ActLanes: React.FC<{ t: number; from: number; to: number }> = ({ t, from, to }) => (
  <>
    {world
      .filter((e) => e.at >= from && e.at < to && e.id !== "w-launch")
      .map((e) => (
        <LaneEvent key={e.id} e={e} lane="world" t={t} />
      ))}
    {personal.events
      .filter((e) => e.at >= from && e.at < to)
      .map((e) => (
        <LaneEvent key={e.id} e={e} lane="daniel" t={t} />
      ))}
  </>
);
