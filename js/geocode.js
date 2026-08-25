// Plate Ledger — Phase 2: OpenStreetMap Nominatim search/geocode helper.
// Used by the Add/Edit form's address picker (REQUIREMENTS.md §9): search-first
// place lookup, with a manual-address-entry fallback that still geocodes
// through the same endpoint. No API key needed. Nominatim's usage policy asks
// for max ~1 request/sec — the search box in restaurant-form.js debounces
// keystrokes before calling this, and every call here is a plain, single
// request (no client-side batching/looping that could hammer the endpoint).

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

  // Search by free-text name/query (search-first add flow). Returns an array
  // of normalized results for the user to pick from.
  function searchPlaces(query) {
    if (!query || !query.trim()) return Promise.resolve([]);
    return request({ q: query.trim(), limit: "8" }).then(function (results) {
      return results.map(normalizeResult);
    });
  }

  // Geocode a manually-typed address to a single best-match location
  // (manual-entry fallback per §9).
  function geocodeAddress(address) {
    if (!address || !address.trim()) return Promise.resolve(null);
    return request({ q: address.trim(), limit: "1" }).then(function (results) {
      return results.length ? normalizeResult(results[0]) : null;
    });
  }

  return {
    searchPlaces: searchPlaces,
    geocodeAddress: geocodeAddress,
  };
})();
