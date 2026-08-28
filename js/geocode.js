// Plate Ledger — OpenStreetMap Nominatim search/geocode helper.
// Used by the Add/Edit form's address picker (REQUIREMENTS.md §9): search-first
// place lookup, with a manual-address-entry fallback that still geocodes
// through the same endpoint. No API key needed. Nominatim's usage policy asks
// for max ~1 request/sec — the search box in restaurant-form.js debounces
// keystrokes before calling this, and every call here is a plain, single
// request (no client-side batching/looping that could hammer the endpoint).
//
// Phase 7 additions (Austin, 2026-08-28 Phase 6 testing): both entry points
// now accept an optional `opts.near = {lat, lng}` location hint (the map's
// current center, or a live GPS fix — see restaurant-form.js's
// locationHint()) used as a *soft* ranking bias via Nominatim's
// viewbox+bounded=0, which prefers nearby results without excluding
// legitimate matches farther away. Two real bugs this addresses:
//   1. Add-restaurant name search ("5 Star BBQ" returning nothing) — also
//      gets a `layer=poi` pass first, since unrestricted free-text search
//      lets street/address matches crowd out the actual business; falls
//      back to an unfiltered retry if that comes back empty, since not
//      every real place is classified as a POI by Nominatim's layer filter.
//   2. Manual address entry geocoding a couple of blocks off ("430 W 800 N,
//      Orem") — geocodeAddress now returns up to 3 ranked candidates
//      instead of blindly trusting whichever Nominatim ranked first, and
//      restaurant-form.js shows them for Austin to pick from, the same way
//      name search already works. Grid-numbered addresses in particular
//      (Orem's "800 N" block system) are genuinely ambiguous as free text
//      across multiple towns that use the same numbering scheme — showing
//      the candidates is the honest fix; there's no way to guarantee a
//      single best match from a free-text address alone.

var PlateLedgerGeocode = (function () {
  "use strict";

  var BASE_URL = "https://nominatim.openstreetmap.org";

  // Pull a human town/city name out of Nominatim's address breakdown,
  // falling back through progressively broader fields since small towns
  // often only populate "village" or "county", not "city".
  function deriveTown(address) {
    if (!address) return "";
    return (
      address.city ||
      address.town ||
      address.village ||
      address.hamlet ||
      address.suburb ||
      address.county ||
      ""
    );
  }

  function normalizeResult(raw) {
    return {
      displayName: raw.display_name,
      lat: parseFloat(raw.lat),
      lng: parseFloat(raw.lon),
      town: deriveTown(raw.address),
    };
  }

  function request(params) {
    var query = Object.assign({ format: "jsonv2", addressdetails: "1" }, params);
    var qs = Object.keys(query)
      .map(function (k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(query[k]);
      })
      .join("&");
    return fetch(BASE_URL + "/search?" + qs, {
      headers: { Accept: "application/json" },
    }).then(function (res) {
      if (!res.ok) throw new Error("Nominatim request failed: " + res.status);
      return res.json();
    });
  }

  // A loose bounding box around `near`, plus bounded=0, so Nominatim treats
  // it as a soft "prefer stuff around here" ranking hint rather than a hard
  // filter that could hide a legitimate match outside the box (e.g. a
  // restaurant one town over). ~1 degree is a big, deliberately loose box
  // (on the order of 60-70 miles) — plenty to bias ranking without acting
  // like a real geofence.
  function biasParams(near) {
    if (!near || typeof near.lat !== "number" || typeof near.lng !== "number") return {};
    var d = 1.0;
    var minLon = near.lng - d;
    var maxLon = near.lng + d;
    var minLat = near.lat - d;
    var maxLat = near.lat + d;
    return {
      viewbox: [minLon, maxLat, maxLon, minLat].join(","),
      bounded: "0",
    };
  }

  // Search by free-text name/query (search-first add flow). Returns an array
  // of normalized results for the user to pick from.
  function searchPlaces(query, opts) {
    if (!query || !query.trim()) return Promise.resolve([]);
    opts = opts || {};
    var q = query.trim();
    var bias = biasParams(opts.near);
    var poiParams = Object.assign({ q: q, limit: "8", layer: "poi" }, bias);

    return request(poiParams).then(function (results) {
      if (results.length) return results.map(normalizeResult);
      // POI-layer filter came back empty — retry unrestricted rather than
      // tell Austin "no matches" when a real place just wasn't tagged in a
      // way the layer filter caught.
      var openParams = Object.assign({ q: q, limit: "8" }, bias);
      return request(openParams).then(function (fallback) {
        return fallback.map(normalizeResult);
      });
    });
  }

  // Geocode a manually-typed address (manual-entry fallback per §9). Returns
  // up to 3 ranked candidates rather than a single guess — see file header.
  function geocodeAddress(address, opts) {
    if (!address || !address.trim()) return Promise.resolve([]);
    opts = opts || {};
    var params = Object.assign(
      { q: address.trim(), limit: "3" },
      biasParams(opts.near)
    );
    return request(params).then(function (results) {
      return results.map(normalizeResult);
    });
  }

  return {
    searchPlaces: searchPlaces,
    geocodeAddress: geocodeAddress,
  };
})();
