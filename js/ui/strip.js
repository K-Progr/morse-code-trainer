"use strict";

/**
 * strip.js — the decoded-text strip under the card (SRD §5.3) and the
 * small live readout above it (post-SRD addition) that shows the symbols of
 * the letter in progress and whether the current hold is a dot or a dash.
 */

/** Decoded text. Holds the last `max` characters; the element is aria-live="polite". */
export function createStrip(el, max) {
  const limit = max || 40;
  let text = "";
  let changed = null;

  function render() {
    el.textContent = text;
    if (changed) changed(text);
  }

  return {
    push(ch) {
      text = (text + ch).slice(-limit);
      render();
    },
    /** Insert one word space — never leading, never doubled. */
    space() {
      if (text === "" || text.endsWith(" ")) return;
      text = (text + " ").slice(-limit);
      render();
    },
    /**
     * Delete the last letter. Trailing auto-inserted spaces go with it, so
     * one press always removes something visible. Returns true if changed.
     */
    backspace() {
      const trimmed = text.replace(/ +$/, "");
      if (trimmed === "") {
        const had = text !== "";
        text = "";
        if (had) render();
        return had;
      }
      text = trimmed.slice(0, -1);
      render();
      return true;
    },
    clear() {
      text = "";
      render();
    },
    onChange(fn) { changed = fn; },
    get text() { return text; }
  };
}

/**
 * Live readout: `·–` (symbols so far) + the pending hold glyph (`·` that
 * becomes `–` at the dash threshold) + `→ A` once committed. Shows a hint
 * line when idle. The element should be aria-hidden — it changes too fast
 * to be useful to a screen reader; the strip is the accessible output.
 */
export function createLiveReadout(el) {
  const hintEl = document.createElement("span");
  hintEl.className = "live-hint";
  const pathEl = document.createElement("span");
  pathEl.className = "live-path";
  const holdEl = document.createElement("span");
  holdEl.className = "live-hold";
  const commitEl = document.createElement("span");
  commitEl.className = "live-commit";
  el.append(hintEl, pathEl, holdEl, commitEl);

  let path = "";
  let hold = null;        // null | "dot" | "dash"
  let committed = "";

  function render() {
    hintEl.hidden = !!(path || hold || committed);
    pathEl.textContent = path;
    holdEl.textContent = hold === "dash" ? "–" : hold === "dot" ? "·" : "";
    holdEl.className = "live-hold" + (hold ? " " + hold : "");
    commitEl.textContent = committed ? " → " + committed : "";
  }

  return {
    setPath(glyphs) { path = glyphs; committed = ""; render(); },
    setHold(kind) { hold = kind; if (kind) committed = ""; render(); },
    setCommitted(letter) { committed = letter; render(); },
    clear() { path = ""; hold = null; committed = ""; render(); },
    setHint(text) { hintEl.textContent = text; }
  };
}
