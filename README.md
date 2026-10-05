# FOUR YEARS — We. Communications opening film

A 30-second opening sequence for a senior leadership event. It tells how generative AI has changed the communications business in the four years since ChatGPT launched on 30 November 2022:

> **FOUR YEARS. FROM A PROMPT… TO A NEW INFORMATION ENVIRONMENT.**
> AI is no longer only helping us *create* the story. AI is increasingly *interpreting, summarising and delivering* it.
> **THIS IS OUR MOMENT TO SHAPE WHAT COMES NEXT.**

Everything is made with HTML, CSS and JavaScript: type, shapes, lines, particles, grids and interface elements. There are no images, video files, libraries or build steps.

---

## 1. Open it

**The quickest way:** double-click `index.html`. It opens in your default browser and starts playing automatically.

The project runs straight from the file system. The fonts are bundled in `fonts/`, so it works offline too.

**Run it from a local web server instead (optional).** This is useful when presenting from a shared machine:

```bash
# from this folder, pick one
python3 -m http.server 8080        # then open http://localhost:8080
npx serve .                        # then open the URL it prints
```

Use a recent desktop version of Chrome, Edge, Safari or Firefox. Chrome or Edge is recommended for recording.

## 2. Controls

| Key | Action |
| --- | --- |
| **Space** | Pause / resume (at the end, Space replays from the start) |
| **R** | Restart from 0:00 and play |
| **F** | Enter or exit fullscreen (double-clicking the film does the same) |
| **← / →** | Seek back or forward 1 s (hold **Shift** for 5 s) |
| **Home / End** | Jump to the first or last frame |
| **H** | Hide or show the playback bar |

The thin playback bar at the bottom of the window shows the time. Click or drag it to scrub. The bar and the mouse cursor hide automatically after about two seconds without mouse movement.

The film itself also contains a four-year timeline along its lower edge (2022 → 2026). That timeline is part of the design.

### URL options

Add these to the address, e.g. `index.html?clean&delay=3`:

| Option | Effect |
| --- | --- |
| `clean` | Never show the playback bar, state labels or cursor. Use this for recording. |
| `delay=3` | Hold the first frame for 3 seconds, then play. Gives you time to start the recorder. |
| `t=12.5` | Start at 12.5 seconds |
| `paused` | Load without auto-playing (combine with `t=` to inspect one frame) |
| `loop` | Loop forever, e.g. on a lobby screen |

## 3. Fullscreen and screen size

The film is authored on a fixed 1920 × 1080 stage. It scales to any window while keeping its 16:9 composition, and adds black bars when the window has a different shape.

To present, press **F**, or use the browser's own fullscreen (F11 on Windows, ⌃⌘F on macOS). On a 1920 × 1080 screen the stage fills the display exactly.

## 4. Screen-record it

Every frame is calculated from the playhead time, so the animation is identical on every run. Playback follows the real clock: if your computer drops a frame, the film skips it rather than slowing down, so it always lasts exactly 30 seconds.

**Recommended recipe**

1. Set the display (or the recording area) to **1920 × 1080**.
2. Open `index.html?clean&delay=3` in Chrome and press **F** for fullscreen.
3. Start your recorder. You have three seconds before the film begins. To start over, press **R**, or reload the page to get the delay again.
4. Stop recording after the end card has held for a moment (the final frame stays on screen).
5. Trim the start of the clip to the first frame of motion if needed.

**Recorders**

* **OBS Studio (Windows / macOS / Linux):** add a *Display Capture* or *Window Capture* source. Set *Settings → Video* base and output resolution to 1920×1080 at 60 fps (or 30 fps). Record to MP4/MKV at a high bitrate.
* **macOS:** press ⇧⌘5 → *Record Entire Screen* (or a selected portion). Then export or trim in QuickTime.
* **Windows:** press Win + Alt + R (Xbox Game Bar) while the browser is focused. You can also use the Snipping Tool's video mode on Windows 11.

**Tips:** close other tabs, and turn off notifications and *Do Not Disturb* pop-ups. If your screen is larger than 1080p, record it at full size and scale the video down afterwards. The type is designed to stay sharp at 4K.

## 5. The sequence (exact timing)

