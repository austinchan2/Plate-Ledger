# Project Plan — Plate Ledger

This is the build plan for the first working version (v1). It's written so that a new chat in this project can pick it up directly — start there by reading README.md, REQUIREMENTS.md, and this file.

## Guiding constraints (do not violate)

- **iPhone-only, single-user, single-device.** No accounts, no multi-user, no Android.
- **No backend/server for data** — local on-device storage (IndexedDB) is the source of truth for v1.
- **Data survives every future update.** Any change to the app must never wipe, reset, or silently corrupt Austin's saved data (REQUIREMENTS.md §10a). Every phase below that touches the data model must include a migration path, not a reset.
- **Map framework does the map; Apple Maps does directions.** No custom routing.

## Phase 0 — Project scaffolding

- Set up a static web app project (plain HTML/CSS/JS, or a minimal framework if it clearly speeds things up without adding real complexity).
- Add Leaflet.js + OpenStreetMap tile layer, confirm a basic map renders and is pannable/zoomable on an iPhone-sized viewport.
- Set up a PWA manifest + icon so the app can be added to the Home Screen and opens full-screen.
- Decide and document the free static hosting target (e.g. GitHub Pages) and get a bare "hello map" version deployed and installed on Austin's phone, to validate the install flow early.

**Exit criteria:** a blank map loads on Austin's iPhone Home Screen as an installed app.

## Phase 1 — Data model & storage layer

- Implement the restaurant record schema from REQUIREMENTS.md §6 (base fields, "Been" fields, confirmed §6.3 fields, "Last visited" per §6.4).
- Store records in IndexedDB (or a small wrapper library over it), with an explicit **schema version** field.
- Build the migration mechanism now, even though there's only one schema version today — this is what makes §10a's "no data loss on update" requirement real rather than aspirational later.
- Build export (to a JSON file) and import (from a JSON file) — required per §10, and doubles as a way to seed test data during development.

**Exit criteria:** can create/read/update/delete a restaurant record in storage, and export/import round-trips correctly.

## Phase 2 — Add / Edit restaurant flow

