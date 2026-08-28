// Plate Ledger — Phase 0: bare map, no data yet.
// Data model, storage, pins, search/filter, and Apple Maps handoff land in later phases.

(function () {
  "use strict";

  // Fallback center: roughly the middle of the contiguous US, zoomed way out.
  // If geolocation succeeds, we recenter on the user instead.
  var FALLBACK_CENTER = [39.8283, -98.5795];
  var FALLBACK_ZOOM = 4;
  var LOCATED_ZOOM = 13;

  var map = L.map("map", {
    // Default zoom control (top-left) collides with the List button, which
    // lives in that same corner — move it to bottom-left instead, the one
    // corner nothing else occupies (Settings is top-right, Add is
    // bottom-right).
    zoomControl: false,
    attributionControl: true,
  }).setView(FALLBACK_CENTER, FALLBACK_ZOOM);

  L.control.zoom({ position: "bottomleft" }).addTo(map);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Best-effort recenter on the user's current location. Silently falls back
  // to the default view if permission is denied or geolocation is unavailable
  // (e.g. first load over plain http on a local network).
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        map.setView([pos.coords.latitude, pos.coords.longitude], LOCATED_ZOOM);
      },
      function () {
        // permission denied / unavailable — keep fallback view
      },
      { timeout: 8000 }
    );
  }
})();
