import { createRoot } from "react-dom/client";
import { Player } from "@remotion/player";
import { Film } from "../src/Film";
import { FPS, HEIGHT, WIDTH } from "../src/theme";
import acts from "../src/data/acts.json";

createRoot(document.getElementById("root")!).render(
  <Player
    component={Film}
    durationInFrames={acts.durationSeconds * FPS}
    fps={FPS}
    compositionWidth={WIDTH}
    compositionHeight={HEIGHT}
    controls
    allowFullscreen
    clickToPlay
    style={{ width: "100%", aspectRatio: `${WIDTH} / ${HEIGHT}` }}
  />,
);
