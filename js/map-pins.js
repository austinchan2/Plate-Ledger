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
  var didInitialFit = false;

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

      if (!didInitialFit && points.length) {
        didInitialFit = true;
        // Saved restaurants are a better opening view than "wherever the
        // phone currently is" — tell app.js's geolocation callback to stand
        // down if it hasn't fired yet.
        window.PlateLedgerMap.suppressAutoCenter = true;
        fitTo(points);
      }
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
    window.PlateLedgerMap.suppressAutoCenter = true;
    // Nudge the centre up a little: the detail sheet covers the bottom of
    // the screen, so a pin at the true centre would sit behind it.
    m.setView([r.lat, r.lng], Math.max(m.getZoom(), 15), { animate: true });
    m.panBy([0, 90], { animate: true });
    PlateLedgerDetail.open(r);
  }

  document.addEventListener("DOMContentLoaded", function () {
    render();
    var m = map();
    if (m) {
      m.on("click", function () {
        PlateLedgerDetail.close();
      });
    }
  });

  window.addEventListener("plateledger:changed", function () {
    render();
  });

  return { render: render, focus: focus };
})();
