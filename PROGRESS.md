# Build Progress — Plate Ledger

Tracks phase-by-phase status against PROJECT_PLAN.md. Updated at each phase's
exit criteria: "built, awaiting your test" → "tested and confirmed working" (or
back to "in progress" if a fix is needed).

## Phase 0 — Project scaffolding

**Status: Tested and confirmed working.** (2026-08-25)

Live at: https://austinchan2.github.io/Plate-Ledger/

What's in this folder now:
- `index.html`, `css/styles.css`, `js/app.js` — a Leaflet.js map with OpenStreetMap
  tiles, full-screen, with iOS safe-area insets so it sits right under the notch /
  above the home indicator when installed.
- `manifest.json` + `icons/` (192px, 512px, apple-touch-icon) — makes the page
  installable to your iPhone Home Screen as a standalone (full-screen, no Safari
  chrome) app.
- `js/app.js` tries to center the map on your current location (asks for
  location permission on first load); if you say no, or it's unavailable, it
  falls back to a wide zoomed-out view of the US.
- No restaurant data, add/edit form, search, or filtering yet — that starts in
  Phase 1. This phase is purely "does a map show up and can I install it."
- A local git repo was initialized in this folder with one commit containing
  everything above. Nothing has been pushed anywhere yet — see "Your turn"
  below.

**Exit criteria (from PROJECT_PLAN.md):** a blank map loads on your iPhone Home
Screen as an installed app.

### Your turn: deploy to GitHub Pages and test

I can't push to GitHub or create a repo on your behalf (no credentials, and this
sandbox's network access doesn't reach github.com), so this part is on you — it's
about 5 minutes:

1. **Create a GitHub repo.** Go to github.com (sign up first if you don't have an
   account — it's free), click "New repository." Name it something like
   `local-restaurant-map`. Leave it public (GitHub Pages is free for public
   repos). Don't initialize it with a README (this folder already has one).
2. **Push this folder.** Open Terminal, then:
   ```
   cd "/Users/austinpeterson/Documents/Claude Projects/Local Restaurant Map"
   git remote add origin https://github.com/<your-username>/local-restaurant-map.git
   git push -u origin main
   ```
   (If Terminal asks you to log in to GitHub, follow its prompts — it'll open a
   browser sign-in.)
3. **Turn on GitHub Pages.** On the repo's GitHub page: Settings → Pages → under
   "Build and deployment," set Source to "Deploy from a branch," Branch to
   `main` / `/ (root)`, then Save. Wait a minute or two; GitHub will show you the
   live URL (something like `https://<your-username>.github.io/local-restaurant-map/`).
4. **Open that URL on your iPhone** in Safari (not Chrome — Add to Home Screen
   for full PWA behavior needs Safari on iOS).
5. **Add to Home Screen:** tap the Share icon → "Add to Home Screen" → Add.
6. **Open it from the Home Screen icon** (not from Safari) and confirm:
   - It opens full-screen, no Safari address bar.
   - The map renders with street/road tiles.
   - You can pinch-zoom and pan.
   - It asks for your location and centers on you (or falls back to the wide US
     view if you decline).

Report back either "works" or what went wrong (a screenshot helps if something
looks visually off), and I'll either mark this phase tested and stop, or fix it
and ask you to re-test — I will not start Phase 1 until you've confirmed this
one.

## Phase 1 — Data model & storage layer

**Status: Tested and confirmed working.** (2026-08-25)

What's new:
- `js/db.js` — the full restaurant record schema from REQUIREMENTS.md §6 (base
  fields, "Been" fields, the §6.3 confirmed fields, "Last visited" per §6.4),
  stored in IndexedDB. Every record carries a `schemaVersion`; reads and
  imports run through a migration step that backfills any field a record is
  missing, so future schema changes can't wipe or corrupt existing data
  (REQUIREMENTS.md §10a). CRUD (create/read/update/delete) and export-to-JSON
  / import-from-JSON are all implemented here.
- `js/debug-panel.js` — a bare temporary test panel (tap "Debug" top-right) to
  exercise the storage layer on your phone, since the real Add/Edit form and
  map pins don't exist yet (that's Phases 2 and 3). It can add sample
  restaurants (randomly "Want to Go" or "Been" with full review fields),
  toggle a restaurant's status, delete one, delete all, and export/import the
  whole database as a JSON file. **This panel is scaffolding — it gets deleted
  once Phase 2 ships the real form.**
- I already verified create/read/update/delete and a full export → wipe →
  import round-trip (all data came back intact) in a local browser test, plus
  that an old/incomplete record shape gets correctly filled in with defaults
  by the migration step. This is what you're confirming on-device now.

**Exit criteria (from PROJECT_PLAN.md):** can create/read/update/delete a
restaurant record in storage, and export/import round-trips correctly.

### Testing notes

First round on-device surfaced a layout bug on the installed iOS PWA: the map
didn't reach the bottom of the screen (blank strip below it) and the top —
including the zoom controls and the Debug button — was pushed above the
visible screen. Cause: iOS Safari doesn't fully honor `overflow: hidden` on
`body` and can leave the page permanently scrolled a few pixels from its
elastic "rubber-band" bounce. Fixed in `css/styles.css` by pinning `body` with
`position: fixed; inset: 0;` so the document itself can't scroll at all.
Re-tested after the fix: **all tests passed** — create/read/update/delete and
the export → wipe → import round-trip all confirmed working on Austin's
iPhone.

Known remaining issue (cosmetic, not blocking): some top controls can still
sit close to / partly outside the visible area, with a fading/gradient
artifact near the top of the installed app. Deferred — see "Follow-up
requirements from testing" below and the Phase 6 visual-design-pass entry in
PROJECT_PLAN.md; aesthetic work is being done last, once functionality is
further along.

