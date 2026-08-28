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

**Status: Tested and confirmed working.** (2026-08-28)

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

### Testing notes (2026-08-28)

Austin confirmed on-device: the **☰ List** button works, and the **+** Add
button is functional — a restaurant can be searched for, saved, edited, and
the review fields work as designed. Two real issues with the address search
came out of that pass, both explicitly deferred to a later stage (not
blocking Phase 2 from closing):

1. **Search doesn't prioritize restaurant/business name matches.** Typing a
   restaurant's name currently returns what feels like near-random results
   from anywhere in the world, rather than putting actual matching
   businesses first. The underlying Nominatim `/search` call in
   `js/geocode.js` is a plain free-text query with no result-type
   restriction — worth trying Nominatim's `layer=poi` param (or similar) to
   bias toward points-of-interest like restaurants over raw street
   addresses.
2. **Search isn't biased toward Austin's location.** Results should prefer
   places near him over distant matches. Nominatim's `/search` supports a
   `viewbox` + `bounded=0` param that softly ranks results inside a bounding
   box higher without excluding results outside it — `js/app.js` already
   requests geolocation on load, so that (or the current map center) is
   available to build a `viewbox` from.

Once search quality is fixed, the Name field auto-fill from a selected
result (already implemented) should reliably suggest the right name on its
own, rather than Austin needing to type it in.

Also settled 2026-08-27: Austin considered building a native iOS app instead
(free Apple ID + Xcode, no App Store) to sidestep the PWA's rendering
quirks, and decided against it — the ~7-day re-signing requirement isn't
worth it. Staying on the PWA path. See RECOMMENDATION.md's addendum for the
evaluation.

Delete-with-confirmation and Settings (Export/Import/Delete all) weren't
explicitly called out in this round of testing, but were covered by an
automated smoke test before this phase shipped (see the Phase 2 commit
message) and Austin didn't flag any issues with them.

**Not pushed yet** — same as every phase, pushing is on Austin:
```
cd "/Users/austinpeterson/Documents/Claude Projects/Local Restaurant Map"
git push
```

## Phase 3 — Fix installed-PWA visual bugs (safe-area / viewport rendering)

Diagnosed from a screenshot Austin sent of the installed app: a solid white
strip across the bottom of the screen, and a washed-out/faded band near the
top (below the status bar).

**Root cause (both symptoms, one cause):** `#map` had CSS padding equal to
`env(safe-area-inset-*)` on all four sides, meant to keep the map content
clear of the notch and home indicator. Instead it reserved a blank white
rectangle there:
- At the bottom, that white rectangle rendered as a plain solid bar (made
  more obvious by Leaflet's attribution control, which also has a white
  background, sitting right in it).
- At the top, iOS's translucent status bar applies a live blur/vibrancy
  effect to whatever is actually behind it — since that was blank white
  padding instead of map tiles, the blur produced the washed-out fade
  Austin saw, rather than the clean frosted-map-under-status-bar look native
  map apps have.

**Fix (`css/styles.css`, `js/app.js`):**
- Removed the safe-area padding from `#map` entirely — the map now bleeds
  edge-to-edge, under the notch/Dynamic Island and the home indicator, the
  same way Apple/Google Maps do.
- Added safe-area insets to Leaflet's own corner-control container
  (`.leaflet-top` / `.leaflet-bottom` / `.leaflet-left` / `.leaflet-right`)
  instead, so only the floating controls (zoom, attribution) stay clear of
  the safe area — not the map tiles themselves.
- Also moved the Leaflet zoom control from its default top-left position to
  bottom-left. It was stacking directly underneath the **☰ List** button in
  the same corner (visible in Austin's screenshot as a "+"/"-" control
  half-hidden behind the List pill) — bottom-left was the one corner nothing
  else uses (Settings is top-right, Add is bottom-right).

**Exit criteria (from PROJECT_PLAN.md):** no white strip at the bottom and
no blur/fade artifact at the top on Austin's installed iPhone app, across:
cold launch from the Home Screen icon, backgrounding and returning,
opening/closing the List/Settings/Add-Edit panels, and the on-screen
keyboard appearing/disappearing.

### Your turn

```
cd "/Users/austinpeterson/Documents/Claude Projects/Local Restaurant Map"
git push
```

Then reinstall/relaunch the app from your Home Screen icon (force-quit it
first if it was already open, so it picks up the new files) and check:

