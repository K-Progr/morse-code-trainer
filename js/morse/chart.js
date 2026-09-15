"use strict";

/**
 * chart.js — data for the Morse code chart drawer (js/ui/hints.js).
 * Letters come from tree.js, so the chart can never disagree with the card.
 * Digits are reference-only: the trainer keys letters (SRD §10).
 */

import { TABLE, LETTERS as LETTER_LIST, pathForLetter } from "./tree.js";

/** A–Z, alphabetical. { sym, code } */
export const LETTERS = LETTER_LIST.map((sym) => ({ sym, code: pathForLetter(sym) }));

/** 1–9 then 0, as the standard lists them. { sym, code } */
export const DIGITS = [
  ["1", ".----"], ["2", "..---"], ["3", "...--"], ["4", "....-"], ["5", "....."],
  ["6", "-...."], ["7", "--..."], ["8", "---.."], ["9", "----."], ["0", "-----"]
].map(([sym, code]) => ({ sym, code }));

// Sanity: every letter code in the chart is a key of TABLE.
for (const { code } of LETTERS) {
  if (!(code in TABLE)) throw new Error("chart.js: letter code missing from tree TABLE: " + code);
}
