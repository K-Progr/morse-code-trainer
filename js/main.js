"use strict";

/**
 * main.js — wires DOM events -> decoder -> render.
 *
 * This is the only module that owns timers. The decoder tells us the next
 * deadline; we keep exactly one setTimeout armed for it and feed a `tick`
 * back in. Playback runs a second decoder instance through the same
 * effect renderer so the tree lights exactly as it would for live input.
 */

import { buildCard } from "./ui/card.js";
import { bindControls } from "./ui/controls.js";
import { createStrip, createLiveReadout } from "./ui/strip.js";
import { bindHints } from "./ui/hints.js";
import { createState, reduce, recordPress } from "./morse/decoder.js";
import { thresholds, pressesForPath, clampT, clampDashRatio } from "./morse/timing.js";
import { pathForLetter, glyphPath } from "./morse/tree.js";
import * as audio from "./audio.js";
import { loadSettings, saveSettings, loadRecording, saveRecording, clampFreq } from "./store.js";

const now = () => performance.now();

/* ---------- DOM ---------- */
const card = buildCard(document.getElementById("card"));
const strip = createStrip(document.getElementById("strip"), 40);
const live = createLiveReadout(document.getElementById("live"));

/* ---------- persistent settings ---------- */
const settings = loadSettings();
let recording = loadRecording();   // [{downAt, upAt}] | null

/* ---------- hints drawer (non-modal; the key stays live while it is open) ---------- */
bindHints({
  drawer: document.getElementById("hints-drawer"),
  scrim: document.getElementById("hints-scrim"),
  openBtn: document.getElementById("ctl-show-hints"),
  closeBtn: document.getElementById("chart-close"),
  initialOpen: settings.chartOpen,
  onChange(open) {
    settings.chartOpen = open;
    saveSettings(settings);
  }
});

/* ---------- live decoder ---------- */
let state = createState(settings.power);
let timer = null;

function arm(deadline) {
  if (timer !== null) { clearTimeout(timer); timer = null; }
  if (!deadline) return;
  const delay = Math.max(0, deadline.at - now());
  timer = setTimeout(() => {
    timer = null;
    dispatch({ type: "tick", t: now() });
  }, delay);
}

function dispatch(ev) {
  const r = reduce(state, ev, settings.T, settings.dashRatio);
  state = r.state;
  applyEffects(r.effects, true);
  arm(r.deadline);
}

/**
 * Render a decoder effect list. Shared by live input and playback;
 * `isLive` gates feedback that only helps a human who is keying right now.
 */
function applyEffects(effects, isLive) {
  for (const fx of effects) {
    switch (fx.type) {
      case "toneOn":
        audio.toneOn();
        card.setKeyPressed(true);
        card.setHold("dot");
        live.setHold("dot");
        break;
      case "holdDash":
        card.setHold("dash");
        live.setHold("dash");
        if (isLive) audio.dashCue();
        break;
      case "toneOff":
        audio.toneOff();
        card.setKeyPressed(false);
        card.setHold(null);
        live.setHold(null);
        break;
      case "rootPulse":
        card.rootPulse();
        break;
      case "lightPath":
        card.setLit(fx.pads);
        live.setPath(glyphPath(pathForLetter(fx.pads[fx.pads.length - 1]) || ""));
        break;
      case "error":
        card.errorFlash(fx.pads);
        audio.errorBuzz();
        live.clear();
        break;
      case "commit":
        card.pulse(fx.padId);
        strip.push(fx.letter);
        live.setCommitted(fx.letter);
        break;
      case "space":
        strip.space();
        break;
      case "clearPads":
        card.clearAll();
        live.clear();
        break;
    }
  }
}

/* ---------- key input ---------- */
let keyHeld = false;
let recDownAt = null;

function keyDown() {
  if (keyHeld) return;
  keyHeld = true;
  audio.unlock();
  const t = now();
  if (recActive) recDownAt = t;
  dispatch({ type: "keyDown", t });
}

function keyUp() {
  if (!keyHeld) return;
  keyHeld = false;
  const t = now();
  if (recActive && recDownAt !== null) recordLivePress(recDownAt, t);
  recDownAt = null;
  dispatch({ type: "keyUp", t });
}

