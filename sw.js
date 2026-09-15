"use strict";

/*
 * sw.js — optional service worker so the card works offline after the
 * first load (SRD §7). Registration is guarded in main.js; if this file is
 * missing or fails to install, the app is unaffected.
 *
 * Strategy: NETWORK FIRST, bypassing the HTTP cache, with the shell cache as
 * the offline fallback. (SRD §8 said "cache-first"; that served stale files
 * while editing, so it was changed — see CLAUDE.md.) A normal reload always
 * shows the files as they are on disk; offline still works.
 *
 * Bump CACHE_NAME whenever SHELL changes.
 */

const CACHE_NAME = "morse-card-v9";

const SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./js/main.js",
  "./js/layout.js",
  "./js/audio.js",
  "./js/store.js",
  "./js/morse/tree.js",
  "./js/morse/chart.js",
  "./js/morse/decoder.js",
  "./js/morse/timing.js",
  "./js/ui/card.js",
  "./js/ui/controls.js",
  "./js/ui/strip.js",
  "./js/ui/hints.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // cache: "reload" = fetch from the server, never from the HTTP cache.
      .then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req.url, { cache: "no-store", credentials: "same-origin" })
      .then((res) => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || Response.error()))
  );
});
