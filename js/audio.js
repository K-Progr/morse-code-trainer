"use strict";

/**
 * audio.js — Web Audio sidetone (SRD §5.4).
 *
 * One always-running sine oscillator into a gain node that sits at 0 until a
 * tone is requested; on/off are 5 ms linear ramps so nothing clicks. The
 * AudioContext is created lazily on the first user gesture.
 */

const RAMP_S = 0.005;     // 5 ms attack / release
const LEVEL = 0.35;       // sidetone gain

const BUZZ = { hz: 300, ms: 120, level: 0.12, type: "square" };   // invalid path (§5.2)
const CUE = { hz: 1400, ms: 35, level: 0.12, type: "sine" };      // hold reached the dash threshold

let ctx = null;
let osc = null;
let gain = null;
let muted = false;
let freq = 700;
let sounding = false;     // a tone is logically on (even if muted)

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start();
  } catch {
    ctx = null;
  }
  return ctx;
}

function resume() {
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
}

function rampTo(level) {
  const t = ctx.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(gain.gain.value, t);
  gain.gain.linearRampToValueAtTime(level, t + RAMP_S);
}

/** Call on any user gesture so the context exists before it is needed. */
export function unlock() {
  ensure();
  resume();
}

export function toneOn() {
  sounding = true;
  if (muted || !ensure()) return;
  resume();
  rampTo(LEVEL);
}

export function toneOff() {
  sounding = false;
  if (ctx) rampTo(0);
}

/** One-shot tone on its own oscillator. */
export function beep({ hz, ms, level, type }) {
  if (muted || !ensure()) return;
  resume();
  const t = ctx.currentTime;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + RAMP_S);
  g.gain.setValueAtTime(level, t + ms / 1000 - RAMP_S);
  g.gain.linearRampToValueAtTime(0, t + ms / 1000);
  g.connect(ctx.destination);
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = hz;
  o.connect(g);
  o.start(t);
  o.stop(t + ms / 1000 + 0.01);
  o.onended = () => { o.disconnect(); g.disconnect(); };
}

/** Short low buzz for an invalid path (§5.2). Respects mute. */
export function errorBuzz() { beep(BUZZ); }

/** Brief high tick the moment a hold reaches the dash threshold. Respects mute. */
export function dashCue() { beep(CUE); }

export function setMuted(m) {
  muted = !!m;
  if (!ctx) return;
  if (muted) rampTo(0);
  else if (sounding) rampTo(LEVEL);
}

export function setFreq(hz) {
  freq = Number(hz) || freq;
  if (osc) osc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.01);
}