const keyEl = card.keyEl;
keyEl.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  e.preventDefault();
  try { keyEl.setPointerCapture(e.pointerId); } catch { /* capture is a nicety, not required */ }
  keyDown();
});
keyEl.addEventListener("pointerup", (e) => { e.preventDefault(); keyUp(); });
keyEl.addEventListener("pointercancel", keyUp);
keyEl.addEventListener("contextmenu", (e) => e.preventDefault());
keyEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); if (!e.repeat) keyDown(); }
});
keyEl.addEventListener("keyup", (e) => {
  if (e.key === "Enter") { e.preventDefault(); keyUp(); }
});

function isFormControl(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "BUTTON" || tag === "SELECT" || tag === "TEXTAREA" || tag === "A" || el.isContentEditable === true;
}
function isSpace(e) { return e.code === "Space" || e.key === " " || e.key === "Spacebar"; }
function spaceIsOurs(e) {
  if (!isSpace(e)) return false;
  if (isFormControl(e.target)) return false;
  if (e.target && e.target.closest && e.target.closest(".pad")) return false;   // pad tap handled in card.js
  return true;
}
function isDeleteKey(e) { return e.key === "Backspace" || e.key === "Delete"; }

window.addEventListener("keydown", (e) => {
  if (spaceIsOurs(e)) {
    e.preventDefault();
    if (!e.repeat) keyDown();
    return;
  }
  if (isDeleteKey(e) && !isFormControl(e.target)) {
    e.preventDefault();
    deleteLast();          // repeats while held, like a text editor
  }
});
window.addEventListener("keyup", (e) => {
  if (!spaceIsOurs(e)) return;
  e.preventDefault();
  keyUp();
});
window.addEventListener("blur", keyUp);
document.addEventListener("visibilitychange", () => { if (document.hidden) keyUp(); });

/* ---------- decoded text editing ---------- */
function deleteLast() {
  if (!state.powered) return;
  strip.backspace();
}

function refreshEditButtons() {
  controls.setEditEnabled(state.powered && strip.text.length > 0);
}

/* ---------- recording (§5.5) ---------- */
let recActive = false;
let recStart = 0;
let recPresses = [];

function recordLivePress(downAt, upAt) {
  const r = recordPress(recPresses, { downAt: downAt - recStart, upAt: upAt - recStart });
  recPresses = r.presses;
  if (r.full) stopRecording();
}

function startRecording() {
  if (!state.powered || playback || recActive) return;
  recActive = true;
  recStart = now();
  recPresses = [];
  recDownAt = null;
  controls.setRec(true);
  controls.setPlay("play", false);
}

function stopRecording() {
  if (!recActive) return;
  recActive = false;
  recDownAt = null;
  if (recPresses.length > 0) {
    recording = recPresses;
    saveRecording(recording);
  }
  controls.setRec(false);
  controls.setPlay("play", !!recording && state.powered);
}

/* ---------- playback & reference mode (§5.5, §5.7) ---------- */
let playback = null;   // { state, timer, timers[], retime }

function playSequence(presses) {
  stopPlayback();
  if (!state.powered || presses.length === 0) return;

  dispatch({ type: "playbackStart", t: now() });   // live decoder now ignores the user
  card.setBusy(true);
  controls.setPlay("stop", true);
  controls.setRecEnabled(false);

  const pb = { state: createState(true), timer: null, timers: [], retime: null };
  playback = pb;
  const t0 = now();

  const pbArm = (deadline) => {
    if (pb.timer !== null) { clearTimeout(pb.timer); pb.timer = null; }
    if (!deadline) return;
    pb.timer = setTimeout(() => {
      pb.timer = null;
      pbDispatch({ type: "tick", t: now() });
    }, Math.max(0, deadline.at - now()));
  };
  const pbDispatch = (ev) => {
    if (playback !== pb) return;
    const r = reduce(pb.state, ev, settings.T, settings.dashRatio);
    pb.state = r.state;
    applyEffects(r.effects, false);
    pbArm(r.deadline);
  };
  pb.retime = () => pbDispatch({ type: "retime", t: now() });

  // Synthetic key events carry their *scheduled* timestamps so the replay
  // classifies every press exactly as it was recorded, whatever the jitter.
  for (const p of presses) {
    pb.timers.push(setTimeout(() => pbDispatch({ type: "keyDown", t: t0 + p.downAt }), p.downAt));
    pb.timers.push(setTimeout(() => pbDispatch({ type: "keyUp", t: t0 + p.upAt }), p.upAt));
  }
  const th = thresholds(settings.T);
  const last = presses[presses.length - 1].upAt;
  pb.timers.push(setTimeout(stopPlayback, last + th.commitGap + th.hold + 60));
}

