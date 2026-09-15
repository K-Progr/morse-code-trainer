"use strict";

/**
 * layout.js — single source of truth for the card geometry.
 *
 * Coordinates were read off reference.png against a 660 x 900 viewBox
 * (the photo is ~662 x 912, so the mapping is ~1:1).
 *
 * Dash pads are rectangles whose LONG axis follows the direction of the
 * branch they hang off, exactly as the photo draws them:
 *   orient 'h' -> 92 x 56   (O M T, Q, K, Y, X)
 *   orient 'v' -> 56 x 92   (A, W, J, U, V)
 */

export const VIEW_W = 660;
export const VIEW_H = 900;

export const DOT_R = 33;   // circle radius
export const DASH_L = 92;  // rectangle long axis
export const DASH_S = 56;  // rectangle short axis

/** Column centres. l* = dash side (left), r* = dot side (right). */
const l0 = 79, l1 = 171, l2 = 263;
const r0 = 397, r1 = 467, r2 = 537, r3 = 607;

/** Row centres. */
const ra = 172, rb = 265, rc = 352, rd = 458, re = 555, rf = 650, rg = 742;

/** The tree root: the telegraph-key icon between the two title words. */
export const ROOT = { x: 330, y: ra, iconTop: 34, iconBottom: 115 };

export const TITLE = {
  left: { text: "MORSE", x: 175, y: 86 },
  right: { text: "CODE", x: 505, y: 86 }
};

export const LANYARD = { cx: 606, cy: 46, ring: 22, hole: 12 };

/** Red tactile key at bottom centre. */
export const KEY = {
  cx: 330, cy: 840,
  baseW: 104, baseH: 96, baseR: 8,
  capR: 30,
  waveOffsets: [64, 86]   // distance from cx for the "((" / "))" arcs
};

/**
 * Pads, in tree order. `id` doubles as the pad id and the letter.
 * label.a is the text-anchor ('middle' | 'start' | 'end').
 * `hint` (optional) places the dot/dash glyphs; default is 17 px under the label.
 */
export const PADS = [
  // --- dash side (left of root) ---------------------------------------
  { id: "T", path: "-",    shape: "dash", orient: "h", x: l2, y: ra, label: { x: l2,      y: 118, a: "middle" } },
  { id: "M", path: "--",   shape: "dash", orient: "h", x: l1, y: ra, label: { x: l1,      y: 118, a: "middle" } },
  { id: "O", path: "---",  shape: "dash", orient: "h", x: l0, y: ra, label: { x: l0,      y: 118, a: "middle" } },
  { id: "G", path: "--.",  shape: "dot",  orient: "h", x: l1, y: rb, label: { x: l1 + 46, y: rb + 12, a: "start" } },
  { id: "Q", path: "--.-", shape: "dash", orient: "h", x: l0, y: rb, label: { x: l0,      y: rb + 66, a: "middle" } },
  { id: "Z", path: "--..", shape: "dot",  orient: "h", x: l1, y: rc, label: { x: l1 + 46, y: rc + 12, a: "start" } },
  { id: "N", path: "-.",   shape: "dot",  orient: "h", x: l2, y: rd, label: { x: l2 + 46, y: rd - 14, a: "start" } },
  { id: "K", path: "-.-",  shape: "dash", orient: "h", x: l1, y: rd, label: { x: l1 + 15, y: rd - 49, a: "middle" }, hint: { x: l1 + 15, y: rd - 34, a: "middle" } },
  { id: "Y", path: "-.--", shape: "dash", orient: "h", x: l0, y: rd, label: { x: l0,      y: rd - 49, a: "middle" }, hint: { x: l0,      y: rd - 34, a: "middle" } },
  { id: "C", path: "-.-.", shape: "dot",  orient: "h", x: l1, y: re, label: { x: l1 + 46, y: re - 14, a: "start" } },
  { id: "D", path: "-..",  shape: "dot",  orient: "h", x: l2, y: rf, label: { x: l2 + 46, y: rf - 14, a: "start" } },
  { id: "X", path: "-..-", shape: "dash", orient: "h", x: l1, y: rf, label: { x: l1 - 56, y: rf + 12, a: "end" } },
  { id: "B", path: "-...", shape: "dot",  orient: "h", x: l2, y: rg, label: { x: l2 - 46, y: rg + 12, a: "end" } },

  // --- dot side (right of root) ---------------------------------------
  { id: "E", path: ".",    shape: "dot",  orient: "v", x: r0, y: ra, label: { x: r0,      y: 118, a: "middle" } },
  { id: "I", path: "..",   shape: "dot",  orient: "v", x: r1, y: ra, label: { x: r1,      y: 118, a: "middle" } },
  { id: "S", path: "...",  shape: "dot",  orient: "v", x: r2, y: ra, label: { x: r2,      y: 118, a: "middle" } },
  { id: "H", path: "....", shape: "dot",  orient: "v", x: r3, y: ra, label: { x: r3,      y: 118, a: "middle" } },
  { id: "U", path: "..-",  shape: "dash", orient: "v", x: r1, y: rb, label: { x: r1 - 36, y: rb + 12, a: "end" } },
  { id: "V", path: "...-", shape: "dash", orient: "v", x: r2, y: rb, label: { x: r2 + 40, y: rb + 12, a: "start" } },
  { id: "F", path: "..-.", shape: "dot",  orient: "v", x: r1, y: rc, label: { x: r1 + 46, y: rc + 12, a: "start" } },
  { id: "A", path: ".-",   shape: "dash", orient: "v", x: r0, y: rd, label: { x: r0 - 40, y: rd + 34, a: "end" } },
  { id: "R", path: ".-.",  shape: "dot",  orient: "v", x: r1, y: rd, label: { x: r1 - 6,  y: rd + 66, a: "middle" } },
  { id: "L", path: ".-..", shape: "dot",  orient: "v", x: r2, y: rd, label: { x: r2 + 46, y: rd + 12, a: "start" } },
  { id: "W", path: ".--",  shape: "dash", orient: "v", x: r0, y: rf, label: { x: r0 - 40, y: rf + 34, a: "end" } },
  { id: "P", path: ".--.", shape: "dot",  orient: "v", x: r1, y: rf, label: { x: r1 + 46, y: rf + 12, a: "start" } },
  { id: "J", path: ".---", shape: "dash", orient: "v", x: r0, y: rg, label: { x: r0 + 40, y: rg + 34, a: "start" } }
];