- **Add-restaurant form, search-first** (confirmed 2026-08-25, REQUIREMENTS.md §9): primary path is searching by restaurant name (e.g. via OpenStreetMap Nominatim's search endpoint) and selecting the correct result to auto-fill address, lat/lng, and town/city. Manual address entry stays as a fallback for places search doesn't find, geocoded the same way (e.g. via Nominatim) to get lat/lng and derive town/city.
- Edit flow covering every field in §6.1–§6.4, including the confirmed dropdowns/tags: reservations (3-option), cuisine (multi-select from maintained list, extensible), dietary tags (multi-select), noise level, price range, rating, service style, non-chain flag, good-date-spot flag, would-go-again, good-for-groups, outdoor seating, website/menu link, notes. **"Recommended by" (§6.1) needs a clearly visible field of its own** — reconfirmed wanted by Austin during Phase 1 testing, don't let it get lost among the review fields.
- Status toggle between "Want to Go" and "Been" (moving to "Been" is what unlocks the review fields).
- Delete restaurant, with a confirmation step (this is a destructive action against the "never lose data" spirit of §10a, so it should require explicit confirmation).

**Exit criteria:** Austin can fully add a "Want to Go" place from his phone in well under a minute, and later fill in a full review when he's been.

## Phase 3 — Fix installed-PWA visual bugs (safe-area / viewport rendering)

**Added 2026-08-27, pushing every phase after it back by one.** Originally
these were going to wait for the Phase 7 (formerly Phase 6) polish pass, but
Austin flagged that a recurring white strip across the bottom of the screen
and a blurring/fading artifact near the top are frequent enough to make it
hard to trust what's actually broken vs. a rendering glitch while testing
Phase 2 and building later phases — so they get their own phase now instead.

- Austin will open this phase with a screenshot showing both issues, to
  properly diagnose them rather than guessing.
- The top-side symptom is the same one flagged in Phase 1 testing (controls
  sitting close to / partly outside the safe area, a fading/gradient artifact
  near the top); the bottom white strip is new and not yet diagnosed.
- Likely areas to investigate: iOS Safari's dynamic toolbar changing the
  visual viewport height under `position: fixed` elements (Phase 1's
  `body { position: fixed; inset: 0; }` fix may not cover every case —
  possibly needs `100dvh`/`env(safe-area-inset-*)` handling in more places),
  and how the Phase 2 UI (the List, Settings, and Add/Edit form panels, all
  full-screen `position: fixed` overlays) interacts with that.
- Confirm the fix holds across: cold launch from the Home Screen icon,
  backgrounding and returning, opening/closing the List/Settings/Add-Edit
  panels, and the on-screen keyboard appearing/disappearing (e.g. while
  typing in the address search box).

**Exit criteria:** no white strip at the bottom and no blur/fade artifact at
the top on Austin's installed iPhone app, across the scenarios above.

## Phase 4 — Map + list display

- Render pins for all stored restaurants (or the current filtered set, once Phase 5 lands).
- Visually distinguish "Want to Go" vs. "Been" pins (design judgment per §8/§13).
- Tap a pin → detail card with all stored fields for that restaurant.
- A complementary list view of the same filtered set (map-only browsing is awkward for dense areas; a list is often faster to scan) — replaces the plain interim list built in Phase 2.

**Exit criteria:** every saved restaurant is visible and tappable on the map and in a list.

**Status: DONE — confirmed by Austin on device 2026-08-28 (build 7).** Pins
are rating-aware (filled + numbered for Been, hollow for Want to Go), the
detail view is a bottom sheet over the map, and the Phase 2 interim list was
upgraded in place — tapping a row now focuses the map and opens the sheet
instead of jumping to the edit form. The opening view centres on the user's
current location (with a blue "you are here" dot), falling back to framing
the saved pins only if geolocation is denied or unavailable. See PROGRESS.md's
Phase 4 section.

## Phase 5 — Search & filtering

- Area search (by town/city derived from address).
- Text search (name, notes).
- Filter controls for: status, cuisine (multi-select), minimum rating, price range, service style, non-chain flag, good-date-spot flag, and the other confirmed §6.3 fields — combinable with AND logic.
- Validate the worked example from REQUIREMENTS.md §7: search a town, filter to Thai, see only "Been" entries with ratings.

- **Proximity-ordered list (requested by Austin 2026-08-28, during Phase 4
  review).** The list should be ordered by distance from wherever the map
  currently is — pan to another city, open the list, and that city's places
  come first, with everything else below. This replaces Phase 4's simple
  Want-to-Go / Been alphabetical grouping. Two things to settle when building
  it: whether the existing status grouping survives (proximity *within* each
  group, or one flat proximity-ordered list with a status marker per row),
  and whether to show the actual distance on each row. Sort against
  `map.getCenter()` at the moment the list opens, not the user's GPS position
  — the point is "what's near where I'm looking", which is not always where
  he is. `PlateLedgerMap.userPosition` is available if a "distance from me"
  variant is wanted too.

**Exit criteria:** the §7 worked example works end-to-end on-device, and
opening the list after panning to a new area surfaces that area's
restaurants first.

**Status: Built, awaiting on-device confirmation (2026-08-28, build 8).**
Search (one box: name/notes/town/address), all filters from §7 (status,
cuisine, minimum rating, price range, service style, non-chain, good date
spot, plus every confirmed §6.3 field — would go again, good for groups,
outdoor seating, reservations, dietary-friendly, noise level), combinable
AND-across-fields/OR-within-field. The old Want-to-Go/Been list grouping is
gone — replaced with one flat list ordered by distance from `map.getCenter()`
at the moment the list opens, distance shown per row, status shown as a
small badge per row (Austin's call, 2026-08-28: flat list with distance
shown, not grouped). Headless-tested (27 assertions, including the exact §7
worked example) since this session has no browser; still needs the real
on-device pass before this closes. See PROGRESS.md's Phase 5 section.

## Phase 6 — Apple Maps handoff

- "Directions" action on the detail card builds a `maps.apple.com` link from the restaurant's address/coordinates and opens it, handing off to the native Apple Maps app.
- Confirm this actually opens the Apple Maps app (not just a web preview) when tapped from the installed Home Screen app on iOS Safari.

**Exit criteria:** tapping "Directions" from the app opens turn-by-turn-ready directions in Apple Maps.

## Phase 7 — Polish & real-world use

- Confirm the "add a place in a few taps" non-functional goal (§11) actually feels fast in practice; trim friction if not.
- **Create a better app icon** — current icon is a placeholder; design a real one and regenerate `icons/apple-touch-icon.png`, `icons/icon-192.png`, `icons/icon-512.png`.
- **Fix Home Screen naming** — confirm "Add to Home Screen" from iOS Safari picks up "Plate Ledger" automatically (manifest `name`/`short_name` + `apple-mobile-web-app-title` meta tag); adjust whichever isn't taking effect.
- **General visual design pass — make it not look so ugly.** The app currently reads as a bare prototype; give it a real UI treatment (colors, typography, spacing, map pin/marker styling, detail card layout) so it feels like a finished app. (The safe-area/viewport rendering bugs themselves are fixed in Phase 3, not here — this is the remaining color/typography/spacing polish.)
- **Top status bar color.** Phase 3 switched `apple-mobile-web-app-status-bar-style` from `black-translucent` to `default` to kill a top-of-screen fade artifact (see PROGRESS.md's Phase 3 section) — that made it a solid opaque bar, functional but untouched visually since Phase 3 was scoped to fixing the rendering bugs, not styling. Pick a real color for it here (probably matching the app's theme, `#c0392b`, or the general visual design pass's palette once that's decided) instead of leaving it whatever the default light-bar color is.
- ~~**Settings area**~~ — **done in Phase 2:** Export, Import, and "Delete all" already live in a dedicated Settings panel, not top-level buttons (REQUIREMENTS.md §10).
- Splash/launch behavior, general mobile UI pass.
- Manual test pass: add several real restaurants across multiple towns, exercise every filter, confirm export/import, confirm nothing is lost after a fresh deploy (this directly tests the §10a hard requirement).

**Exit criteria:** Austin is comfortable using this as his actual restaurant list going forward.

## Known issues carried forward (not yet scheduled)

Surfaced during Phase 2 on-device testing (2026-08-28), explicitly deferred
by Austin to "a later stage" rather than picked now or forced into a
specific phase number:

- **Add-restaurant search doesn't prioritize actual restaurant/business
  matches.** Typing a name returns what feels like near-random results from
  anywhere in the world instead of putting matching businesses first. The
  Nominatim `/search` call in `js/geocode.js` is unrestricted free-text —
  try `layer=poi` (or similar) to bias toward points-of-interest over raw
  addresses/streets.
- **Search isn't biased toward Austin's location.** Should prefer nearby
  matches. Nominatim's `/search` supports `viewbox` + `bounded=0` to softly
  rank results inside a bounding box higher without excluding results
  outside it. `js/app.js` already requests geolocation on load (and/or the
  current map center, once Phase 4 lands pins) can seed that box.
- Once search quality is fixed, the existing Name-autofill-from-search-result
  behavior (`js/restaurant-form.js`) should start working reliably on its
  own, since it depends on getting a well-matched result to autofill from.

## v1.1 (fast-follow, not blocking v1)

- **Photos** — attach photo(s) to a "Been" entry (confirmed wanted, but lower priority per REQUIREMENTS.md §6.3).

## v2 backlog (explicitly out of scope for now)

- Automatic cloud backup/sync — CloudKit (if a paid Apple Developer account is obtained for other reasons) or a lighter free backend (Firebase/Supabase) as a lower-friction alternative. See REQUIREMENTS.md §10 and RECOMMENDATION.md addendum.
- Read-only or collaborative sharing of the list with others.
- Android/cross-platform support.
- Per-visit history (separate rating/notes per visit) instead of a single "latest" state.
- Native app / Apple MapKit JS, if a developer account is ever justified for other reasons.

## How to start the build chat

In the new chat: point Claude at this project folder, and ask it to read README.md, REQUIREMENTS.md, and this PROJECT_PLAN.md first, then start at Phase 0. Each phase's "exit criteria" is a natural checkpoint to test on Austin's phone before moving on.
