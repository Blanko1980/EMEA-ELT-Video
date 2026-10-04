// Option B: synthesises both lines of the Dec 20, 2024 voice moment with ElevenLabs.
// Requires ELEVENLABS_API_KEY. Lines, speakers and output paths come from src/data/personal.json.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import personal from "../src/data/personal.json";
import { elevenlabs } from "../src/config";

const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("ELEVENLABS_API_KEY is not set");

type Line = { speaker: "daniel" | "ai"; text: string; audio: string; duration: number };
const voiceEvent = personal.events.find((e) => e.id === "d-voice")!;
const lines = (voiceEvent.visual as unknown as { lines: Line[] }).lines;

const settings = {
  daniel: { stability: 0.45, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true },
  ai: { stability: 0.85, similarity_boost: 0.7, style: 0, use_speaker_boost: false },
};

mkdirSync("out", { recursive: true });
for (const line of lines) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenlabs.voices[line.speaker]}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text: line.text,
      model_id: elevenlabs.model,
      language_code: line.speaker === "daniel" ? "de" : "en",
      voice_settings: settings[line.speaker],
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  const tmp = `out/${line.speaker}-raw.mp3`;
  writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  const out = `public/${line.audio}`;
  // Trim leading/trailing silence, normalise to -14 LUFS (single pass is fine for a 2-second line).
  execFileSync("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error", "-i", tmp,
    "-af", "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.12,areverse,loudnorm=I=-14:TP=-1.5:LRA=7",
    "-ar", "44100", "-ac", "1", out,
  ]);
  const rawDur = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", tmp]).toString().trim();
  rmSync(tmp);
  const dur = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).toString().trim();
  console.log(`${out}: "${line.text}" ${Number(dur).toFixed(2)} s trimmed, ${Number(rawDur).toFixed(2)} s raw (slot ${line.duration} s)`);
}
