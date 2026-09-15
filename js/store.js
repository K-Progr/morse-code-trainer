"use strict";

/**
 * store.js — localStorage persistence for settings and the last recording
 * (SRD §5.5, §5.6). Every access is wrapped: a blocked or full storage
 * must never break the app.
 */

import { clampT, clampDashRatio, DEFAULT_T, DEFAULT_DASH_RATIO } from "./morse/timing.js";
import { isValidRecording } from "./morse/decoder.js";

const SETTINGS_KEY = "morse-card.settings.v1";
const RECORDING_KEY = "morse-card.recording.v1";

export const DEFAULT_SETTINGS = Object.freeze({
  power: true,
  muted: false,
  hints: true,
  chartOpen: false,
  T: DEFAULT_T,
  dashRatio: DEFAULT_DASH_RATIO,
  freq: 700
});

function read(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Sidetone pitch, clamped to the slider's range (§5.4: 400–1000 Hz). */
export function clampFreq(hz) {
  const n = Number(hz);
  if (!isFinite(n)) return DEFAULT_SETTINGS.freq;
  return Math.min(1000, Math.max(400, Math.round(n)));
}

/** Settings merged over the defaults, with each value sanitised. */
export function loadSettings() {
  const s = { ...DEFAULT_SETTINGS };
  const saved = read(SETTINGS_KEY);
  if (saved && typeof saved === "object") {
    if (typeof saved.power === "boolean") s.power = saved.power;
    if (typeof saved.muted === "boolean") s.muted = saved.muted;
    if (typeof saved.hints === "boolean") s.hints = saved.hints;
    if (typeof saved.chartOpen === "boolean") s.chartOpen = saved.chartOpen;
    if (saved.T !== undefined) s.T = clampT(saved.T);
    if (saved.dashRatio !== undefined) s.dashRatio = clampDashRatio(saved.dashRatio);
    if (saved.freq !== undefined) s.freq = clampFreq(saved.freq);
  }
  return s;
}

export function saveSettings(settings) {
  return write(SETTINGS_KEY, {
    power: !!settings.power,
    muted: !!settings.muted,
    hints: !!settings.hints,
    chartOpen: !!settings.chartOpen,
    T: clampT(settings.T),
    dashRatio: clampDashRatio(settings.dashRatio),
    freq: clampFreq(settings.freq)
  });
}

/** The last recording as a press list, or null if none / corrupt. */
export function loadRecording() {
  const r = read(RECORDING_KEY);
  return isValidRecording(r) ? r : null;
}

export function saveRecording(presses) {
  if (!isValidRecording(presses)) return false;
  return write(RECORDING_KEY, presses);
}
