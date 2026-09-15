"use strict";

/**
 * timing.js — the base time unit T and everything derived from it (SRD §5).
 *
 * All thresholds are functions of T so that changing T mid-letter uses the
 * new value for every subsequent threshold (§6).
 *
 * The dash threshold is `dashRatio × T` (post-SRD addition): the SRD fixes it
 * at 2T, which stays the default, but users who find dots and dashes hard to
 * separate can widen it without slowing the commit / word gaps.
 */

export const DEFAULT_T = 150;   // ms
export const MIN_T = 60;
export const MAX_T = 300;

export const DEFAULT_DASH_RATIO = 2;    // press >= 2T is a dash (§5.1)
export const MIN_DASH_RATIO = 1.5;
export const MAX_DASH_RATIO = 3;        // reference-mode dashes are 3T, so never above this

/** Presses shorter than this are noise and are discarded (§5.1). */
export const DEBOUNCE_MS = 20;

/** Error flash length (§5.2). The 200 ms commit pulse lives in style.css. */
export const ERROR_FLASH_MS = 400;

/** Clamp a T value into the user-adjustable range. */
export function clampT(t) {
  const n = Number(t);
  if (!isFinite(n)) return DEFAULT_T;
  return Math.min(MAX_T, Math.max(MIN_T, Math.round(n)));
}

/** Clamp a dash ratio into range, to two decimals. */
export function clampDashRatio(r) {
  const n = Number(r);
  if (!isFinite(n)) return DEFAULT_DASH_RATIO;
  return Math.min(MAX_DASH_RATIO, Math.max(MIN_DASH_RATIO, Math.round(n * 100) / 100));
}

/** All thresholds for a given T (and optional dash ratio, default 2). */
export function thresholds(T, dashRatio) {
  const k = dashRatio === undefined ? DEFAULT_DASH_RATIO : clampDashRatio(dashRatio);
  return {
    dashMin: Math.round(k * T),   // press >= dashMin is a dash
    commitGap: 3 * T,     // silence >= 3T commits the letter (§5.3)
    wordGap: 7 * T,       // silence >= 7T after a commit inserts a space (§5.3)
    hold: T,              // lit path stays for 1T after commit (§5.3)
    dotMs: T,             // reference / playback dot length (§5.7)
    dashMs: 3 * T,        // reference / playback dash length (§5.7)
    gapMs: T              // reference / playback intra-letter gap (§5.7)
  };
}

/** Classify a press by its duration. */
export function symbolFor(durationMs, T, dashRatio) {
  return durationMs >= thresholds(T, dashRatio).dashMin ? "-" : ".";
}

/**
 * Turn a symbol path into a press list with textbook timing, relative to
 * t = 0: dot = T, dash = 3T, intra-gap = T. Used by reference mode.
 */
export function pressesForPath(path, T) {
  const th = thresholds(T);
  const presses = [];
  let t = 0;
  for (const symbol of path) {
    const len = symbol === "-" ? th.dashMs : th.dotMs;
    presses.push({ downAt: t, upAt: t + len });
    t += len + th.gapMs;
  }
  return presses;
}
