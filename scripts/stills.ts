// Renders preview stills at given timecodes (seconds) from a single bundle.
// Usage: npx tsx scripts/stills.ts 39 45.5 63 ...
import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const SHELL = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const seconds = process.argv.slice(2).map(Number);
const outDir = path.resolve("out/stills");
mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = existsSync(SHELL) ? SHELL : null;
const composition = await selectComposition({ serveUrl, id: "InFullConfidence", browserExecutable });
for (const s of seconds) {
  const frame = Math.round(s * composition.fps);
  const output = path.join(outDir, `t${s.toFixed(1).padStart(5, "0")}.png`);
  await renderStill({ composition, serveUrl, frame, output, browserExecutable, imageFormat: "png" });
  console.log(output);
}
