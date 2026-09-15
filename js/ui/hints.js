"use strict";

/**
 * hints.js — the Morse code chart as a NON-modal drawer on the left of the
 * trainer page (Settings → Show hints). It stays open while the user keys,
 * so the key must remain live; nothing here steals focus. Esc, the × or the
 * scrim (narrow screens only) close it. The markup lives in index.html.
 */

import { LETTERS, DIGITS } from "../morse/chart.js";
import { spokenPath } from "../morse/tree.js";

/** <span class="chart-code" role="img" aria-label="dot dash"><i class="dot"></i><i class="dash"></i></span> */
function symbols(code) {
  const s = document.createElement("span");
  s.className = "chart-code";
  s.setAttribute("role", "img");
  s.setAttribute("aria-label", spokenPath(code));
  for (const c of code) {
    const i = document.createElement("i");
    i.className = c === "." ? "dot" : "dash";
    s.appendChild(i);
  }
  return s;
}

function fill(ul, entries) {
  for (const e of entries) {
    const li = document.createElement("li");
    const sym = document.createElement("span");
    sym.className = "chart-sym";
    sym.textContent = e.sym;
    li.append(sym, symbols(e.code));
    ul.appendChild(li);
  }
}

/**
 * opts: { drawer, scrim, openBtn, closeBtn, initialOpen, onChange(open) }
 */
export function bindHints(opts) {
  const drawer = opts.drawer, scrim = opts.scrim, openBtn = opts.openBtn, closeBtn = opts.closeBtn;

  fill(drawer.querySelector("#chart-letters-a"), LETTERS.slice(0, 13));   // A–M
  fill(drawer.querySelector("#chart-letters-b"), LETTERS.slice(13));      // N–Z
  fill(drawer.querySelector("#chart-digits-a"), DIGITS.slice(0, 5));      // 1–5
  fill(drawer.querySelector("#chart-digits-b"), DIGITS.slice(5));         // 6–0

  let open = false;

  function apply(next, notify) {
    open = !!next;
    drawer.classList.toggle("open", open);
    drawer.inert = !open;                       // closed = not focusable, not read out
    scrim.hidden = !open;
    document.body.classList.toggle("chart-open", open);
    openBtn.setAttribute("aria-expanded", open ? "true" : "false");
    openBtn.textContent = open ? "Hide hints" : "Show hints";
    if (notify && opts.onChange) opts.onChange(open);
  }

  openBtn.addEventListener("click", () => {
    apply(!open, true);
    openBtn.blur();          // so the next Space keys the card instead of re-toggling the button
  });
  closeBtn.addEventListener("click", () => { apply(false, true); closeBtn.blur(); });
  scrim.addEventListener("click", () => apply(false, true));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) apply(false, true);
  });

  apply(!!opts.initialOpen, false);

  return {
    isOpen() { return open; },
    open() { apply(true, true); },
    close() { apply(false, true); }
  };
}
