"use strict";

/**
 * controls.js — the settings panel and transport bar (SRD §5.6, plus the
 * post-SRD DEL button and DASH ≥ slider).
 * Binds DOM events to a handler map and returns setters so main.js can
 * reflect state back without touching the DOM itself.
 */

/** Paint the filled part of a range track (style.css reads --pct). */
function paint(range) {
  const min = Number(range.min), max = Number(range.max), v = Number(range.value);
  const pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
  range.style.setProperty("--pct", pct.toFixed(1) + "%");
}

export function bindControls(rootEl, h) {
  const $ = (id) => rootEl.querySelector("#" + id);

  const power = $("ctl-power");
  const mute = $("ctl-mute");
  const hints = $("ctl-hints");
  const rec = $("ctl-rec");
  const play = $("ctl-play");
  const del = $("ctl-del");
  const clear = $("ctl-clear");
  const t = $("ctl-t");
  const tOut = $("ctl-t-out");
  const ratio = $("ctl-ratio");
  const ratioOut = $("ctl-ratio-out");
  const ratioMs = $("ctl-ratio-ms");
  const hz = $("ctl-hz");
  const hzOut = $("ctl-hz-out");

  power.addEventListener("change", () => h.onPower(power.checked));
  mute.addEventListener("change", () => h.onMute(mute.checked));
  hints.addEventListener("change", () => h.onHints(hints.checked));

  rec.addEventListener("click", () => h.onRec());
  play.addEventListener("click", () => h.onPlay());
  del.addEventListener("click", () => h.onDelete());
  clear.addEventListener("click", () => h.onClear());

  t.addEventListener("input", () => {
    tOut.value = t.value;
    paint(t);
    h.onT(Number(t.value));
  });
  ratio.addEventListener("input", () => {
    paint(ratio);
    h.onDashRatio(Number(ratio.value));
  });
  hz.addEventListener("input", () => {
    hzOut.value = hz.value;
    paint(hz);
    h.onFreq(Number(hz.value));
  });

  return {
    setPower(on) { power.checked = !!on; },
    setMute(on) { mute.checked = !!on; },
    setHints(on) { hints.checked = !!on; },
    setT(v) { t.value = String(v); tOut.value = String(v); paint(t); },
    setFreq(v) { hz.value = String(v); hzOut.value = String(v); paint(hz); },

    /** Dash threshold slider + its readouts ("2.00×T = 300 ms"). */
    setDashInfo(r, ms) {
      ratio.value = String(r);
      ratioOut.value = Number(r).toFixed(2);
      ratioMs.value = String(ms);
      paint(ratio);
    },

    /** REC indicator + enablement. */
    setRec(active) {
      rec.setAttribute("aria-pressed", active ? "true" : "false");
      rec.setAttribute("aria-label", active ? "Stop recording" : "Record");
    },
    setRecEnabled(en) { rec.disabled = !en; },

    /** mode: "play" | "stop". */
    setPlay(mode, enabled) {
      const stop = mode === "stop";
      play.textContent = stop ? "STOP" : "PLAY";
      play.classList.toggle("stop", stop);
      play.disabled = !enabled;
    },

    /** DEL and CLEAR act on the strip: enabled only when there is text to edit. */
    setEditEnabled(en) {
      del.disabled = !en;
      clear.disabled = !en;
    }
  };
}
