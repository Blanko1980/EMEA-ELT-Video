import { Easing, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";

// We. brand palette, taken from the We. brand guidelines (Color palette pages).
export const palette = {
  deepPlum: "#800239",
  lightPlum: "#a50451",
  naturalWhite: "#fff4ed",
  lightPlum90: "#ae1d62",
  lightPlum80: "#b73674",
  lightPlum70: "#c04f85",
  lightPlum60: "#c96897",
  lightPlum50: "#d281a8",
  aquaGreen: "#167d83",
  canaryYellow: "#f2c75a",
  charcoal: "#1e1e1e",
  charcoal90: "#343434",
  charcoal70: "#616161",
  charcoal40: "#a5a5a5",
  iceWhite: "#ffffff",
} as const;

// Brand typefaces: Libre Baskerville (header) and Source Sans (body; Source Sans 3 is its current release).
// Both are open source (Google Fonts) and bundled in /public/fonts so the film renders offline.
const BASKERVILLE = "Libre Baskerville";
const SOURCE_SANS = "Source Sans 3";
loadFont({ family: BASKERVILLE, url: staticFile("fonts/LibreBaskerville-Variable.woff2"), weight: "400 700", style: "normal" });
loadFont({ family: BASKERVILLE, url: staticFile("fonts/LibreBaskerville-Italic.woff2"), weight: "400", style: "italic" });
loadFont({ family: SOURCE_SANS, url: staticFile("fonts/SourceSans3-Variable.woff2"), weight: "200 900", style: "normal" });

export const theme = {
  // Daniel lane, highlights, year counter
  brandPrimary: palette.lightPlum,
  brandPrimarySoft: palette.lightPlum50,
  // Quote marks, key moments, cross-links, progress line (Canary Yellow is the accent for plum backgrounds)
  brandAccent: palette.canaryYellow,
  // Secondary accent for light surfaces (agent windows, dashboards)
  brandAccent2: palette.aquaGreen,
  // Background from the transition onward
  brandDark: palette.deepPlum,
  // Primary text on dark
  brandLight: palette.naturalWhite,
  // World lane, secondary text, grid
  brandMuted: palette.lightPlum50,
  fontDisplay: `"${BASKERVILLE}", "Times New Roman", serif`,
  fontText: `"${SOURCE_SANS}", Aptos, sans-serif`,
} as const;

// Teams-style dark UI for the cold open and finale (deliberately not on-brand).
export const teams = {
  background: "#1F1F1F",
  panel: "#292929",
  danielBubble: "#2B2B40",
  rayBubble: "#2B2B2B",
  text: "#FFFFFF",
  timestamp: "#A0A0A0",
  divider: "#3D3D3D",
  font: `"Segoe UI", "${SOURCE_SANS}", system-ui, sans-serif`,
} as const;

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Layout: top 40% world lane, middle 20% timeline, bottom 40% Daniel lane.
export const layout = {
  worldTop: 0,
  worldBottom: 432,
  timelineY: 540,
  danielTop: 648,
  danielBottom: 1080,
  gutter: 72,
} as const;

export const easeIn = Easing.bezier(0.16, 1, 0.3, 1);
export const easeOut = Easing.bezier(0.7, 0, 0.84, 0);

// Official logo artwork (We_Logo_Deep_Plum_CMYK.svg), used unmodified: the guidelines forbid recreating it.
// Shown as the "Positive" variant on Natural White.
export const logo = {
  file: "brand/we-logo.svg",
  available: true,
} as const;
