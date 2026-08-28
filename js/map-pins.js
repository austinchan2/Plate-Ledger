// Plate Ledger — Phase 4: map pins.
// Renders every saved restaurant as a marker, keeps that layer in sync with
// storage, and owns "focus this restaurant on the map" for the list panel.
// Pin design (Austin's call, 2026-08-28): rating-aware — a "Been" pin is a
// solid filled teardrop with its star rating printed right in it, so the map
// itself carries the verdict without tapping anything; a "Want to Go" pin is
// a hollow outlined teardrop with no number. That reads as two clearly
// different things at a glance and stays legible zoomed out, where a
// colour-only difference wouldn't.

var PlateLedgerPins = (function () {
  "use strict";

  var layer = null;
  var markersById = {};
  var userMarker = null;
  var didFallbackFit = false;
  var locateFailed = false;
  var lastPoints = [];

  function map() {
    return window.PlateLedgerMap && window.PlateLedgerMap.map;
  }

  function iconFor(r) {
    var been = r.status === PlateLedgerDB.STATUS.BEEN;
    // A "Been" entry without a rating yet still needs to read as "Been" —
    // a bullet keeps the filled pin from looking broken/empty.
    var label = been ? (r.rating ? String(r.rating) : "•") : "";
    var cls = "pl-pin " + (been ? "pl-pin-been" : "pl-pin-want");
    if (been && r.rating >= 4) cls += " pl-pin-high";
    return L.divIcon({
      className: "pl-pin-icon",
      html: '<div class="' + cls + '"><span>' + label + "</span></div>",
      // The pin element is a 30x30 box rotated -45deg, so its sharp corner
      // lands ~6px below the box — hence a 40px-tall icon and an anchor at
      // y=36 rather than the naive 30. Getting this wrong makes every pin
      // sit visibly off its actual coordinates.
      iconSize: [30, 40],
      iconAnchor: [15, 36],
    });
  }

  function fitTo(points) {
    var m = map();
    if (!m || !points.length) return;
    if (points.length === 1) {
      m.setView(points[0], 15);
    } else {
      m.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 15 });
    }
  }

  function render() {
    var m = map();
    if (!m) return Promise.resolve([]);
    if (!layer) layer = L.layerGroup().addTo(m);

    return PlateLedgerDB.getAllRestaurants().then(function (list) {
      layer.clearLayers();
      markersById = {};
      var points = [];

      list.forEach(function (r) {
        if (typeof r.lat !== "number" || typeof r.lng !== "number") return;
        var marker = L.marker([r.lat, r.lng], { icon: iconFor(r), title: r.name });
        marker.on("click", function () {
          PlateLedgerDetail.open(r);
        });
        marker.addTo(layer);
        markersById[r.id] = marker;
        points.push([r.lat, r.lng]);
      });

      lastPoints = points;
      // If geolocation already gave up before the pins finished loading,
      // this render is the first moment the fallback fit has anything to
      // fit to — hence the check here as well as in the event handler.
      if (locateFailed) maybeFallbackFit();
      // NOTE: no automatic fit-to-pins here. Geolocation wins the opening
      // view (Austin's call, 2026-08-28) — with restaurants saved across
      // many cities, fitting to all of them zooms out to something useless.
      // fitToAll() below is only called as a fallback when we never get a
      // location fix.
      return list;
    });
  }

  // Centre the map on one restaurant and open its detail sheet. Used by the
  // list panel so tapping a row lands you on the map at that pin.
  function focus(r) {
    var m = map();
    if (!m || typeof r.lat !== "number" || typeof r.lng !== "number") {
      PlateLedgerDetail.open(r);
      return;
    }
    // Stop a first geolocation fix arriving a moment later from dragging the
    // view off the restaurant Austin just asked to see.
    window.PlateLedgerMap.suppressAutoCenter = true;
    // Nudge the centre up a little: the detail sheet covers the bottom of
    // the screen, so a pin at the true centre would sit behind it.
    m.setView([r.lat, r.lng], Math.max(m.getZoom(), 15), { animate: true });
    m.panBy([0, 90], { animate: true });
    PlateLedgerDetail.open(r);
  }

  // "You are here" dot. Deliberately not a teardrop pin — it has to read as
  // "this is me", categorically different from a restaurant, at a glance.
  // Same visual language as Apple/Google Maps: a blue dot with a white ring.
  function renderUserDot(coords) {
    var m = map();
    if (!m) return;
    var icon = L.divIcon({
      className: "pl-userdot-icon",
      html: '<div class="pl-userdot"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    if (userMarker) {
      userMarker.setLatLng([coords.lat, coords.lng]);
      return;
    }
    userMarker = L.marker([coords.lat, coords.lng], {
      icon: icon,
      // Keep it under the restaurant pins: it's orientation, not a target.
      zIndexOffset: -1000,
      interactive: false,
    }).addTo(m);
  }

  // Fallback opening view for when geolocation never comes through (denied,
  // unavailable, or timed out): frame the saved restaurants rather than
  // leaving a zoomed-out map of the whole country.
  function maybeFallbackFit() {
    // Only give up on ever fitting once we've actually fitted something —
    // otherwise a locatefailed that beats the first DB read (geolocation
    // denied outright, or missing entirely) would consume the one chance
    // and leave the map parked on the zoomed-out fallback view forever.
    if (didFallbackFit || !lastPoints.length) return;
    didFallbackFit = true;
    fitTo(lastPoints);
  }

  document.addEventListener("DOMContentLoaded", function () {
    render();
    var m = map();
    if (m) {
      m.on("click", function () {
        PlateLedgerDetail.close();
      });
    }
    // A fix that arrived before this module was listening still needs drawing.
    if (window.PlateLedgerMap && window.PlateLedgerMap.userPosition) {
      renderUserDot(window.PlateLedgerMap.userPosition);
    }
  });

  window.addEventListener("plateledger:changed", function () {
    render();
  });

  window.addEventListener("plateledger:located", function (e) {
    renderUserDot(e.detail);
  });

  window.addEventListener("plateledger:locatefailed", function () {
    locateFailed = true;
    maybeFallbackFit();
  });

  return { render: render, focus: focus };
})();
