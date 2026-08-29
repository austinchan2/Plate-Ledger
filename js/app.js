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
  var NATIVE_SCROLL_SELECTOR =
    ".form-body, .list-body, .search-results, .detail-body, .filters-panel";
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

  // Build 11 switched from stock OSM raster tiles (road/label-heavy) to
  // CARTO's Positron basemap for a quieter look. Build 12: CARTO's
  // anonymous free tier started stamping tiles with a repeating
  // "API Key Required" watermark — their no-signup access apparently
  // changed since build 11. Switched again, to Esri's "Light Gray Canvas"
  // basemap (basemap layer + a separate label/reference layer on top,
  // which is how Esri's own docs say to use it) — same quiet, minimal
  // aesthetic, genuinely free with no key/signup for this volume of use.
  // Still worth knowing: this is the *second* "free, no key required" tile
  // host to change terms on us — if this one also breaks, the durable fix
  // is a real API key from a provider with a stable free tier (MapTiler,
  // Stadia, Esri's own developer account), not a third anonymous host.
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 16,
      attribution:
        "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
    }
  ).addTo(map);
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 16, pane: "overlayPane" }
  ).addTo(map);

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

  // Phase 7: jump-to-current-location button (Austin, 2026-08-28, during
  // Phase 6 testing) — recenters on demand, distinct from the one-time
  // opening-view auto-center above. Stacked directly above the Add FAB.
  var LOCATE_ICON_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="12" r="7"></circle>' +
    '<circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"></circle>' +
    '<line x1="12" y1="1.5" x2="12" y2="5"></line>' +
    '<line x1="12" y1="19" x2="12" y2="22.5"></line>' +
    '<line x1="1.5" y1="12" x2="5" y2="12"></line>' +
    '<line x1="19" y1="12" x2="22.5" y2="12"></line>' +
    "</svg>";

  function buildLocateButton() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "locate-btn";
    btn.setAttribute("aria-label", "Center on my location");
    btn.innerHTML = LOCATE_ICON_SVG;

    btn.onclick = function () {
      var pos = window.PlateLedgerMap.userPosition;
      if (!pos) {
        // No fix yet (or geolocation failed) — a quick nudge animation says
        // "nothing to jump to" without an intrusive alert().
        btn.classList.remove("locate-btn-nudge");
        // eslint-disable-next-line no-unused-expressions
        void btn.offsetWidth; // restart the animation if clicked again quickly
        btn.classList.add("locate-btn-nudge");
        return;
      }
      window.PlateLedgerMap.suppressAutoCenter = true;
      map.setView([pos.lat, pos.lng], Math.max(map.getZoom(), LOCATED_ZOOM), { animate: true });
    };

    document.body.appendChild(btn);

    window.addEventListener("plateledger:located", function () {
      btn.classList.add("locate-btn-active");
    });
  }

  document.addEventListener("DOMContentLoaded", buildLocateButton);

  // Build 12: manual "tap/pan the map to set the location" fallback for
  // addresses geocoding can't resolve precisely — see js/restaurant-form.js
  // for where this is offered. Uses the classic "drag the map under a fixed
  // crosshair" pattern (Google Maps' / Uber's drop-pin picker) rather than
  // tap-anywhere: much more precise on a small touchscreen (you can pinch-
  // zoom in first and nudge the map under your thumb, instead of trying to
  // land a fingertip exactly on target), and it needs no new map click
  // listener at all — the picked point is just map.getCenter() when
  // confirmed, so it can't conflict with the existing pin-click/map-click
  // handlers in js/map-pins.js.
  var pickBanner = null;
  var pickCrosshair = null;

  var CROSSHAIR_PIN_SVG =
    '<svg width="34" height="44" viewBox="0 0 34 44" fill="none">' +
    '<path d="M17 2c8.284 0 15 6.716 15 15 0 10-15 25-15 25S2 27 2 17C2 8.716 8.716 2 17 2z" ' +
    'fill="currentColor" stroke="#fff" stroke-width="2"/>' +
    '<circle cx="17" cy="17" r="5.5" fill="#fff"/>' +
    "</svg>";

  function enterPickMode(onPick, onCancel) {
    if (pickBanner) exitPickMode(); // guard against double-entry

    // Hide the other top-level entry points (Add/List/Settings) for the
    // duration: tapping Add while mid-pick would open a second, unrelated
    // form overlay on top of the map/banner and orphan this pick flow's
    // eventual callback against the wrong form. Simplest fix is to make
    // that combination unreachable rather than handle it after the fact.
    document.body.classList.add("pl-picking-location");

    pickCrosshair = document.createElement("div");
    pickCrosshair.id = "pick-location-crosshair";
    pickCrosshair.innerHTML = CROSSHAIR_PIN_SVG;
    document.body.appendChild(pickCrosshair);

    pickBanner = document.createElement("div");
    pickBanner.id = "pick-location-banner";
    var text = document.createElement("div");
    text.className = "pick-location-text";
    text.textContent = "Pan the map to position the pin";
    var cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "pick-location-cancel";
    cancelBtn.textContent = "Cancel";
    var confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "pick-location-confirm";
    confirmBtn.textContent = "Use this location";
    pickBanner.appendChild(text);
    pickBanner.appendChild(cancelBtn);
    pickBanner.appendChild(confirmBtn);
    document.body.appendChild(pickBanner);

    cancelBtn.onclick = function () {
      exitPickMode();
      if (onCancel) onCancel();
    };
    confirmBtn.onclick = function () {
      var center = map.getCenter();
      exitPickMode();
      onPick({ lat: center.lat, lng: center.lng });
    };
  }

  function exitPickMode() {
    document.body.classList.remove("pl-picking-location");
    if (pickBanner && pickBanner.parentNode) pickBanner.parentNode.removeChild(pickBanner);
    if (pickCrosshair && pickCrosshair.parentNode) pickCrosshair.parentNode.removeChild(pickCrosshair);
    pickBanner = null;
    pickCrosshair = null;
  }

  window.PlateLedgerMap.enterPickMode = enterPickMode;
  window.PlateLedgerMap.exitPickMode = exitPickMode;
})();
