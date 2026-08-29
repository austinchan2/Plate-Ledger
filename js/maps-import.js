// Plate Ledger — Phase 8: parse a pasted (or Shortcut-forwarded) Google Maps
// / Apple Maps share link, or raw "lat, lng" text, into a name + coordinates
// for the Add-restaurant form's "Paste from Maps" flow (js/restaurant-form.js)
// and the `?import=` URL hand-off from the companion iOS Shortcut (js/app.js).
//
// Pure client-side text/URL parsing only — no network calls in this file.
// Real-world constraint this is built around: a *shortened* share link
// (maps.app.goo.gl/..., or an Apple "maps.apple" link with no ".com") is an
// opaque code with no coordinates in it — the real destination only comes
// back as an HTTP redirect, and this app's own JS can't follow a cross-
// origin redirect and read where it landed (CORS) from a static site with
// no backend of its own. Long-form links (the ones with @lat,lng or
// coordinate=/ll= already in them) don't have that problem, which is what
// this module actually extracts from. The companion iOS Shortcut handles
// the short-link case by expanding it with Shortcuts' own "Expand URL"
// action (full OS-level network access, no CORS) before ever handing a URL
// to Plate Ledger — see PROGRESS.md's Phase 8 section for the setup steps.
//
// Formats handled (confirmed against Google's and Apple's own URL docs,
// 2026-08-29):
//   Google — long share/place links: .../maps/place/<name>/@<lat>,<lng>,<z>z/
//     data=...!3d<lat>!4d<lng>...  (the !3d/!4d pair, when present, is the
//     precise pin location — preferred over the @lat,lng, which is just
//     wherever the map was centered/zoomed when the link was made).
//   Google — official "api=1" links: .../maps/search/?api=1&query=<lat>,<lng>
//     or &query=<name>; also the older bare ?q=<lat>,<lng>|<name>.
//   Google — short links: maps.app.goo.gl/..., goo.gl/maps/... (no
//     coordinates in the URL itself — flagged as reason: "short-link").
//   Apple — unified Maps URLs (iOS 18.4+): .../place?coordinate=<lat>,<lng>
//     &address=<addr>&name=<name>; .../frame?center=<lat>,<lng>.
//   Apple — classic Maps URL scheme (still widely generated): ?ll=<lat>,<lng>
//     &q=<name>&address=<addr>.
//   Apple — short links: a host that is exactly "maps.apple" (no ".com" —
//     Apple's own docs confirm this is how to tell a shortened Apple Maps
//     link apart from a full one) — flagged as reason: "short-link".
//   Plain text: "<lat>, <lng>" on its own, e.g. copied from a map app's
//     info panel.

var PlateLedgerMapsImport = (function () {
  "use strict";

  function isLatLng(lat, lng) {
    return (
      typeof lat === "number" &&
      typeof lng === "number" &&
      isFinite(lat) &&
      isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  function parseCoordPair(text) {
    if (!text) return null;
    var m = text.trim().match(/^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
    if (!m) return null;
    var lat = parseFloat(m[1]);
    var lng = parseFloat(m[2]);
    return isLatLng(lat, lng) ? { lat: lat, lng: lng } : null;
  }

  // Google's /maps/place/<name>/... segment: '+' means space here (it's
  // path-encoded the same way a query string would be, just not actually in
  // the query string), so undo both that and the usual %-escaping.
  function extractGoogleName(pathname) {
    var m = pathname.match(/\/maps\/place\/([^/]+)/);
    if (!m) return null;
    var raw = m[1].replace(/\+/g, " ");
    try {
      raw = decodeURIComponent(raw);
    } catch (e) {
      // leave partially-decoded rather than throw on a malformed escape
    }
    raw = raw.trim();
    return raw || null;
  }

  function parseGoogle(url, rawText) {
    var pin = rawText.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    var center = rawText.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    var queryParam = url.searchParams.get("query") || url.searchParams.get("q");
    var queryCoords = queryParam ? parseCoordPair(queryParam) : null;

    var lat, lng;
    if (pin) {
      lat = parseFloat(pin[1]);
      lng = parseFloat(pin[2]);
    } else if (center) {
      lat = parseFloat(center[1]);
      lng = parseFloat(center[2]);
    } else if (queryCoords) {
      lat = queryCoords.lat;
      lng = queryCoords.lng;
    }
    if (!isLatLng(lat, lng)) return null;

    var name = extractGoogleName(url.pathname);
    if (!name && queryParam && !queryCoords) name = queryParam.trim();

    return { lat: lat, lng: lng, name: name || null, address: null };
  }

  function parseApple(url) {
    var coordParam =
      url.searchParams.get("coordinate") || // unified Maps URLs (iOS 18.4+)
      url.searchParams.get("center") ||
      url.searchParams.get("ll"); // classic Maps URL scheme
    var coords = coordParam ? parseCoordPair(coordParam) : null;
    if (!coords) return null;

    var name = url.searchParams.get("name") || url.searchParams.get("q");
    var address = url.searchParams.get("address");

    return {
      lat: coords.lat,
      lng: coords.lng,
      name: name ? name.trim() : null,
      address: address ? address.trim() : null,
    };
  }

  var GOOGLE_SHORT_HOSTS = { "maps.app.goo.gl": 1, "goo.gl": 1, "app.goo.gl": 1 };

  function isGoogleShortLink(host) {
    return !!GOOGLE_SHORT_HOSTS[host];
  }

  // Apple's own "Adopting unified Maps URLs" doc: a shortened Apple Maps
  // link's host always ends in "maps.apple" with no ".com" — that's the
  // one reliable signal (the path/query on a short link is an opaque code,
  // not something to pattern-match).
  function isAppleShortLink(host) {
    return host === "maps.apple" || host.slice(-11) === ".maps.apple";
  }

  function isGoogleHost(host) {
    return host === "google.com" || host.slice(-11) === ".google.com" || host === "goo.gl" || host === "app.goo.gl" || host === "maps.app.goo.gl";
  }

  function isAppleHost(host) {
    return host === "maps.apple.com" || host === "maps.apple";
  }

  // Main entry point. `input` is whatever the user pasted (a full link, a
  // link with surrounding text, or raw "lat, lng"). Returns one of:
  //   { ok: true, lat, lng, name, address }   -- usable location found
  //   { ok: false, reason: "short-link", url } -- needs expanding first
  //   { ok: false, reason: "unrecognized" }
  //   { ok: false, reason: "empty" }
  function parse(input) {
    var text = (input || "").trim();
    if (!text) return { ok: false, reason: "empty" };

    var plain = parseCoordPair(text);
    if (plain) return { ok: true, lat: plain.lat, lng: plain.lng, name: null, address: null };

    var urlMatch = text.match(/https?:\/\/\S+/);
    if (!urlMatch) return { ok: false, reason: "unrecognized" };

    var url;
    try {
      url = new URL(urlMatch[0]);
    } catch (e) {
      return { ok: false, reason: "unrecognized" };
    }
    var host = url.hostname.toLowerCase();

    var result = null;
    if (isGoogleHost(host)) result = parseGoogle(url, text);
    else if (isAppleHost(host)) result = parseApple(url);

    if (result) {
      return {
        ok: true,
        lat: result.lat,
        lng: result.lng,
        name: result.name,
        address: result.address,
      };
    }

    if (isGoogleShortLink(host) || isAppleShortLink(host)) {
      return { ok: false, reason: "short-link", url: url.href };
    }

    return { ok: false, reason: "unrecognized" };
  }

  return { parse: parse };
})();