| Time | Chapter | What happens |
| --- | --- | --- |
| 0.0–3.0 | **00 The prompt** · 2022 | A dot grid on near-black. *30.11.2022*. A human types "Write a press release about our launch." The coral cursor collapses into a single dot. |
| 3.0–5.5 | | **FOUR YEARS.** The dot lands as its full stop and sends out four ripples, one for each year. **FROM A PROMPT…** |
| 5.5–9.0 | **01 Production** · 2023 | *First, it changed* **HOW THE WORK GETS MADE.** Headline drafts multiply (128 generated). A hand-drawn coral circle picks one: *the human call.* |
| 9.0–12.0 | **02 Ideation** · 2023 | *Then, how* **IDEAS GET EXPLORED.** One coral dot branches into dozens of routes. One route is chosen and drawn in coral. |
| 12.0–15.0 | **03 Adaptation & distribution** · 2024 | **ONE STORY. EVERY FORMAT. EVERY MARKET.** One story tile breaks into formats and EMEA markets, then streams outward. |
| 15.0–18.5 | **04 Discovery & visibility** · 2025 | **AUDIENCES STOPPED SEARCHING. THEY STARTED ASKING.** A question is typed; ten results fuse into one answer with three sources, the last marked *YOUR BRAND?* *Visibility now means being in the answer.* |
| 18.5–22.0 | **05 Reputation & trust** · 2026 | *…to a new* **INFORMATION ENVIRONMENT.** A living network around *your brand*: interpreted, summarised, compared, cited, ranked, recommended, *trusted?* |
| 22.0–26.0 | **06 Who tells the story** | *AI is no longer only helping us* **CREATE THE STORY.** → *AI is increasingly* **INTERPRETING / SUMMARIZING / DELIVERING THE STORY.** |
| 26.0–30.0 | **07 What comes next** | **THIS IS OUR MOMENT TO SHAPE WHAT COMES NEXT.** Particles from the whole film converge into the coral full stop of the **We.** mark. The end card holds. |

Some motifs run through the whole film:

* **The coral dot** is the prompt, the idea, the brand and finally the full stop in *We.*
* **Precise machine layers** (grids, generated drafts, branches, networks) contrast with **imperfect human gestures** (a hand-drawn circle, a chosen path). The machine multiplies the options; people make the call.

## 6. Design system

The We. Communications website could not be reached from the environment where this was built: its network policy blocked the domain. The palette therefore follows publicly reported details of the We. rebrand: a deep plum mark, a classic neutral base and energetic accent colours. All values are CSS custom properties at the top of `styles.css`:

| Token | Value | Role |
| --- | --- | --- |
| `--ink` | `#140a17` | near-black with a plum undertone |
| `--plum` | `#4a1052` | primary brand plum |
| `--plum-deep` | `#2a0830` | depth scenes |
| `--cream` | `#f4eee6` | warm neutral base |
| `--coral` | `#ff5a36` | the single hot accent: the human, the prompt, the brand |
| `--lilac` | `#c9b6ff` | soft secondary for machine-generated layers |

If you have the official brand values, change them there. The canvas layer reads the same variables, so the whole film updates.

**Typography**
* Display and text: **Inter Tight**, a strong, highly legible grotesque that works at very large display sizes.
* Labels and interface details: **JetBrains Mono**.
* Both fonts are bundled in `fonts/` under the SIL Open Font License (licence files included).
* To use the proprietary brand typeface, add its `@font-face` and change `--font-display` / `--font-mono`.

**Brand mark:** the **We.** mark is plain styled text with a coral full stop. It is not a recreation of the logo artwork.

## 7. Editing

* **Words:** every on-screen statement is plain text in `index.html`, one `<section>` per chapter.
* **Timing:** all timings are in `script.js`:
  * `buildCues()` controls when each statement enters and exits.
  * `SCENES`, `CHAPTERS` and `BGS` control scene windows, chapter labels and background wipes.
  * Each canvas layer (`drawTree`, `drawAnswer`, `drawNetwork`…) carries its own times.
* **Colours:** edit the custom properties in `styles.css`.
* `window.film` exposes `play()`, `pause()`, `seek(seconds)` and `time` for automation, e.g. frame-by-frame capture with Playwright or Puppeteer.

## 8. Files

```
index.html     structure and all on-screen copy
styles.css     design tokens, type system, layout, playback UI
script.js      timeline engine, text animation, canvas visuals, controls
fonts/         Inter Tight + JetBrains Mono (woff2, SIL OFL 1.1)
README.md      this file
```