function stopPlayback() {
  const pb = playback;
  if (!pb) return;
  playback = null;
  for (const id of pb.timers) clearTimeout(id);
  if (pb.timer !== null) clearTimeout(pb.timer);
  audio.toneOff();
  card.setKeyPressed(false);
  card.setHold(null);
  card.setBusy(false);
  live.clear();
  dispatch({ type: "playbackEnd", t: now() });
  controls.setPlay("play", !!recording && state.powered && !recActive);
  controls.setRecEnabled(state.powered);
}

card.onPadActivate((id, path) => {
  if (!state.powered || recActive || playback) return;
  audio.unlock();
  playSequence(pressesForPath(path, settings.T));
});

/* ---------- controls (§5.6) ---------- */
const controls = bindControls(document, {   // transport bar + settings panel live in different containers
  onPower(on) {
    settings.power = on;
    saveSettings(settings);
    if (!on) {
      stopPlayback();
      stopRecording();
      keyHeld = false;
      recDownAt = null;
    }
    dispatch({ type: "power", on, t: now() });
    card.setPowered(on);
    controls.setRecEnabled(on);
    controls.setPlay("play", on && !!recording);
    refreshEditButtons();
  },
  onMute(on) {
    settings.muted = on;
    saveSettings(settings);
    audio.setMuted(on);
  },
  onHints(on) {
    settings.hints = on;
    saveSettings(settings);
    card.setHints(on);
  },
  onRec() {
    if (recActive) stopRecording(); else startRecording();
  },
  onPlay() {
    if (playback) { stopPlayback(); return; }
    if (recording) { audio.unlock(); playSequence(recording); }
  },
  onDelete() {
    deleteLast();
  },
  onClear() {
    strip.clear();
  },
  onT(v) {
    settings.T = clampT(v);
    saveSettings(settings);
    dispatch({ type: "retime", t: now() });        // new T applies to the pending threshold
    if (playback) playback.retime();
    refreshThresholdInfo();
  },
  onDashRatio(v) {
    settings.dashRatio = clampDashRatio(v);
    saveSettings(settings);
    dispatch({ type: "retime", t: now() });
    if (playback) playback.retime();
    refreshThresholdInfo();
  },
  onFreq(v) {
    settings.freq = clampFreq(v);
    saveSettings(settings);
    audio.setFreq(settings.freq);
  }
});

/** Dash-threshold readouts: the slider label and the idle hint above the strip. */
function refreshThresholdInfo() {
  const ms = thresholds(settings.T, settings.dashRatio).dashMin;
  controls.setDashInfo(settings.dashRatio, ms);
  live.setHint("tap = ·    hold ≥ " + ms + " ms = –");
}

strip.onChange(refreshEditButtons);

/* ---------- initial render ---------- */
controls.setPower(settings.power);
controls.setMute(settings.muted);
controls.setHints(settings.hints);
controls.setT(settings.T);
controls.setFreq(settings.freq);
controls.setRec(false);
controls.setRecEnabled(settings.power);
controls.setPlay("play", settings.power && !!recording);
refreshThresholdInfo();
refreshEditButtons();
live.clear();

audio.setMuted(settings.muted);
audio.setFreq(settings.freq);
card.setHints(settings.hints);
card.setPowered(settings.power);

/* ---------- optional offline shell (§2, §7) ---------- */
try {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" })
        .catch(() => { /* offline shell is optional */ });
    });
  }
} catch { /* no service worker support: the app still works, just not offline */ }
