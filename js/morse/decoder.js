"use strict";

/**
 * decoder.js — the pure state machine (SRD §6, §8 rules).
 *
 *   reduce(state, event, T, dashRatio) -> { state, effects, deadline }
 *
 * No DOM, no timers, no clock. Every event carries its own timestamp `t`
 * (any monotonic ms source — performance.now() in the app, plain numbers in
 * tests). The caller (main.js) owns exactly one setTimeout: it fires a
 * { type: "tick", t } at `deadline.at` and feeds it back in.
 *
 * `dashRatio` is optional (default 2): a press of >= dashRatio × T is a dash.
 *
 * Modes:  OFF | IDLE | KEY_HELD | SYMBOL_ENTERED | LETTER_COMMITTED |
 *         ERROR_FLASH | PLAYBACK
 *
 * Events: keyDown | keyUp | tick | retime | power | playbackStart |
 *         playbackEnd | reset            — all with `t`, power also `on`
 *
 * Effects (in order emitted):
 *   { type: "toneOn" } / { type: "toneOff" }
 *   { type: "holdDash" }                        the current hold just reached the dash threshold
 *   { type: "rootPulse" }                       first symbol of a letter
 *   { type: "lightPath", pads: [padId...] }     whole path, root excluded
 *   { type: "error", pads: [padId...] }         pads to flash red, then reset
 *   { type: "commit", letter, padId }
 *   { type: "space" }
 *   { type: "clearPads" }
 */

import { nodeForPath, letterForPath, padsForPath } from "./tree.js";
import { thresholds, DEBOUNCE_MS, ERROR_FLASH_MS } from "./timing.js";

export function createState(powered) {
  const on = powered !== false;
  return {
    mode: on ? "IDLE" : "OFF",
    powered: on,
    path: "",
    downAt: null,        // KEY_HELD: when the key went down
    dashReached: false,  // KEY_HELD: the hold has already crossed the dash threshold
    lastUpAt: null,      // SYMBOL_ENTERED: when the last symbol ended
    lastCommitAt: null,  // LETTER_COMMITTED / IDLE: when the last letter committed
    errorAt: null,       // ERROR_FLASH: when the flash began
    spaced: true         // false = a word-gap space is still pending
  };
}

/** A copy of `state` with `patch` applied — the input is never mutated. */
const set = (state, patch) => ({ ...state, ...patch });

/**
 * The next timer the caller must arm for this state, or null.
 * Derived from state alone so a T / ratio change simply re-derives it.
 */
export function nextDeadline(state, T, dashRatio) {
  const th = thresholds(T, dashRatio);
  switch (state.mode) {
    case "KEY_HELD":
      return state.dashReached ? null : { kind: "dashReached", at: state.downAt + th.dashMin };
    case "SYMBOL_ENTERED":
      return { kind: "commit", at: state.lastUpAt + th.commitGap };
    case "LETTER_COMMITTED":
      return { kind: "clear", at: state.lastCommitAt + th.hold };
    case "ERROR_FLASH":
      return { kind: "errorEnd", at: state.errorAt + ERROR_FLASH_MS };
    case "IDLE":
      return state.spaced ? null : { kind: "space", at: state.lastCommitAt + th.wordGap };
    default:
      return null;   // OFF, PLAYBACK
  }
}

