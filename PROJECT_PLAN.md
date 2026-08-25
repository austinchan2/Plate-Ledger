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

## Phase 3 — Map + list display

- Render pins for all stored restaurants (or the current filtered set, once Phase 4 lands).
- Visually distinguish "Want to Go" vs. "Been" pins (design judgment per §8/§13).
- Tap a pin → detail card with all stored fields for that restaurant.
- A complementary list view of the same filtered set (map-only browsing is awkward for dense areas; a list is often faster to scan).

**Exit criteria:** every saved restaurant is visible and tappable on the map and in a list.

## Phase 4 — Search & filtering

- Area search (by town/city derived from address).
- Text search (name, notes).
- Filter controls for: status, cuisine (multi-select), minimum rating, price range, service style, non-chain flag, good-date-spot flag, and the other confirmed §6.3 fields — combinable with AND logic.
- Validate the worked example from REQUIREMENTS.md §7: search a town, filter to Thai, see only "Been" entries with ratings.

**Exit criteria:** the §7 worked example works end-to-end on-device.

## Phase 5 — Apple Maps handoff

- "Directions" action on the detail card builds a `maps.apple.com` link from the restaurant's address/coordinates and opens it, handing off to the native Apple Maps app.
- Confirm this actually opens the Apple Maps app (not just a web preview) when tapped from the installed Home Screen app on iOS Safari.

**Exit criteria:** tapping "Directions" from the app opens turn-by-turn-ready directions in Apple Maps.

## Phase 6 — Polish & real-world use

- Confirm the "add a place in a few taps" non-functional goal (§11) actually feels fast in practice; trim friction if not.
- **Create a better app icon** — current icon is a placeholder; design a real one and regenerate `icons/apple-touch-icon.png`, `icons/icon-192.png`, `icons/icon-512.png`.
- **Fix Home Screen naming** — confirm "Add to Home Screen" from iOS Safari picks up "Plate Ledger" automatically (manifest `name`/`short_name` + `apple-mobile-web-app-title` meta tag); adjust whichever isn't taking effect.
- **General visual design pass — make it not look so ugly.** The app currently reads as a bare prototype; give it a real UI treatment (colors, typography, spacing, map pin/marker styling, detail card layout) so it feels like a finished app. Includes fixing the known top-bar layout issue from Phase 1 testing: controls sitting too close to / partly outside the visible safe area, plus a fading/gradient artifact near the top on the installed iOS PWA. Explicitly deferred to this phase per Austin (aesthetics last, once functionality is further along).
- **Settings area** (confirmed 2026-08-25, REQUIREMENTS.md §10): a dedicated, out-of-the-way settings/menu screen to house Export, Import, and "Delete all" — these are destructive/bulk actions and should not be quick top-level buttons in the finished app (the Phase 1 debug panel exposes them at the top level, but that panel is temporary scaffolding, not the final design).
- Splash/launch behavior, general mobile UI pass.
- Manual test pass: add several real restaurants across multiple towns, exercise every filter, confirm export/import, confirm nothing is lost after a fresh deploy (this directly tests the §10a hard requirement).

**Exit criteria:** Austin is comfortable using this as his actual restaurant list going forward.

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
