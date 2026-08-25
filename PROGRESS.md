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

**Status: Built. Awaiting your test on your iPhone.** (2026-08-25)

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

### Your turn: test on your iPhone

This isn't deployed yet — I'll need you to push and let GitHub Pages rebuild
(same as Phase 0), then:

1. Open the site fresh on your phone (or force-refresh if it was cached) and
   confirm the map still loads.
2. Tap **Debug** (top-right). Tap **"+ Add test restaurant"** a few times —
   confirm rows appear with a name, status, town, and (for "Been" ones) a star
   rating.
3. Tap **"Toggle status"** on one — confirm its status flips.
4. Tap **"Delete"** on one — confirm it disappears and the count updates.
5. Tap **"Export JSON"** — confirm iOS offers to save/share a `.json` file.
6. Tap **"Delete all"** (confirm the prompt) — confirm the list goes to 0.
7. Tap **"Import JSON"** and pick the file you just exported — confirm your
   restaurants come back.

Report "works" or what went wrong, and I'll fix/re-test or move on to Phase 2
(the real Add/Edit form).
