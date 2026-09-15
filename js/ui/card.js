"use strict";

/**
 * card.js — builds the SVG card face from layout.js and exposes the
 * handful of state changes the app needs. No timers here: everything
 * time-based is either a self-terminating CSS animation (class removed on
 * animationend) or driven by main.js through the decoder's effects.
 */

import {
  VIEW_W, VIEW_H, PADS, TRACES, ROOT, TITLE, LANYARD, KEY,
  padGeometry, svgEl
} from "../layout.js";
import { spokenPath, glyphPath } from "../morse/tree.js";

export function buildCard(svg) {
  svg.setAttribute("viewBox", "0 0 " + VIEW_W + " " + VIEW_H);

  const padEls = Object.create(null);
  let activateHandler = null;

  /* ---------- frame ---------- */
  const frame = svgEl("g", { class: "frame" });
  frame.appendChild(svgEl("rect", { class: "frame-gold", x: 0, y: 0, width: VIEW_W, height: VIEW_H, rx: 30, ry: 30 }));
  frame.appendChild(svgEl("rect", { class: "frame-pcb", x: 12, y: 12, width: VIEW_W - 24, height: VIEW_H - 24, rx: 22, ry: 22 }));
  svg.appendChild(frame);

  /* ---------- lanyard hole ---------- */
  const lan = svgEl("g", { class: "lanyard", "aria-hidden": "true" });
  lan.appendChild(svgEl("circle", { class: "ring", cx: LANYARD.cx, cy: LANYARD.cy, r: LANYARD.ring }));
  lan.appendChild(svgEl("circle", { class: "hole", cx: LANYARD.cx, cy: LANYARD.cy, r: LANYARD.hole }));
  svg.appendChild(lan);

  /* ---------- title ---------- */
  const title = svgEl("g", { class: "title", "aria-hidden": "true" });
  for (const t of [TITLE.left, TITLE.right]) {
    const el = svgEl("text", { x: t.x, y: t.y, "text-anchor": "middle" });
    el.textContent = t.text;
    title.appendChild(el);
  }
  svg.appendChild(title);

  /* ---------- traces ---------- */
  const traces = svgEl("g", { class: "traces", "aria-hidden": "true" });
  for (const s of TRACES) traces.appendChild(svgEl("line", { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 }));
  svg.appendChild(traces);

  /* ---------- root icon (telegraph key / antenna) ---------- */
  const rootG = svgEl("g", { class: "root", id: "pad-root", "aria-hidden": "true" });
  const cx = ROOT.x, top = ROOT.iconTop;
  rootG.appendChild(svgEl("polygon", {
    class: "dish",
    points: [cx - 30, top + 6, cx + 30, top + 6, cx + 9, top + 48, cx - 9, top + 48].join(" ")
  }));
  rootG.appendChild(svgEl("line", { class: "mast", x1: cx, y1: top + 48, x2: cx, y2: ROOT.iconBottom + 2 }));
  rootG.appendChild(svgEl("line", { class: "bar", x1: cx - 14, y1: top + 66, x2: cx + 14, y2: top + 66 }));
  rootG.addEventListener("animationend", () => rootG.classList.remove("pulse"));
  svg.appendChild(rootG);

  /* ---------- red tactile key (before the pads: first tab stop) ---------- */
  const keyG = svgEl("g", {
    class: "key",
    id: "key",
    role: "button",
    tabindex: 0,
    "aria-label": "Morse key. Press and hold, or hold the Space bar."
  });
  // "((" and "))" sound-wave arcs: a quadratic curve bulging away from the key on each side.
  const arc = (x, bulge) => `M ${x} ${KEY.cy - 22} Q ${x + bulge} ${KEY.cy} ${x} ${KEY.cy + 22}`;
  for (const offset of KEY.waveOffsets) {
    keyG.appendChild(svgEl("path", { class: "wave", d: arc(KEY.cx - offset, -14) }));
    keyG.appendChild(svgEl("path", { class: "wave", d: arc(KEY.cx + offset, 14) }));
  }
  keyG.appendChild(svgEl("rect", {
    class: "base",
    x: KEY.cx - KEY.baseW / 2, y: KEY.cy - KEY.baseH / 2,
    width: KEY.baseW, height: KEY.baseH, rx: KEY.baseR, ry: KEY.baseR
  }));
  keyG.appendChild(svgEl("rect", {
    class: "base-inner",
    x: KEY.cx - KEY.baseW / 2 + 10, y: KEY.cy - KEY.baseH / 2 + 10,
    width: KEY.baseW - 20, height: KEY.baseH - 20, rx: 4, ry: 4
  }));
  keyG.appendChild(svgEl("circle", { class: "cap-shadow", cx: KEY.cx, cy: KEY.cy + 3, r: KEY.capR }));
  keyG.appendChild(svgEl("circle", { class: "cap", cx: KEY.cx, cy: KEY.cy, r: KEY.capR }));
  keyG.appendChild(svgEl("circle", { class: "cap-hi", cx: KEY.cx - 8, cy: KEY.cy - 9, r: 8 }));
  svg.appendChild(keyG);

  /* ---------- pads ---------- */
  const padsG = svgEl("g", { class: "pads" });
  for (const pad of PADS) {
    const g = svgEl("g", {
      class: "pad",
      "data-id": pad.id,
      role: "button",
      tabindex: 0,
      "aria-label": pad.id + ", " + spokenPath(pad.path)
    });

    const geo = padGeometry(pad);
    const shape = geo.type === "circle"
      ? svgEl("circle", { class: "shape", cx: geo.cx, cy: geo.cy, r: geo.r })
      : svgEl("rect", { class: "shape", x: geo.x, y: geo.y, width: geo.w, height: geo.h, rx: 3, ry: 3 });
    g.appendChild(shape);

    const label = svgEl("text", { class: "label", x: pad.label.x, y: pad.label.y, "text-anchor": pad.label.a });
    label.textContent = pad.id;
    g.appendChild(label);

    const hp = pad.hint || { x: pad.label.x, y: pad.label.y + 17, a: pad.label.a };
    const hint = svgEl("text", { class: "hint", x: hp.x, y: hp.y, "text-anchor": hp.a });
    hint.textContent = glyphPath(pad.path);
    g.appendChild(hint);

    // Self-terminating animations drop their class when they finish.
    shape.addEventListener("animationend", () => g.classList.remove("pulse", "err"));

    const activate = (ev) => {
      ev.preventDefault();
      if (activateHandler) activateHandler(pad.id, pad.path);
    };
    g.addEventListener("click", activate);
    g.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") activate(ev);
    });

    padsG.appendChild(g);
    padEls[pad.id] = g;
  }
  svg.appendChild(padsG);

  /* ---------- api ---------- */
  function setLit(ids) {
    const want = new Set(ids);
    for (const id in padEls) padEls[id].classList.toggle("lit", want.has(id));
  }

  function clearAll() {
    for (const id in padEls) padEls[id].classList.remove("lit", "pulse", "err");
    rootG.classList.remove("pulse");
  }

  function pulse(id) {
    const g = padEls[id];
    if (!g) return;
    g.classList.remove("pulse");
    void g.getBoundingClientRect();   // restart the animation if it is mid-flight
    g.classList.add("pulse");
  }

  function rootPulse() {
    rootG.classList.remove("pulse");
    void rootG.getBoundingClientRect();
    rootG.classList.add("pulse");
  }

  function errorFlash(ids) {
    for (const id of ids) {
      const g = padEls[id];
      if (!g) continue;
      g.classList.remove("err");
      void g.getBoundingClientRect();
      g.classList.add("err");
    }
  }

  function setKeyPressed(on) { keyG.classList.toggle("pressed", !!on); }
  /** Live hold feedback on the key: null | "dot" | "dash" (arcs turn LED green at the dash threshold). */
  function setHold(kind) {
    keyG.classList.toggle("hold-dot", kind === "dot");
    keyG.classList.toggle("hold-dash", kind === "dash");
  }
  function setHints(on) { svg.classList.toggle("hints-off", !on); }
  function setPowered(on) {
    svg.classList.toggle("off", !on);
    for (const id in padEls) padEls[id].setAttribute("aria-disabled", on ? "false" : "true");
    keyG.setAttribute("aria-disabled", on ? "false" : "true");
  }
  function setBusy(on) { svg.classList.toggle("busy", !!on); }
  function onPadActivate(fn) { activateHandler = fn; }

  return { setLit, clearAll, pulse, rootPulse, errorFlash, setKeyPressed, setHold, setHints, setPowered, setBusy, onPadActivate, keyEl: keyG };
}