### Follow-up requirements from testing (2026-08-25)

Austin's Phase 1 test pass surfaced four items for later phases. All are now
captured in PROJECT_PLAN.md / REQUIREMENTS.md so they aren't lost; none are
being built yet:

1. **Search-to-add, not just type-an-address.** The Phase 2 add-restaurant
   flow should let Austin search for a restaurant by name and select it to
   pull its location/address, rather than only typing a raw address to
   geocode. Documented in PROJECT_PLAN.md Phase 2 and REQUIREMENTS.md §9.
2. **"Recommended by" field.** Already exists in the §6.1 schema
   (`recommendedBy` in `js/db.js`) — reconfirmed as wanted and flagged to make
   sure the real Phase 2 form actually surfaces it prominently, not just
   technically supports it.
3. **Bury destructive/bulk actions in a Settings area.** "Delete all" (and
   likely Export/Import) shouldn't be quick top-level buttons in the finished
   app — they belong behind a Settings menu. The current top-level Debug panel
   is temporary scaffolding only (removed in Phase 2) and isn't held to this;
   documented as a real requirement for wherever Settings lands, in
   REQUIREMENTS.md §10 and PROJECT_PLAN.md Phase 6.
4. **Layout/aesthetic polish** (buttons still pushed toward/out of the visible
   edge, top fading/gradient artifact) — explicitly deferred by Austin until
   functional work is further along; folded into the existing Phase 6 visual
   design pass in PROJECT_PLAN.md.

## Phase 2 — Add / Edit restaurant flow

**Status: Built, awaiting Austin's test.** (2026-08-25)

What's new:
- `js/geocode.js` — thin wrapper around OpenStreetMap's Nominatim search/geocode
  endpoints (no API key needed).
- `js/restaurant-form.js` — the real Add/Edit form, replacing the Phase 1
  debug panel. Covers every field in REQUIREMENTS.md §6.1–6.4: Name,
  **search-first address picker** (search by restaurant name → pick a result
  to auto-fill address/lat-lng/town, with "enter address manually" as a
  fallback that still geocodes the same way, per §9), **Recommended by** as
  its own visible field (not buried, per the Phase 1 follow-up), Notes, a
  Want to Go / Been status toggle that reveals the review fields only once
  marked Been (rating, price range, non-chain, service style, cuisine
  multi-select, meal(s) had, good date spot, last visited, would go again,
  good for groups, outdoor seating, reservations, dietary tags, noise level,
  website/menu link), and Delete with a confirmation prompt. Nothing touches
  storage until Save or Delete is tapped — closing the form discards changes.
- `js/db.js` — added `getCuisineList()` / `addCustomCuisine()` so the
  "add a cuisine not listed" box in the form actually persists new cuisines
  (in `localStorage`, not the restaurant records) and offers them again next
  time, per §6.2's "extensible list" requirement.
- `js/list-settings.js` — three small top-level controls since there's no map
  pins or list view yet (that's Phase 3): a **+ button** (bottom-right) opens
  the Add form; a **☰ List button** (top-left) opens a bare-bones list of
  everything saved so far, grouped Want to Go / Been, tap a row to edit it —
  this is deliberately plain and will be replaced by Phase 3's real map+list
  view; a **⚙ Settings button** (top-right) opens Export / Import / Delete
  all, per §10's requirement that these live in a Settings area rather than
  as top-level buttons (the Phase 1 debug panel had them one tap away — this
  fixes that for good, not just as a temporary stand-in).
- The Phase 1 debug panel (`js/debug-panel.js`) is retired — moved to
  `_to_delete/` since this session can't delete files directly on your Mac;
  safe for you to delete that folder's contents in Finder whenever.
- All styling here is intentionally plain/functional — the real visual design
  pass is Phase 6 per PROJECT_PLAN.md, same as the top-bar layout issue noted
  in Phase 1.

**Exit criteria (from PROJECT_PLAN.md):** you can fully add a "Want to Go"
place from your phone in well under a minute, and later fill in a full
review when you've been.

### Your turn: pull, test, and report back

This was built and committed locally but **not pushed** — same as every
phase so far, pushing is on you. From Terminal:
```
cd "/Users/austinpeterson/Documents/Claude Projects/Local Restaurant Map"
git push
```
Then reload the app on your phone (close it fully from the app switcher and
reopen from the Home Screen icon, since installed PWAs can cache the old
version) and try:

1. Tap **+**. Search for a real restaurant near you by name and pick it from
   the results — confirm the address/town look right.
2. Try the **"enter address manually"** fallback on a place search doesn't
   find (or just to test it) — type an address and tap "Look up address."
3. Fill in Name (if not already filled), **Recommended by**, and Notes, leave
   status as "Want to Go," and Save. Confirm it took well under a minute.
4. Tap **☰ List**, find that restaurant, tap it to reopen it in Edit mode.
5. Switch its status to **Been** and confirm the full review section appears
   — rating, price, cuisine (try adding a cuisine that's not in the list, like
   a specific regional cuisine, and confirm it shows up as an option again
   next time you open a Been restaurant), dietary tags, reservations, noise
   level, etc. Save.
6. Reopen it once more and confirm everything you entered is still there.
7. Try **Delete** on a test entry — confirm it asks you to confirm first.
8. Tap **⚙ Settings** — try Export (a JSON file should download/share), and
   Import that same file back in (should say "Imported 1, skipped 0" or
   similar, not duplicate everything if you still have the original).

Report back "works" or what went wrong, and I'll fix and ask you to re-test
before Phase 3 (map pins + list view) starts.