export function reduce(state, ev, T, dashRatio) {
  const th = thresholds(T, dashRatio);
  const fx = [];
  let s = state;

  switch (ev.type) {
    case "power": {
      if (ev.on) {
        s = createState(true);
        fx.push({ type: "clearPads" });
      } else {
        s = createState(false);
        fx.push({ type: "toneOff" }, { type: "clearPads" });
      }
      break;
    }

    case "reset": {
      if (s.mode === "OFF") break;
      s = createState(true);
      fx.push({ type: "toneOff" }, { type: "clearPads" });
      break;
    }

    case "playbackStart": {
      if (s.mode === "OFF") break;
      s = set(createState(true), { mode: "PLAYBACK" });
      fx.push({ type: "toneOff" }, { type: "clearPads" });
      break;
    }

    case "playbackEnd": {
      if (s.mode !== "PLAYBACK") break;
      s = createState(true);
      fx.push({ type: "clearPads" });
      break;
    }

    case "retime":
      break;   // state unchanged; the deadline below is re-derived with the new T / ratio

    case "keyDown": {
      if (s.mode === "OFF" || s.mode === "PLAYBACK" || s.mode === "KEY_HELD") break;
      let path = s.path;
      if (s.mode === "LETTER_COMMITTED" || s.mode === "ERROR_FLASH") {
        path = "";
        fx.push({ type: "clearPads" });
      }
      if (path === "") fx.push({ type: "rootPulse" });
      fx.push({ type: "toneOn" });
      // A new key-down before the word gap cancels the pending space.
      s = set(s, { mode: "KEY_HELD", path, downAt: ev.t, dashReached: false, errorAt: null, spaced: true });
      break;
    }

    case "keyUp": {
      if (s.mode !== "KEY_HELD") break;
      fx.push({ type: "toneOff" });
      const d = ev.t - s.downAt;

      if (d < DEBOUNCE_MS) {
        // Too short to be a symbol: pretend it never happened.
        s = set(s, { mode: s.path === "" ? "IDLE" : "SYMBOL_ENTERED", downAt: null, dashReached: false });
        break;
      }

      const symbol = d >= th.dashMin ? "-" : ".";
      const next = s.path + symbol;
      const node = nodeForPath(next);

      if (!node || !node.letter) {
        fx.push({ type: "error", pads: padsForPath(s.path) });
        s = set(s, { mode: "ERROR_FLASH", path: "", downAt: null, dashReached: false, errorAt: ev.t });
        break;
      }

      fx.push({ type: "lightPath", pads: padsForPath(next) });
      s = set(s, { mode: "SYMBOL_ENTERED", path: next, downAt: null, dashReached: false, lastUpAt: ev.t });
      break;
    }

    case "tick": {
      const dl = nextDeadline(s, T, dashRatio);
      if (!dl || ev.t < dl.at) break;   // early tick (T was raised): just re-arm

      switch (dl.kind) {
        case "dashReached":
          fx.push({ type: "holdDash" });
          s = set(s, { dashReached: true });
          break;
        case "commit": {
          const letter = letterForPath(s.path);
          fx.push({ type: "commit", letter, padId: letter });
          s = set(s, { mode: "LETTER_COMMITTED", lastCommitAt: ev.t, spaced: false });
          break;
        }
        case "clear":
          fx.push({ type: "clearPads" });
          s = set(s, { mode: "IDLE", path: "" });
          break;
        case "space":
          fx.push({ type: "space" });
          s = set(s, { spaced: true });
          break;
        case "errorEnd":
          fx.push({ type: "clearPads" });
          s = set(s, { mode: "IDLE", path: "", errorAt: null });
          break;
      }
      break;
    }
  }

  return { state: s, effects: fx, deadline: nextDeadline(s, T, dashRatio) };
}

/* ----------------------------------------------------------------------
 * Recording (SRD §5.5) — pure helpers so the cap is testable.
 * A recording is an array of { downAt, upAt } in ms relative to REC start.
 * -------------------------------------------------------------------- */

export const MAX_RECORD_MS = 60000;
export const MAX_PRESSES = 200;

/**
 * Append a press. Returns { presses, full, accepted }.
 * `full` is true once either cap is reached; the caller stops recording.
 */
export function recordPress(presses, press) {
  if (presses.length >= MAX_PRESSES) {
    return { presses, full: true, accepted: false };
  }
  if (press.upAt > MAX_RECORD_MS) {
    return { presses, full: true, accepted: false };
  }
  const next = [...presses, { downAt: press.downAt, upAt: press.upAt }];
  const full = next.length >= MAX_PRESSES || press.upAt >= MAX_RECORD_MS;
  return { presses: next, full, accepted: true };
}

/** True when a stored recording is a well-formed, non-empty press list. */
export function isValidRecording(r) {
  if (!Array.isArray(r) || r.length === 0 || r.length > MAX_PRESSES) return false;
  let last = -1;
  for (const p of r) {
    if (!p || typeof p.downAt !== "number" || typeof p.upAt !== "number") return false;
    if (!(p.downAt >= last) || !(p.upAt > p.downAt) || p.upAt > MAX_RECORD_MS) return false;
    last = p.upAt;
  }
  return true;
}
