import worldRaw from "../data/world.json";
import personalRaw from "../data/personal.json";
import quotesRaw from "../data/quotes.json";
import chatRaw from "../data/chat.json";
import actsRaw from "../data/acts.json";

export type Visual = { type: string; [key: string]: unknown };

export type LaneEventData = {
  id: string;
  at: number;
  dwell: number;
  x?: number;
  y?: number;
  lift?: number;
  date?: string;
  label?: string;
  visual?: Visual;
  compact?: boolean;
  pinned?: boolean;
  highlight?: boolean;
  accent?: boolean;
  hideLabel?: boolean;
  centre?: boolean;
  quote?: string;
  style?: string;
  userCount?: { value: number; unit: string; rampSeconds?: number };
  link?: { to: string; at: number; strong?: boolean };
  people?: { group: string };
  status?: string;
};

export type Quote = {
  id: string;
  date: string;
  speaker: string;
  role: string;
  text: string;
  screenText?: string;
  source: string;
};

export type ChatItem = {
  at: number;
  type: string;
  from?: string;
  to?: string;
  until?: number;
  timestamp?: string;
  text?: string;
  highlight?: string;
  highlightAt?: number;
  reaction?: string;
  reactionAt?: number;
  id?: string;
};

export const world = worldRaw as LaneEventData[];
export const personal = personalRaw as unknown as {
  places: Record<string, { lon: number; lat: number }>;
  events: LaneEventData[];
  peopleGroups: Record<string, { rows: number[]; labels: string[] }>;
  crescendo: { at: number; until: number; centre: string; windows: string[] };
  exit: { at: number; cut: number };
};
export const quotes = quotesRaw as Quote[];
export const chat = chatRaw as unknown as {
  participants: Record<string, { name: string; initials: string }>;
  coldOpen: ChatItem[];
  yearSource: { text: string; year: string };
  callbackLine: string;
  finaleDate: string;
  finale: ChatItem[];
  outro: { line1: string; line2: string };
};
export const acts = actsRaw;

export const quoteById = (id: string): Quote => {
  const q = quotes.find((x) => x.id === id);
  if (!q) throw new Error(`Unknown quote ${id}`);
  return q;
};

export const eventById = (id: string): LaneEventData => {
  const e = [...world, ...personal.events].find((x) => x.id === id);
  if (!e) throw new Error(`Unknown event ${id}`);
  return e;
};
