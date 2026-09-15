"use strict";

/**
 * tree.js — the static decoding tree (SRD §4.1).
 *
 * The tree is the source of truth, not string lookup: decoding walks one
 * step per symbol, so an unreachable step is detectable the moment it
 * happens rather than after the whole path is assembled.
 *
 * Node: { letter: string|null, padId: string, dot: Node|null, dash: Node|null }
 */

/** Path -> letter. Letters only, A-Z. Anything absent here is invalid. */
export const TABLE = {
  ".": "E",
  "..": "I",
  "...": "S",
  "....": "H",
  ".-": "A",
  ".-.": "R",
  ".-..": "L",
  ".--": "W",
  ".--.": "P",
  ".---": "J",
  "..-": "U",
  "..-.": "F",
  "...-": "V",
  "-": "T",
  "--": "M",
  "---": "O",
  "-.": "N",
  "-..": "D",
  "-...": "B",
  "-..-": "X",
  "-.-": "K",
  "-.--": "Y",
  "-.-.": "C",
  "--.": "G",
  "--.-": "Q",
  "--..": "Z"
};

const DOT = ".";

const makeNode = (padId) => ({ letter: null, padId, dot: null, dash: null });

/** The root — the telegraph-key icon on the card. Holds no letter. */
export const root = makeNode("root");

const pathByLetter = Object.create(null);

// Build the tree shortest-path-first so every prefix already exists.
for (const path of Object.keys(TABLE).sort((a, b) => a.length - b.length)) {
  const letter = TABLE[path];
  let node = root;
  for (let i = 0; i < path.length; i++) {
    const branch = path[i] === DOT ? "dot" : "dash";
    if (!node[branch]) node[branch] = makeNode(TABLE[path.slice(0, i + 1)]);
    node = node[branch];
  }
  node.letter = letter;
  node.padId = letter;
  pathByLetter[letter] = path;
}

/** One step down the tree. Returns null when the child does not exist. */
export function step(node, symbol) {
  if (!node) return null;
  if (symbol === ".") return node.dot;
  if (symbol === "-") return node.dash;
  return null;
}

/** Walk a whole path from the root. Returns null if any step is invalid. */
export function nodeForPath(path) {
  let node = root;
  for (const symbol of path) {
    node = step(node, symbol);
    if (!node) return null;
  }
  return node;
}

/** Path -> letter, or null when the path is not a letter on this card. */
export function letterForPath(path) {
  const node = nodeForPath(path);
  return node && node.letter ? node.letter : null;
}

/** Letter -> path, or null. */
export function pathForLetter(letter) {
  return pathByLetter[String(letter).toUpperCase()] || null;
}

/**
 * Pad ids lit along a path, root excluded.
 * "-.--" -> ["T", "N", "K", "Y"] — this is what makes path lighting work:
 * lighting Y naturally means T, N and K are lit too.
 */
export function padsForPath(path) {
  const pads = [];
  let node = root;
  for (const symbol of path) {
    node = step(node, symbol);
    if (!node) break;
    pads.push(node.padId);
  }
  return pads;
}

/** All 26 letters, alphabetical. */
export const LETTERS = Object.keys(pathByLetter).sort();

/** Spoken form of a path, for aria-labels: ".-" -> "dot dash". */
export function spokenPath(path) {
  return [...path].map((s) => (s === DOT ? "dot" : "dash")).join(" ");
}

/** Glyph form of a path, for the on-card hints: ".-" -> "·–". */
export function glyphPath(path) {
  return [...path].map((s) => (s === DOT ? "·" : "–")).join("");
}
