// Solo service worker — PWA installability shell (ADR-025 Platform layer, 2026-06-11).
// Minimal by design: install/activate lifecycle + network passthrough fetch.
// No caching strategy yet; offline support is a later iteration. The fetch
// handler exists because installability heuristics expect one.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