/**
 * White PCB traces, parent -> child. Each segment is extended ~4 px into
 * both pads so the join always reads as solid.
 * Siblings that touch in the photo (O-M-T, E-I-S-H, Y-K, W-J) need none.
 */
export const TRACES = [
  // root
  { x1: 305, y1: ra, x2: 334, y2: ra },   // root -> T
  { x1: 326, y1: ra, x2: 368, y2: ra },   // root -> E
  { x1: ROOT.x, y1: ROOT.iconBottom, x2: ROOT.x, y2: ra },  // icon stem

  // left branch
  { x1: l1, y1: 196, x2: l1, y2: 236 },   // M -> G
  { x1: 121, y1: rb, x2: 142, y2: rb },   // G -> Q
  { x1: l1, y1: 294, x2: l1, y2: 323 },   // G -> Z
  { x1: l2, y1: 196, x2: l2, y2: 429 },   // T -> N
  { x1: 213, y1: rd, x2: 234, y2: rd },   // N -> K
  { x1: l1, y1: 482, x2: l1, y2: 526 },   // K -> C
  { x1: l2, y1: 487, x2: l2, y2: 621 },   // N -> D
  { x1: 213, y1: rf, x2: 234, y2: rf },   // D -> X
  { x1: l2, y1: 679, x2: l2, y2: 713 },   // D -> B

  // right branch
  { x1: r0, y1: 201, x2: r0, y2: 416 },   // E -> A
  { x1: 421, y1: rd, x2: 438, y2: rd },   // A -> R
  { x1: 496, y1: rd, x2: 508, y2: rd },   // R -> L
  { x1: r0, y1: 500, x2: r0, y2: 608 },   // A -> W
  { x1: 421, y1: rf, x2: 438, y2: rf },   // W -> P
  { x1: r1, y1: 201, x2: r1, y2: 223 },   // I -> U
  { x1: r1, y1: 307, x2: r1, y2: 323 },   // U -> F
  { x1: r2, y1: 201, x2: r2, y2: 223 }    // S -> V
];

/** Resolve a pad's drawable geometry. */
export function padGeometry(pad) {
  if (pad.shape === "dot") {
    return { type: "circle", cx: pad.x, cy: pad.y, r: DOT_R };
  }
  const w = pad.orient === "h" ? DASH_L : DASH_S;
  const h = pad.orient === "h" ? DASH_S : DASH_L;
  return { type: "rect", x: pad.x - w / 2, y: pad.y - h / 2, w, h };
}

const SVG_NS = "http://www.w3.org/2000/svg";

/** Create an SVG element with attributes (null/undefined values are skipped). */
export function svgEl(name, attrs = {}) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== null && value !== undefined) el.setAttribute(key, String(value));
  }
  return el;
}