- [ ] No solid white bar across the bottom of the screen — the map now runs
      all the way to the true bottom edge, behind the home indicator.
- [ ] No washed-out/faded band near the top — the map should run up under
      the status bar/Dynamic Island with a normal frosted-glass look, not a
      blank or hazy strip.
- [ ] Zoom **+**/**-** buttons now show at the **bottom-left**, no longer
      overlapping the **☰ List** button at top-left.
- [ ] **☰ List** (top-left) and **⚙** Settings (top-right) buttons still sit
      just clear of the notch/status bar, not touching it.
- [ ] Attribution text ("Leaflet | © OpenStreetMap contributors", bottom
      right) is still legible and not covered by the **+** Add button.
- [ ] Repeat a quick check after: backgrounding and returning to the app,
      opening then closing the List panel, opening then closing Settings,
      and opening the Add form and tapping into the address search box
      (keyboard up) then dismissing it.

### Testing notes, round 1 (2026-08-28)

Austin tested the first Phase 3 commit on-device:

- ✅ Zoom control now at bottom-left, no longer overlapping the List button.
- ✅ List and Settings buttons still sit clear of the notch/status bar.
- ✅ Attribution text still legible, not covered by the Add button.
- ⚠️ **Bottom white bar: gone on cold launch, but reappears as soon as he
  taps anywhere on screen.** Diagnosis: CSS alone (`overflow: hidden` +
  `overscroll-behavior: none` + pinning `body` to a fixed full-viewport box)
  isn't fully suppressing iOS's elastic "rubber-band" bounce on a tap in
  this installed-PWA context — a single tap is enough to trigger a few
  pixels of bounce, revealing blank space at the bottom edge before it
  snaps back. Fixed by adding a document-level `touchmove` listener
  (`js/app.js`) that calls `preventDefault()` on any touch that isn't
  inside a panel meant to scroll natively (`.form-body`, `.list-body`,
  `.search-results`), blocking the bounce without touching those panels'
  own scrolling.
- ⚠️ **Top hazy/fade band: still there, unchanged.** The first commit's
  theory (blurred white safe-area padding) doesn't fully explain this,
  since removing that padding didn't visibly change it. Not yet re-fixed —
  waiting on a fresh screenshot from Austin of the current top-of-screen
  state to diagnose further rather than guessing again.

**Not pushed yet** — same as every phase, pushing is on Austin:
```
cd "/Users/austinpeterson/Documents/Claude Projects/Local Restaurant Map"
git push
```

### Build version marker (2026-08-28)

Austin asked for a small, unobtrusive way to confirm a given push actually
reached his installed app, since there's no build pipeline or service
worker here to guarantee that (GitHub Pages + iOS could both be showing him
a stale cached copy with no visual cue that anything's wrong).

Added `js/version.js` — `window.PLATE_LEDGER_BUILD = { number, builtAt }` —
rendered as a tiny gray "build N · <time>" tag, bottom-center of the
screen, `pointer-events: none` so it never intercepts a tap. It doesn't
compete with any corner control (List/Settings/Add/zoom all live in the
four corners; this sits in the empty gap between them).

This build's number/time will be bumped on every future commit meant to
reach Austin's phone (now baked into phase_delivery_workflow in project
memory) — he doesn't need to ask again, just glance at the tag after
reinstalling. This is **build 1**.

**Not pushed yet** — same as every phase, pushing is on Austin:
```
cd "/Users/austinpeterson/Documents/Claude Projects/Local Restaurant Map"
git push
```

### Cache-busting fix (2026-08-28)

Austin pushed build 1, refreshed several times in both the installed app
and Safari, and never saw the build tag. Checked the live GitHub Pages URL
directly from this session (fetched js/version.js from
https://austinchan2.github.io/Plate-Ledger/) — build 1 was already live and
correct on the server. So this wasn't a deploy delay or a failed push, it
was his phone serving a cached copy of the page instead of fetching the new
one (GitHub Pages doesn't support custom Cache-Control headers, and
installed-PWA/Safari caching on iOS can outlast a normal reload).

Added a `?v=N` query string to every local `<script>`/`<link>` tag in
index.html (not the pinned Leaflet CDN ones), kept in lockstep with
js/version.js's build number from now on. This doesn't retroactively fix
the build-1 page Austin already has cached — he still needs one clean
fetch to pick it up (see chat reply for how) — but once he does, every
future build's JS/CSS becomes a genuinely new URL, so a stale cache can't
silently hide an update again.

**This is build 2** — same content as build 1, plus the cache-busting fix.

**Not pushed yet** — same as every phase, pushing is on Austin:
```
cd "/Users/austinpeterson/Documents/Claude Projects/Local Restaurant Map"
git push
```

### Testing notes, round 2 (2026-08-28)

Austin confirmed build 1 finally loaded (after clearing cached site data),
and re-tested: **bottom bar still reappears after a tap or two, top fade
still unchanged.**

**Bottom bar — found a real bug in round 1's fix:** the document-level
`touchmove` listener from the previous commit was attached to the bubble
phase. Leaflet's own controls (the zoom +/- buttons especially) call
`stopPropagation()` on their own touch handling so a tap on them doesn't
also drag the map underneath — which also stops our bubble-phase listener
on `document` from ever seeing those touches, since a stopped event never
reaches an ancestor in the bubble phase. That's consistent with "a tap or
two" — taps that happen to land on a control weren't being guarded at all.
Fixed by switching the listener to the capture phase
(`{ passive: false, capture: true }`), which runs on the way down before
any descendant can call stopPropagation, so it now sees every touch
regardless of what Leaflet does with it afterward.

Also softened `html`, `body`, and `#map`'s fallback background from pure
white to `#f2efe9` (a warm off-white close to OSM tiles' typical land
color) as a defense-in-depth measure — if any sliver of this ever shows
through at an edge for a reason CSS/JS genuinely can't prevent (a brief
native bounce, a Leaflet tile-load timing gap), it should blend with the
map instead of reading as an obvious white flash.

**Top fade — still unresolved, likely not fixable in CSS.** This one is
present even at rest (not tap-triggered like the bottom bar was), which
points away from a rubber-band/reflow explanation and toward iOS itself
compositing a translucent scrim over content that sits behind a
`black-translucent` status bar in an installed web app — genuine OS
behavior, not something in our page. Asked Austin whether to keep the
current full-bleed-under-the-status-bar look (accepting whatever blend iOS
applies there) or switch `apple-mobile-web-app-status-bar-style` to a
solid bar instead (eliminates the blur entirely, but the map would then
start just below a normal-looking status bar instead of running under it —
trading full-bleed for a clean edge). Not changed pending his answer.

**This is build 3.**

**Not pushed yet** — same as every phase, pushing is on Austin:
```
cd "/Users/austinpeterson/Documents/Claude Projects/Local Restaurant Map"
git push
```

### Top fade — switched to a solid status bar (2026-08-28)

Austin's call on the top-fade trade-off: switch to a solid status bar
rather than keep the full-bleed translucent look.

- `index.html`: `apple-mobile-web-app-status-bar-style` changed from
  `black-translucent` to `default` (opaque light bar, dark text — fits the
  app's white/light theme better than `black` would).
- `css/styles.css`: `#map` now reserves `padding-top:
  env(safe-area-inset-top)` again (bottom/left/right stay full-bleed —
  that's unrelated to this and already fixed). With a solid status bar,
  iOS covers that region with an opaque rectangle regardless of our CSS, so
  reserving the space ourselves means our own background color (the warm
  off-white from the round-2 fix) shows there instead of map tiles being
  pointlessly hidden behind it.
- Removed the now-redundant `.leaflet-top` safe-area rule from the round-1
  fix — no control currently anchors to a top corner (zoom is bottom-left,
  attribution is bottom-right), and if one ever did, `#map`'s own
  padding-top would already cover it; leaving both would have double-inset
  it.

**Exit criteria going forward:** no white/hazy strip at the top (should now
be a clean, deliberate edge instead — a solid-colored status bar with the
map starting right below it), no bar at the bottom on repeated taps.

**This is build 4.**

**Not pushed yet** — same as every phase, pushing is on Austin:
```
cd "/Users/austinpeterson/Documents/Claude Projects/Local Restaurant Map"
git push
```

### Testing notes, round 3 (2026-08-28)

Austin re-tested build 4: build tag confirmed showing correctly (cache-busting
is working as intended), but **both bugs were still present** — bottom bar
still reappearing, top fade unchanged despite the status-bar-style switch.

**Bottom bar:** two different JS-level fixes now haven't worked (bubble-phase
touchmove guard, then capture-phase). That consistent failure points away
from anything interceptable via DOM events at all — most likely this is
WKWebView's own native `UIScrollView` rubber-banding, a lower-level OS
gesture-recognizer behavior that installed (standalone) iOS web apps are
prone to, sitting below where `preventDefault()` on a DOM touchmove event is
guaranteed to reach. Switched approach: added `touch-action: none` to
`html, body` (a declarative signal to the OS gesture recognizer itself, not
a reactive JS handler), with `touch-action: pan-y` explicitly re-enabled on
the three panels that scroll natively (`.form-body`, `.list-body`,
`.search-results` — an ancestor's `touch-action: none` restricts
descendants even at their default `auto`, so those need an explicit
override to keep working). This is a genuinely different mechanism than
either JS attempt, not just a third guess at the same approach.

**Top fade:** the status-bar-style meta tag change (`black-translucent` ->
`default`) in build 4 may not have taken effect yet for a reason specific
to how iOS installs home-screen web apps: several of the
`apple-mobile-web-app-*` meta tags (status bar style, title, icons) are
commonly understood to be read once, at "Add to Home Screen" time, and
baked into that Home Screen icon — not re-read from the live page on every
launch. If that's what's happening, no further code change will fix this;
Austin needs to remove the existing Home Screen icon and re-add it via
Share > Add to Home Screen so iOS picks up the new meta tag. Told him to
try that before assuming the CSS/meta-tag change itself is wrong.

**This is build 5.**

**Not pushed yet** — same as every phase, pushing is on Austin:
```
cd "/Users/austinpeterson/Documents/Claude Projects/Local Restaurant Map"
git push
```

### Phase 3 closed out (2026-08-28)

Austin confirmed on build 5: **both bugs fixed.** Bottom bar gone for good
(the `touch-action: none` fix worked — confirms this really was WKWebView's
native bounce, not something reachable via JS event handling). Top fade
gone too (the solid status bar took effect, most likely after Austin
deleted and re-added the Home Screen icon so iOS picked up the new
`apple-mobile-web-app-status-bar-style` meta tag).

**Exit criteria met.** One follow-up noted for later, not blocking: the
solid status bar is currently whatever `default` renders as (light,
unstyled) rather than a deliberate color — logged in PROJECT_PLAN.md's
Phase 7 (polish) section to pick a real color for it during the general
visual design pass, rather than re-opening Phase 3 for a cosmetic tweak.

**Phase 3 is done.** Austin is starting Phase 4 (map + list display) in a
new chat.

---

## Phase 4 — Map + list display

**Goal (PROJECT_PLAN.md):** every saved restaurant visible and tappable on
the map and in a list; Want-to-Go and Been pins visually distinct; tapping a
pin opens a detail card with all stored fields; the plain interim Phase 2
list gets retired.

### Design decisions Austin made up front (2026-08-28)

- **Pins: rating-aware.** A "Been" pin is a solid filled teardrop with its
  star rating printed right in it; a "Want to Go" pin is a hollow outlined
  teardrop with no number. Rejected the simpler colour-only option — a
  number in the pin means the map itself carries the verdict, so scanning
  for "where are the good ones" doesn't require tapping anything.
- **Detail view: bottom sheet**, not a full-screen overlay. Slides up over
  the map, map stays visible above it. Same pattern Apple/Google Maps use,
  which matters because the reason you tap a pin is usually "what is this
  one, and what's near it" — a full-screen view throws away the second half
  of that question.
- **List: upgrade the existing panel** rather than a half-sheet or a
  Map/List toggle. Keeps the ☰ List button and full-height panel, but the
  rows get real content and a row tap now means "show me this on the map."

### What was built

**`js/map-pins.js` (new)** — the pin layer.
- Renders every restaurant with a lat/lng as a Leaflet `divIcon` marker in a
  single `L.layerGroup`, re-rendered wholesale on every `plateledger:changed`
  event (add, edit, delete, import) so the map can never drift from storage.
- Pin geometry note worth keeping: the pin is a 30×30 box rotated -45°, which
  puts its sharp corner ~6px *below* that box. So `iconSize` is [30, 40] and
  `iconAnchor` is [15, 36], not the naive [15, 30] — get this wrong and every
  pin sits visibly off its actual coordinates.
- A "Been" entry with no rating yet shows a bullet rather than an empty pin.
  Ratings of 4-5 get a gold rim on top of the filled red, so the best places
  separate from the merely-visited on a dense map.
- `focus(r)` centres the map on one restaurant and opens its sheet — this is
  what a list row tap calls. It pans up ~90px afterward, because a pin at the
  true centre would sit behind the sheet.
- **Initial view:** if any restaurants are saved, the map fits to their
  bounds on load instead of using geolocation. Geolocation resolving a second
  later would otherwise yank the view away from the pins you just fitted to,
  so the pin layer sets `PlateLedgerMap.suppressAutoCenter` and app.js's
  geolocation callback checks it.

**`js/detail-sheet.js` (new)** — the bottom sheet.
- Collapsed peek (~250px) shows name, status badge, a summary line of
  rating · price · cuisine · town, the address, and an Edit button. Expanded
  shows every stored field.
- Empty/null/`[]` fields are skipped entirely rather than rendered as blank
  rows. The schema's booleans are tri-state (`true` / `false` / `null` = never
  answered), so only the answered ones render — `null` is not "No".
- Drag to expand/collapse/dismiss, plus plain tap-to-toggle on the grabber
  and header (drag is nice, tap is the discoverable version). Written with raw
  touch events on purpose: the Phase 3 `touch-action: none` fix means there's
  no native drag behavior here to lean on.
- Stays honest after an edit/delete/import — on `plateledger:changed` it
  re-reads its record and either refreshes or closes if the record is gone.

**`js/list-settings.js` (rewritten rows)** — the interim list is retired.
- Rows now carry the same headline facts the pins do: name, gold star rating,
  price, cuisines, town, and "rec. <name>" for Want-to-Go entries. Empty
  fields are skipped instead of leaving stray separators.
- **Tapping a row no longer jumps straight into the edit form.** It closes
  the list, flies the map to that pin, and opens the detail sheet — Edit is
  one more tap from there. That's what made the old list feel like a debug
  screen: editing was the only thing a row could do.
- Opening the list closes any open sheet, so closing the list doesn't drop
  you back onto a stale card anchored to a pin you can no longer see.

**`js/app.js`** — now publishes `window.PlateLedgerMap = { map, suppressAutoCenter }`
so pins/sheet/list all share the one map instance instead of each making
their own.

**`css/styles.css`** — pin shapes, sheet (including the `--detail-base`
custom property the drag handler and the collapsed/expanded classes share, so
there's no jump when a drag ends and the class takes over), and richer list
rows.

### Verification done before handing this over

Ran the whole app headless in this session (Chromium/Playwright) against a
minimal Leaflet stand-in — this container has no network egress, so the real
CDN Leaflet can't be fetched here. Seeded three restaurants through the app's
own DB layer and confirmed: three pins with the right classes and labels
(`5` gold-rimmed, `3` plain, Want-to-Go hollow and blank); pin tap opens the
sheet with the correct name, badge, summary and all 14 detail rows; grabber
tap expands it; list rows render with rating/price/cuisine/town; opening the
list closes the sheet; a row tap closes the list, recentres the map on that
record's coordinates and opens its sheet; and deleting the focused record
closes the open sheet and drops its pin. Zero page errors or console errors
throughout.

Caveat that stub can't cover: real Leaflet tile rendering and actual on-map
pin *positioning* (the stub doesn't position markers). That's what the
on-device test below is for.

**This is build 6.**

### Your turn — push, then test on your phone

```
cd "/Users/austinpeterson/Documents/Claude Projects/Local Restaurant Map"
git push
```

Then check, with at least two or three restaurants saved (one "Been" with a
rating, one "Want to Go"):

1. Build tag at the bottom reads **build 6**.
2. On open, the map frames your saved restaurants rather than starting on
   your current location.
3. Every saved restaurant has a pin, and each pin sits on the right spot.
4. "Been" pins are solid red with the rating number in them; a 4- or 5-star
   one has a gold rim. "Want to Go" pins are hollow white with a red outline
   and no number.
5. Tapping a pin slides up a card with the name, a Been / Want to Go badge,
   the rating/price/cuisine/town line, the address, and an Edit button.
6. Dragging that card up (or tapping its grabber bar) expands it to show
   every field you filled in — and only the ones you filled in.
7. Dragging it down collapses it; dragging down again dismisses it. Tapping
   the map also dismisses it.
8. Edit from the card opens the normal edit form; saving a change updates the
   card underneath without you reopening it.
9. ☰ List rows show the star rating, price, cuisine and town.
10. Tapping a list row closes the list, moves the map to that restaurant, and
    opens its card.
11. Deleting a restaurant makes its pin and its card disappear.
12. The bottom bar and top fade from Phase 3 are still gone (nothing here
    should have disturbed that, but worth a glance).
