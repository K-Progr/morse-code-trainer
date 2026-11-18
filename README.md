# Morse Code Trainer

Learn Morse code by keying it. Tap the red key for a dot, hold it for a dash, and watch the
letter light up on the board — just like the physical "Morse Code Trainer Card".

**Try it online:** enable GitHub Pages on this repository and open the URL it gives you. Nothing to
install.

## How to use it

1. **Press the red key** (or hold the **Space** bar).
   - A quick tap is a **dot**.
   - Keep holding until the arcs turn green — that's a **dash**.
2. **Pause** and the letter appears in the *Decoded* box. A longer pause adds a space between words.
3. Made a mistake? **Backspace** (or **DEL**) removes the last letter. **CLEAR** wipes the box.
4. Not sure of a code? Click **Show hints** for a chart, or **tap any letter on the board** to hear
   and see it played.

### Buttons and switches

| Control | What it does |
|---|---|
| **REC** | Records your key presses (up to 60 seconds). |
| **PLAY / STOP** | Replays your last recording — the board lights up and the tone plays exactly as you keyed it. |
| **DEL** / **CLEAR** | Delete the last letter / clear all decoded text. |
| **Power** | Turns the board off (greyed out, key inactive). |
| **Mute** | Silences the tone; the lights still work. |
| **Codes on card** | Shows the dot/dash code under each letter on the board. |
| **Show hints** | Opens a Morse code chart on the left of the page. It stays open while you key. |
| **Speed T** | Your pace. Lower = faster keying is expected; higher = more relaxed. |
| **Dash ≥** | How long a press must be to count as a dash. Raise it if your taps keep coming out as dashes. |
| **Tone** | Pitch of the beep. |

Your settings and last recording are saved in the browser, so they're still there next time.

## Running it on your own computer (There is no need for this since it is hosted on github)

The app is plain files — no installation, no build step. Browsers won't run it straight from a
folder, so serve it with any simple web server:

- **VS Code:** install the *Live Server* extension, right-click `index.html` → *Open with Live Server*.
- **Python:** in this folder run `python -m http.server 8000`, then open <http://localhost:8000/>.

Open `tests.html` from the same server to run the built-in self-checks (a green banner means all is well).

## For developers

- Vanilla HTML/CSS/JavaScript (ES modules). Zero dependencies, zero build. Deploys to GitHub Pages as-is.
- `js/morse/decoder.js` is a pure state machine — `reduce(state, event, T) → { state, effects, deadline }` —
  driven by timestamps, which is why the same code runs live keying, playback, reference mode and the
  browser tests in `tests.html`.
- `js/layout.js` is the single source of truth for the board geometry; `js/ui/card.js` draws it as SVG.
- `sw.js` is an optional network-first service worker for offline use; `manifest.json` allows "install as app".
- Design notes and every deliberate deviation from the original spec are recorded in `CLAUDE.md`.

The physical card's artwork prints "V" beside the K pad; the correct letter there is **Y** (`-.--`), and
that is what this app shows.
