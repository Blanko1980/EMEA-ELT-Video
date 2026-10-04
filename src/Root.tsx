import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { FPS, HEIGHT, WIDTH } from "./theme";
import acts from "./data/acts.json";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="InFullConfidence"
    component={Film}
    durationInFrames={acts.durationSeconds * FPS}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
