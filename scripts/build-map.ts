// Precomputes a dot-matrix land mask for the minimal world map strip (WorldMap.tsx).
// Source geometry: Natural Earth 110m via the world-atlas package. Output: src/generated/land-dots.json
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { geoContains } from "d3-geo";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve("world-atlas/land-110m.json"), "utf8"));
const land = feature(topo, topo.objects.land);

const STEP = 2.5;
const dots: [number, number][] = [];
for (let lat = 75; lat >= -56; lat -= STEP) {
  for (let lon = -170; lon <= 180; lon += STEP) {
    if (geoContains(land as never, [lon, lat])) dots.push([lon, lat]);
  }
}
mkdirSync("src/generated", { recursive: true });
writeFileSync("src/generated/land-dots.json", JSON.stringify({ step: STEP, dots }));
console.log(`land dots: ${dots.length}`);
