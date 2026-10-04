import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setEntryPoint("src/index.ts");
// Use the pre-installed headless Chromium when available (cloud/CI); Remotion downloads its own otherwise.
import { existsSync } from "node:fs";
const localShell = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
if (existsSync(localShell)) Config.setBrowserExecutable(localShell);
