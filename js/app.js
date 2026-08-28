// Plate Ledger — map bootstrap.
// Owns the Leaflet map instance and the iOS touch guards. Pins, the detail
// sheet, and the list all hang off window.PlateLedgerMap (set below) rather
// than each creating their own map. Search/filter and Apple Maps handoff
// land in later phases.

(function () {
  "use strict";

  // Phase 3: even with `overflow: hidden` + `overscroll-behavior: none` +
  // pinning `body` to a fixed full-viewport box (see css/styles.css), this
  // installed PWA still lets a single tap trigger a few pixels of iOS's
  // elastic "rubber-band" bounce, which is enough to reveal blank space at
  // an edge (reported as a bottom white bar reappearing on any tap) before
  // it snaps back. CSS alone isn't stopping it here, so block the browser's
  // native handling of any touchmove that starts outside a panel that's
  // actually meant to scroll (Add/Edit form, List panel, and the address
  // search results dropdown all use native `overflow-y: auto` scrolling and
  // need their default touch behavior left alone).
  var NATIVE_SCROLL_SELECTOR = ".form-body, .list-body, .search-results";
  document.addEventListener(
    "touchmove",
    function (e) {
      if (!e.target.closest(NATIVE_SCROLL_SELECTOR)) {
        e.preventDefault();
      }
    },
    // capture: true — Leaflet's own controls (the zoom buttons in
    // particular) call stopPropagation() on their own touch handling to
    // keep taps on them from also reaching/dragging the map underneath.
    // A bubble-phase listener on `document` never sees those events once
    // stopped, which is exactly why the bottom bar was still reappearing
    // after tapping a control even with this guard in place. Capture-phase
    // listeners run on the way DOWN, before any descendant's
    // stopPropagation() can block them, so this now sees every touch
    // regardless of what Leaflet does with it afterward.
    { passive: false, capture: true }
  );

  // Small unobtrusive build marker (js/version.js) so Austin can glance at
  // the installed app and confirm a given push actually reached his phone.
  if (window.PLATE_LEDGER_BUILD) {
    var buildTag = document.createElement("div");
    buildTag.id = "build-version-tag";
    buildTag.textContent =
      "build " +
      window.PLATE_LEDGER_BUILD.number +
      " \u00b7 " +
      window.PLATE_LEDGER_BUILD.builtAt;
    document.body.appendChild(buildTag);
  }

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

  // Phase 4: everything else in the app (pins, detail sheet, list) needs the
  // one map instance, and needs a way to say "don't yank the view somewhere
  // else". suppressAutoCenter is set by the list when it focuses a specific
  // restaurant — a late geolocation fix shouldn't drag the view off the pin
  // the user just asked to see.
  window.PlateLedgerMap = {
    map: map,
    suppressAutoCenter: false,
    userPosition: null, // {lat, lng, accuracy}, once we have a fix
  };

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Opening view: **the user's current location wins** (Austin's call,
  // 2026-08-28). He'll have restaurants saved all over the place, so an
  // opening view fitted to every saved pin would zoom out to a useless
  // continent-wide view; what he actually wants first is "what's near me."
  // The pin layer only falls back to fitting the saved pins if we never get
  // a fix (see the locatefailed event below).
  //
  // watchPosition rather than getCurrentPosition so the blue "you are here"
  // dot keeps up as he moves. Only the FIRST fix recenters the map — after
  // that, moving around shouldn't yank the view out from under him while
  // he's panning.
  var didInitialLocate = false;

  function onLocated(pos) {
    var coords = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
    window.PlateLedgerMap.userPosition = coords;
    window.dispatchEvent(new CustomEvent("plateledger:located", { detail: coords }));

    if (didInitialLocate) return;
    didInitialLocate = true;
    if (window.PlateLedgerMap.suppressAutoCenter) return;
    map.setView([coords.lat, coords.lng], LOCATED_ZOOM);
  }

  function onLocateFailed() {
    // Permission denied, unavailable, or timed out. Tell the pin layer it can
    // use its fallback (fit to saved restaurants) instead of leaving Austin
    // staring at a zoomed-out map of the continental US.
    if (didInitialLocate) return; // already had a fix; a later error is noise
    window.dispatchEvent(new CustomEvent("plateledger:locatefailed"));
  }

  if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition(onLocated, onLocateFailed, {
      timeout: 8000,
      maximumAge: 30000,
      enableHighAccuracy: false,
    });
  } else {
    onLocateFailed();
  }
})();
