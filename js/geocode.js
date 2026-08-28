// Plate Ledger — OpenStreetMap Nominatim search/geocode helper.
// Used by the Add/Edit form's address picker (REQUIREMENTS.md §9): search-first
// place lookup, with a manual-address-entry fallback that still geocodes
// through the same endpoint. No API key needed. Nominatim's usage policy asks
// for max ~1 request/sec — the search box in restaurant-form.js debounces
// keystrokes before calling this, and every call here is a plain, single
// request (no client-side batching/looping that could hammer the endpoint).
//
// Phase 7 additions (Austin, 2026-08-28 Phase 6 testing): both entry points
// accept an optional `opts.near = {lat, lng}` location hint (the map's
// current center, or a live GPS fix — see restaurant-form.js's
// locationHint()) used as a *soft* ranking bias via Nominatim's
// viewbox+bounded=0, which prefers nearby results without excluding
// legitimate matches farther away.
//
// Build 11 addition: geocodeAddress() now tries Nominatim's *structured*
// search (separate street/city/state/postalcode fields) before falling
// back to free text. Real bug this targets: "430 W 800 N, Orem, UT 84057"
// geocoded to three unrelated streets, none containing "800" at all —
// Nominatim's free-text parser was mis-tokenizing the address, most likely
// because it has TWO number+directional pairs in the street name itself
// (Utah/Mountain-West grid addressing: "430 W 800 N" = house number 430,
// on the street "West 800 North"). Structured search tells Nominatim
// definitively which text is the street vs. the city/state/zip instead of
// asking it to guess the boundaries from a single free-text blob, which is
// exactly the kind of address structured search exists to get right where
// free text struggles. See parseAddressComponents() below for exactly how
// the split is done, and its comments for what happens when it can't
// confidently split (falls straight back to the old free-text path).

var PlateLedgerGeocode = (function () {
  "use strict";

  var BASE_URL = "https://nominatim.openstreetmap.org";

  var US_STATE_CODES = {
    AL:1,AK:1,AZ:1,AR:1,CA:1,CO:1,CT:1,DE:1,FL:1,GA:1,HI:1,ID:1,IL:1,IN:1,IA:1,
    KS:1,KY:1,LA:1,ME:1,MD:1,MA:1,MI:1,MN:1,MS:1,MO:1,MT:1,NE:1,NV:1,NH:1,NJ:1,
    NM:1,NY:1,NC:1,ND:1,OH:1,OK:1,OR:1,PA:1,RI:1,SC:1,SD:1,TN:1,TX:1,UT:1,VT:1,
    VA:1,WA:1,WV:1,WI:1,WY:1,DC:1
  };

  var DIRECTION_WORDS = { N: "North", S: "South", E: "East", W: "West" };

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

  // Expand a standalone single-letter direction ("W", "N"...) to its full
  // word. Nominatim generally copes with USPS-style abbreviations fine on
  // their own, but the full word reads unambiguously in a structured
  // `street` field and can't be confused with an initial/unit letter.
  function expandDirection(token) {
    return DIRECTION_WORDS[token.toUpperCase()] || token;
  }

  // Split a manually-typed address into Nominatim's structured search
  // fields (street / city / state / postalcode / country) where we can
  // confidently tell them apart, so Nominatim doesn't have to guess the
  // boundary between street and city itself from one free-text string.
  // Deliberately conservative: any step that can't find a clean signal
  // (no ZIP, no recognizable state) just leaves that field out rather than
  // guessing wrong — geocodeAddress() below falls back to the old
  // free-text search if this whole approach comes up empty.
  function parseAddressComponents(raw) {
    var s = raw.trim();
    var country = null;

    // Strip a trailing "United States" / "USA" phrase.
    var countryMatch = s.match(/[,\s]+(united states of america|united states|usa|u\.s\.a\.?|us)\s*$/i);
    if (countryMatch) {
      country = "US";
      s = s.slice(0, countryMatch.index).trim();
    }

    // Trailing 5-digit ZIP (optionally +4).
    var postalcode = null;
    var zipMatch = s.match(/[,\s]*(\d{5})(?:-\d{4})?\s*$/);
    if (zipMatch) {
      postalcode = zipMatch[1];
      s = s.slice(0, zipMatch.index).trim();
    }

    // Trailing 2-letter US state code.
    var state = null;
    var stateMatch = s.match(/[,\s]+([A-Za-z]{2})\s*$/);
    if (stateMatch && US_STATE_CODES[stateMatch[1].toUpperCase()]) {
      state = stateMatch[1].toUpperCase();
      if (!country) country = "US"; // a real US state code implies country
      s = s.slice(0, stateMatch.index).trim();
    }
    s = s.replace(/,\s*$/, "").trim();

    if (!s) return null; // nothing left to call a street

    // Mountain-West/Utah-style grid addresses: "430 W 800 N" — a house
    // number, then TWO number+direction pairs (the street's own name is
    // itself a number+direction, e.g. "800 North"). This is the exact
    // pattern that was getting mis-tokenized as free text (see file
    // header) — pull it out explicitly so it becomes the `street` field
    // verbatim, and whatever's left after it is the city.
    var gridMatch = s.match(/^(\d+)\s*([NSEW])\.?\s+(\d+)\s*([NSEW])\.?\s*,?\s*(.*)$/i);
    var street, city;
    if (gridMatch) {
      street =
        gridMatch[1] + " " + expandDirection(gridMatch[2]) + " " +
        gridMatch[3] + " " + expandDirection(gridMatch[4]);
      city = gridMatch[5].replace(/^,\s*/, "").trim();
    } else {
      // Ordinary "street, city" — split on the last comma if there is one.
      var parts = s.split(",").map(function (p) { return p.trim(); }).filter(Boolean);
      if (parts.length >= 2) {
        city = parts[parts.length - 1];
        street = parts.slice(0, -1).join(", ");
      } else {
        street = s;
        city = "";
      }
    }

    var result = { street: street };
    if (city) result.city = city;
    if (state) result.state = state;
    if (postalcode) result.postalcode = postalcode;
    if (country) result.country = country;
    return result;
  }

  // Geocode a manually-typed address (manual-entry fallback per §9). Tries
  // a structured query first (see parseAddressComponents), falling back to
  // the old plain free-text query if that's not possible or comes back
  // empty. Returns up to 3 ranked candidates rather than a single guess —
  // see file header for why.
  function geocodeAddress(address, opts) {
    if (!address || !address.trim()) return Promise.resolve([]);
    opts = opts || {};
    var bias = biasParams(opts.near);
    var raw = address.trim();
    var structured = parseAddressComponents(raw);

    function freeText() {
      var params = Object.assign({ q: raw, limit: "3" }, bias);
      return request(params).then(function (results) {
        return results.map(normalizeResult);
      });
    }

    if (!structured) return freeText();

    var structuredParams = Object.assign({ limit: "3" }, structured, bias);
    return request(structuredParams).then(function (results) {
      if (results.length) return results.map(normalizeResult);
      return freeText();
    });
  }

  return {
    searchPlaces: searchPlaces,
    geocodeAddress: geocodeAddress,
    // exposed for debugging/testing only — not used elsewhere in the app.
    _parseAddressComponents: parseAddressComponents,
  };
})();
