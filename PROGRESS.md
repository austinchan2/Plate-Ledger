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

### Build 7 — opening view flipped to geolocation, plus a "you are here" dot

Austin's call after reviewing build 6, before testing it: **current location
should win the opening view, not the saved pins.** His reasoning, which is
worth keeping because it invalidates the build-6 assumption: he'll have
restaurants saved all over the place, so fitting the opening view to all of
them zooms out to a near-useless regional or continental view. What he
actually wants on open is *what's near me*. He also asked for a pin showing
his own current location.

What changed:
- `js/app.js` swapped `getCurrentPosition` for `watchPosition`, so the
  location dot keeps up as he moves. **Only the first fix recenters the map**
  — later fixes just move the dot, because yanking the view while he's
  panning around would be maddening.
- Each fix dispatches `plateledger:located` (and sets
  `PlateLedgerMap.userPosition`); a failure before any fix dispatches
  `plateledger:locatefailed`.
- `js/map-pins.js` no longer fits to the saved pins on load. It draws a blue
  "you are here" dot on `plateledger:located`, and **only** falls back to
  fitting the saved pins if geolocation never comes through (denied,
  unavailable, timed out) — otherwise Austin would be staring at the
  zoomed-out fallback map of the continental US.
- The location dot is deliberately not pin-shaped — a blue dot with a white
  ring, same visual language as Apple/Google Maps — so it reads as "this is
  me", categorically different from a restaurant, at a glance. It sits under
  the restaurant pins (`zIndexOffset: -1000`) and isn't tappable: it's
  orientation, not a target.
- `suppressAutoCenter` survives but its job narrowed: it now only stops a
  first location fix arriving a moment *after* a list-row tap from dragging
  the view off the restaurant Austin just asked to see.

**Bug caught by the headless test, worth remembering.** The first version of
the fallback set its `didFallbackFit` guard as soon as `locatefailed` fired,
whether or not it had actually fitted anything. When geolocation is missing
or denied *outright*, that event fires synchronously during page setup —
before the first IndexedDB read has returned any restaurants — so the guard
was consumed against an empty list and the map stayed parked on the
zoomed-out fallback view forever. Fixed by only setting the guard once
something is actually fitted, and re-checking on each render. The 8-second
*timeout* path always happened to fire after the pins had loaded, which is
exactly why this would have been easy to miss on device: it only reproduces
on an instant denial.

Re-verified headless, both paths: with geolocation, the map centres on the
reported position at zoom 13 with one location dot and no fit-to-pins; with
geolocation removed entirely, no dot, and the map falls back to framing the
saved restaurants. Zero errors either way. All build-6 behavior (pins, sheet,
list, focus, delete) re-tested and still passing.

**This is build 7 — that's what to check for on the build tag, not 6.**

### Your turn — push, then test on your phone

```
cd "/Users/austinpeterson/Documents/Claude Projects/Local Restaurant Map"
git push
```

Then check, with at least two or three restaurants saved (one "Been" with a
rating, one "Want to Go"):

1. Build tag at the bottom reads **build 7**.
2. On open, the map centres on **your current location** at street level, with
   a blue dot showing where you are. (If you deny the location prompt, it
   should instead frame your saved restaurants — that's the fallback.)
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

### Phase 4 closed out (2026-08-28)

Austin confirmed: **all tests pass.** Phase 4's exit criteria are met — every
saved restaurant is visible and tappable on both the map and the list, Been
and Want-to-Go pins are clearly distinct, and tapping a pin opens a detail
card with all stored fields.

Two things came out of his review, both handled:
- Opening view flipped to geolocation + a current-location dot — built and
  shipped in build 7 above, not deferred.
- **Deferred to Phase 5:** the list should be ordered by proximity to
  wherever the map currently is, so panning to another city and opening the
  list surfaces that city's places first. Logged in PROJECT_PLAN.md's Phase 5
  section — it belongs there rather than as a Phase 4 patch, since Phase 5
  is already rebuilding how the list decides what to show.

**Phase 4 is done.** Phase 5 (search & filtering) is next, in a new chat.

## Phase 5 — Search & filtering

### Build 8 — search box, combinable filters, and proximity-ordered list

Search & filtering (REQUIREMENTS.md §7), plus the proximity-ordered list
Austin asked for during the Phase 4 review.

**Search.** One box at the top of the ☰ List panel, matching name, notes,
town, and full address (case-insensitive substring). Typing a town name
(the "area search" bullet in §7) and typing a dish/keyword (the "text
search" bullet) both go through this one field rather than two separate
controls — simpler to use, and the worked example in §7 doesn't actually
need them kept apart.

**Filters.** A "Filters" button next to the search box expands a collapsible
panel (max 45vh tall, scrolls independently so it can never push the list
off-screen) with every field REQUIREMENTS.md §7 calls for: status (All /
Want to Go / Been), cuisine (multi-select, pulls from the same extensible
list the Add/Edit form uses — including any custom cuisines Austin's
added), minimum star rating (tap a star to set the floor), price range,
service style, non-chain, good date spot, would go again, good for groups,
outdoor seating, reservations, dietary-friendly tags, and noise level.
"Clear filters" resets all of them in one tap (search text has its own
native clear "x" and isn't touched by it).

Filters combine with **AND logic across fields**, and **OR logic within a
field that accepts multiple values** — e.g. picking "$" and "$$" shows
either price, not neither; picking cuisine "Thai" and status "Been" shows
only entries that are both. The "Filters" button itself shows a live count
of how many filter dimensions are active (e.g. "Filters (2)"), so it's
obvious at a glance whether the list is currently narrowed down.

**Proximity-ordered list.** Replaces Phase 4's Want-to-Go/Been alphabetical
grouping entirely. The list is now one flat set of rows, sorted by distance
from wherever the map is centred **at the moment the list is opened**
(`map.getCenter()`, not GPS position — Austin's framing: "what's near where
I'm looking," which isn't always where he actually is). Each row now shows
its actual distance (e.g. "0.4 mi", or "< 0.1 mi" once you're right on top
of it) plus a small Been/Want-to-Go badge, since the old section headers
that used to carry that information are gone. Records without coordinates
(shouldn't normally happen — address is required and geocoded at add time)
sort to the very end, alphabetically, rather than being dropped.

**Riding along:** `js/app.js`'s touch-guard selector
(`NATIVE_SCROLL_SELECTOR`) was missing `.detail-body` — a leftover from
Phase 4 that meant the detail sheet's scrollable body was never actually
exempted from the Phase 3 touchmove-preventDefault guard, the same class of
bug Phase 3 fixed for the other panels. Added it, along with the new
`.filters-panel`, so both scroll natively on-device instead of fighting the
global bounce guard.

**Tested headless in this session** (Node `vm` + a small hand-rolled DOM
shim — no browser or npm registry access from this bridge, so jsdom/
fake-indexeddb couldn't be installed; `PlateLedgerDB.getAllRestaurants` was
stubbed with fixture data instead of touching real IndexedDB). Ten fixture
restaurants across Denver/Boulder/Fort Collins/Aurora, two with no
coordinates. Confirmed: default proximity order puts the closest restaurant
first and no-coordinate records at the end, alphabetically; the exact §7
worked example (search "Boulder", filter cuisine Thai, status Been) returns
only the two matching Boulder "Been" Thai spots, closest first, both
showing their star rating, with the filter badge reading "Filters (2)";
minimum-rating, price-range (OR-within-field), and non-chain (tri-state)
filters each isolate the right subset; Clear filters restores the full list
and resets the badge; an unmatched search shows the empty-state message.
27 assertions, all passing. Syntax-checked the on-device files directly
with `node --check` as well.

**Caveat that test can't cover:** the shim isn't a real browser, so actual
touch/scroll behavior of the new `.filters-panel` and iOS's rendering of
the search input, checkboxes, and pill buttons still need the on-device
check below.

**This is build 8.**

### Your turn — push, then test on your phone

```
cd "/Users/austinpeterson/Documents/Claude Projects/Local Restaurant Map"
git push
```

Then check, with at least five or six restaurants saved across a couple of
different towns (mix of Want to Go / Been, ratings, cuisines, price
ranges):

1. Build tag at the bottom reads **build 8**.
2. Open ☰ List: restaurants are no longer grouped into "Want to Go" /
   "Been" sections — it's one list, nearest first, each row showing a
   distance (e.g. "0.4 mi") and a small Been/Want-to-Go badge.
3. Pan the map to a different area, then open the list — that area's
   restaurants should now be first.
4. Type a town name (or part of a restaurant's name, or a word from its
   notes) into the search box at the top of the list — the list narrows
   to matches as you type.
5. Tap "Filters" — a panel expands below the search box with Status,
   Cuisine, Minimum rating, Price range, Service style, Non-chain, Good
   date spot, Would go again, Good for groups, Outdoor seating,
   Reservations, Dietary-friendly, and Noise level.
6. Try the worked example: search a town you have restaurants in, filter
   Cuisine to one you've tagged, and set Status to "Been" — you should see
   only that town's Been entries in that cuisine, with their ratings.
7. Select two price ranges (e.g. $ and $$) — restaurants at either price
   show up, not just one.
8. The "Filters" button shows a count (e.g. "Filters (2)") whenever
   anything's active, and goes back to plain "Filters" after tapping
   "Clear filters" inside the panel.
9. Everything from Phase 4 still works: tapping a row closes the list,
   moves the map to that restaurant, and opens its detail card; pins,
   the "you are here" dot, and opening-view geolocation are unchanged.
10. Open a restaurant's detail card and drag it to the expanded view —
    scrolling through its full field list should feel like normal native
    scrolling (this is the `.detail-body` touch-guard fix riding along
    in this build).

### Open items still logged for later phases

- Add-restaurant search quality (Nominatim not prioritizing actual
  restaurant matches) — deferred since Phase 2, unchanged by this phase.
  See PROJECT_PLAN.md's "Known issues carried forward."
- Status bar color and the rest of the visual design pass — Phase 7.

### Phase 5 closed out (2026-08-28)

Austin confirmed: **all tests pass.** Phase 5's exit criteria are met — the
§7 worked example (search a town, filter cuisine, filter status, see rated
results) works end-to-end on-device, and opening the list after panning to
a new area surfaces that area's restaurants first.

**Phase 5 is done.** Phase 6 (Apple Maps handoff) is next, in a new chat.

## Phase 6 — Apple Maps handoff

Added a "Directions" button to the restaurant detail card (in the header,
next to Edit — Directions comes first since it's the action Austin will
tap most). It builds a `maps.apple.com` link from the restaurant's stored
coordinates (`daddr=<lat>,<lng>`), falling back to the stored address text
if coordinates are missing, and labels the destination pin with the
restaurant's name (`q=`). No `dirflg` is set, so Apple Maps opens with its
own driving/walking/transit picker rather than us guessing a mode. Tapping
it is a real link tap (not a JS-synthesized navigation), which is what lets
iOS hand off to the native Apple Maps app instead of opening a web preview.

**This is build 9.**

### Your turn — push, then test on your phone

```
cd "/Users/austinpeterson/Documents/Claude Projects/Local Restaurant Map"
git push
```

Then check:

1. Build tag at the bottom reads **build 9**.
2. Open any restaurant's detail card (tap a pin or a list row) — a red
   "Directions" button now sits next to "Edit" in the card header.
3. Tap "Directions" from the installed Home Screen app — it should open
   the native **Apple Maps app** (not a Safari tab / web preview), with
   the restaurant already set as the destination and ready for
   turn-by-turn directions.
4. The destination pin/label in Apple Maps should show the restaurant's
   name.
5. Try it on a restaurant you added by manual address entry (no map pin
   search) too, if you have one — it should still work, just routed off
   the address text instead of coordinates.
6. Everything else (pins, list, filters, detail card fields) is unchanged
   from Phase 5.

### Open items still logged for later phases

- Add-restaurant search quality (Nominatim not prioritizing actual
  restaurant matches) — deferred since Phase 2, unchanged by this phase.
  See PROJECT_PLAN.md's "Known issues carried forward."
- Status bar color and the rest of the visual design pass — Phase 7.

### Phase 6 closed out (2026-08-28)

Austin confirmed on device: Directions opens the native Apple Maps app with
the destination set. Two notes from testing, both handled without reopening
this phase:

- The destination pin/label in Apple Maps shows Apple's own place name for
  that location, not Plate Ledger's saved restaurant name. **Austin
  confirmed this is fine as-is — no fix needed.**
- Only manual address entry reliably works when adding a restaurant right
  now — searching by name (e.g. "5 Star BBQ") doesn't always return a
  result, and manually-entered addresses can geocode a couple of blocks off
  from the actual location (test case: 430 W 800 N, Orem). Both are logged
  as Phase 7 items, along with two new feature requests from this test
  pass (a jump-to-current-location button, and a clear/"x" button on the
  list search box) — see PROJECT_PLAN.md's Phase 7 section.

**Phase 6 is done.** Phase 7 (polish) is next, in a new chat.

## Phase 7 — Polish & real-world use

First pass at the whole Phase 7 backlog (PROJECT_PLAN.md), all in one build
per Austin's request ("this one's a big one, let's do as much as we can
first pass"). Covers:

- **Real app icon.** A white map-pin silhouette (echoing the app's own
  `.pl-pin` shape) on a brick-red gradient, with a thin gold ring accent —
  same visual language as the in-app "high rating" pin. Regenerated
  `icons/apple-touch-icon.png`, `icons/icon-192.png`, `icons/icon-512.png`.
  Replacing the Home Screen icon needs a delete-and-re-add, same as the
  Phase 3 status-bar meta tag did — see the test checklist below.
- **General visual design pass.** Introduced a real set of design tokens
  (`:root` CSS variables in `css/styles.css` — brick-red primary, gold
  accent, warm cream neutrals instead of cold grays) used consistently
  everywhere instead of one-off hex values. List rows are now card-style
  (border, rounded corners, shadow) instead of flat dividers. Every raised
  tappable control (FAB, top buttons, pills, list rows, form buttons) now
  has a visible press state (`:active` scale + opacity) — nothing had any
  touch feedback before this, which made taps feel unregistered. Buttons,
  badges, and the detail sheet's action buttons now use pill/rounded
  shapes consistently; form inputs get a visible focus ring. No structural
  HTML changes — this was a CSS-only pass, so nothing about *how* the app
  works changed, only how it looks.
- **Home Screen naming — audited, no change needed.** `apple-mobile-web-app-title`
  is already set to "Plate Ledger" (was already correct since early
  scaffolding), which is what iOS actually reads for the Home Screen label.
- **Status bar color — investigated, staying as-is (`default`).** iOS only
  exposes three values for `apple-mobile-web-app-status-bar-style`:
  `default` (light bar), `black` (solid black bar), or `black-translucent`
  (transparent — page content shows through, tinted). There's no way to
  give it an arbitrary hex color; `black-translucent` is the only mode
  where the page's own color could show through at all, and that's the
  exact mode Phase 3 moved away from after five build iterations to kill a
  top-of-screen fade artifact. Re-opening that isn't worth risking for a
  bar color, especially since the app's panels (List/Settings/Add forms)
  all have white headers right at the top — `black` would make their
  icons unreadable. Leaving `default`, which already reads fine against
  the app's white/cream panels.
- **Splash flash reduced.** `manifest.json`'s `background_color` (the
  color iOS shows briefly on cold launch before content paints) changed
  from plain white to the new warm cream (`#faf6ee`) to match the app's
  actual background instead of a slightly-off white.
- **Jump-to-current-location button** (`js/app.js`, new `#locate-btn`,
  stacked directly above the Add FAB). Calls `map.setView()` on
  `PlateLedgerMap.userPosition`; if no GPS fix has arrived yet (or
  geolocation failed), tapping it just does a quick nudge animation
  instead of silently doing nothing.
- **Clear button on list search** (`js/list-settings.js`). A round "×"
  button appears inside the search box once there's text, clearing it in
  one tap — a real DOM element rather than relying on iOS's built-in
  `type="search"` cancel button, which wasn't a reliable enough target.
- **Add-restaurant search reliability** (`js/geocode.js`). Name search now
  passes `layer=poi` first (biases toward actual places, not
  streets/addresses), falling back to an unfiltered retry if that comes
  back empty. Both search and manual-address lookup now also pass a soft
  location bias (`viewbox` + `bounded=0`, never a hard filter) built from
  the map's current view or a live GPS fix, via a new `locationHint()`
  helper in `js/restaurant-form.js`. Worth setting expectations on this
  one honestly: Nominatim's free-text business-name search has real limits
  — this should meaningfully help, but won't guarantee every place is
  found, since OSM's POI coverage and name-matching aren't Google-Maps-grade.
- **Manual-address geocoding accuracy** (`js/geocode.js` +
  `js/restaurant-form.js`). `geocodeAddress()` now returns up to 3 ranked
  candidates instead of blindly trusting whichever Nominatim ranked first,
  and the manual-entry flow shows them the same way name search already
  does — tap the right one. This directly targets the "430 W 800 N, Orem"
  bug: grid-numbered addresses are genuinely ambiguous across towns that
  share the same numbering scheme, so seeing (and picking between) the
  actual candidates is the honest fix, not a guess at a single "best" one.

**This is build 10.**

### Your turn — push, then test on your phone

```
cd "/Users/austinpeterson/Documents/Claude Projects/Local Restaurant Map"
git push
```

Then, since the icon changed, **delete the Plate Ledger icon from your Home
Screen and re-add it from Safari** (same as the Phase 3 status-bar fix
needed) — otherwise you'll keep seeing the old placeholder icon even after
the page itself updates. After that:

1. Build tag at the bottom reads **build 10**.
2. New Home Screen icon: a white map-pin on a brick-red background with a
   thin gold ring — not the old placeholder.
3. General look: buttons, badges, and list rows should read as more
   "finished" — rounded card-style list rows with shadows, pill-shaped
   buttons, and every button should visibly dim/shrink slightly the moment
   you press it (List, Settings, +, pills, Save, Edit, Directions, etc.).
4. Tap **☰ List** — a small round **×** should appear inside the search
   box as soon as you type something, and tapping it clears the search
   instantly.
5. On the map, a new **round button with a crosshair/target icon** should
   sit directly above the **+** button — tap it to recenter the map on
   your current location. If you tap it before a GPS fix has arrived, it
   should just do a quick wiggle rather than nothing happening.
6. Add a restaurant using **search by name** — try "5 Star BBQ" again (or
   another real local place) and see if it turns up now. Not guaranteed
   every time, but should be noticeably better than before.
7. Add or edit a restaurant using **manual address entry** — enter an
   address and tap "Look up address". You should now see a short list of
   candidate matches to tap (not just get dropped straight to "confirmed")
   — try "430 W 800 N, Orem" again and check whether the right one is
   in the list and whether picking it lands the pin correctly this time.
8. Confirm nothing else broke: pins, detail sheet, filters, Apple Maps
   Directions button, Export/Import/Delete all in Settings.

### Open items still logged for later phases

- None carried forward from the original Phase 7 backlog yet — this was a
  first pass at all of it. Log anything Austin flags from this test pass
  as new Phase 7 follow-ups (or a v1.1 item, per PROJECT_PLAN.md) once
  reviewed.

### Build 11 — palette re-theme, map style, geocoding fix, FAB fix (2026-08-28)

Follow-up round after Austin's first look at build 10, all four items he
raised:

- **Full color re-theme to the "Haunter" palette** from
  https://pokepalettes.com/#haunter. New `:root` tokens in
  `css/styles.css`: `--color-primary: #524162` (deep plum — replaces
  brick red for solid buttons/badges/pins, chosen over the palette's
  lighter `#ac6acd` specifically for contrast against white text/icons),
  `--color-primary-light: #ac6acd` (gradient partner), `--color-accent:
  #de4a31` (vivid orange-red, replaces gold for ratings/"high rated" pin
  rim — same role, new color), and a dedicated `--color-danger`/
  `--color-danger-dark` (`#b41818`/`#6a0000`) for delete/destructive
  actions, which needed their own red now that primary is no longer red.
  Neutrals shifted cool (lavender-tinted grays/whites) to suit a purple
  palette instead of the old warm cream scheme. The app icon was
  regenerated in the new gradient + accent ring. The "you are here" GPS
  dot deliberately stays map-convention blue — recoloring it purple risked
  it reading as another pin type.
- **Map tiles restyled.** Swapped the stock OpenStreetMap raster tiles
  (`js/app.js`) for CARTO's free, no-API-key Positron (light) basemap —
  much quieter than stock OSM's road/label-heavy default, which was
  Austin's complaint. Added a subtle purple color-wash over the map
  (`css/styles.css`'s `#map-color-wash`, a screen-space tint via
  `mix-blend-mode: multiply` — not a geographic overlay, doesn't intercept
  taps) tying the now much-quieter basemap into the new palette.
- **Add-button (+) centering fixed.** `#add-fab-btn` was relying on
  `line-height` alone to center its "+" glyph, which doesn't account for
  the character's own font metrics not being perfectly centered in its em
  box — same underlying issue `#locate-btn`'s SVG never had, since that
  one already used flexbox centering. Added `display: flex; align-items:
  center; justify-content: center` (and `padding: 0`) to both
  `#add-fab-btn` and `#settings-toggle-btn` (same glyph-button pattern) to
  fix it properly rather than nudging line-height by feel.
- **Manual-address geocoding: structured query instead of free text**
  (`js/geocode.js`). Austin's retest of "430 W 800 N, Orem, UT 84057"
  still returned three wrong candidates, none containing "800" at all —
  confirmed the real bug: Nominatim's free-text parser was mis-tokenizing
  Utah/Mountain-West grid addresses (two number+direction pairs — "430 W
  800 N" = house number 430 on the street "West 800 North" — badly
  confuses a parser expecting one). `geocodeAddress()` now parses the
  typed address into Nominatim's *structured* search fields (street /
  city / state / postalcode / country) via a new `parseAddressComponents()`
  — pulling the grid-address pattern out explicitly as the street field —
  before falling back to the old free-text search if parsing isn't
  possible or comes back empty. Verified the parser itself against the
  exact reported string and several other shapes (see the geocode.js file
  header for the reasoning); couldn't verify the live Nominatim response
  from this session (no network egress to nominatim.openstreetmap.org from
  either this bridge or the cloud container it runs in), so this needs
  Austin's on-device confirmation.
- **"5 Star BBQ" name search — still not resolving, most likely an
  OpenStreetMap data-coverage gap, not a query bug.** Couldn't reach
  Nominatim directly from this session to test further. The POI-layer-bias
  + fallback logic added in build 10 is still in place and should help in
  the more common case (a real, indexed place ranking poorly without a
  location bias) — but if this specific business genuinely isn't in OSM's
  database under any close name/spelling, no amount of query tuning on our
  end can produce a result that doesn't exist upstream. Austin can check
  this directly: search "5 Star BBQ" at
  https://nominatim.openstreetmap.org/ui/search.html — if nothing shows up
  there either, it's a data gap (fixable only by adding the place to OSM
  itself, e.g. via openstreetmap.org's own editor) and manual address
  entry is the reliable path for that one place meanwhile. If Nominatim's
  own UI *does* find it, that would point back to something in our query
  logic and is worth flagging for another look.

**This is build 11.**

### Your turn — push, then test on your phone

```
cd "/Users/austinpeterson/Documents/Claude Projects/Local Restaurant Map"
git push
```

Then, since the icon changed again, **delete the Plate Ledger icon from
your Home Screen and re-add it from Safari**. After that:

1. Build tag reads **build 11**.
2. New Home Screen icon: the same white pin shape, now on a lavender-to-
   plum gradient with an orange-red ring (Haunter colors) instead of
   brick red/gold.
3. Whole app should read purple/plum now — buttons, badges, pins,
   selected filters, "Been" pin fill, focus rings — with the orange-red
   accent showing up on star ratings and the high-rated pin rim. Delete
   buttons should be a true red (distinct from the purple), not the old
   brick red.
4. Map should look noticeably calmer/lighter — fewer bold road colors,
   more white space, subtle purple tint overall — not the old
   yellow/orange-heavy standard OSM look.
5. The **+** button's plus sign should look properly centered now, not
   shifted.
6. Re-test manual address entry with **"430 W 800 N, Orem, UT 84057"** —
   check whether the candidate list now includes the actual right
   location (should look meaningfully different from before, not the same
   three wrong streets).
7. Re-test **"5 Star BBQ"** search-by-name — if it's still empty, try the
   Nominatim link above to see whether OpenStreetMap has this place at all
   before assuming it's still our bug.

### Open items still logged for later phases

- Whatever comes out of this round's on-device test — new findings get
  logged as Phase 7 follow-ups once reviewed.

### Build 13 — icon-matched pins, real tile fix, robust + icon, manual pin-drop (2026-08-28)

Note first: **build 12 was Austin's own commit**, done separately from
this chat — he replaced the app icon with a new "Plate & Pin" shape (a
plate viewed at an angle, rim visible as a ring, on a pin-style marker
foot; "H1 / Deep Haunter" colorway) and fixed a version-marker gap left
over from build 11. This session's work picks up as **build 13**, not 12,
to avoid colliding with that commit. See its own message
(`git log`, commit `bebf3c2`) for the full detail on the icon choice.

Austin reported back on build 11's results with build 12's new icon
already in place: colors and map style approved, but four things needed
another pass.

- **Map pins now echo the icon's plate-rim rings.** High-rated (4-5 star)
  "Been" pins get a genuine concentric ring treatment (`css/styles.css`,
  layered `box-shadow` rings around `.pl-pin-been.pl-pin-high`) instead of
  just a recolored single border — an echo of the "Plate & Pin" icon's rim
  rings, reserved for the pins that are already meant to stand out. Didn't
  rebuild the pin's base teardrop shape into a true circle+tail to chase
  the icon's rounder silhouette exactly — the rotated-square-with-3-round-
  corners construction is the standard, robust way to get a bordered
  map-pin shape in CSS (a separate circle + pointer element runs into real
  border/shadow seam problems at the join), and at the 30px size these
  render on the map the two constructions are close to indistinguishable.
  Said so rather than silently doing a partial job.
- **CARTO map tiles were showing a repeating "API Key Required"
  watermark** — their anonymous free tier apparently changed terms since
  build 11 (worth remembering: this is the *second* free/no-key tile host
  to break on us). Switched to Esri's "Light Gray Canvas" basemap
  (`js/app.js`) — base layer + a separate label/reference layer stacked on
  top, which is how Esri's own docs say to use it — same quiet, minimal
  look, genuinely free with no signup at this volume. If this one also
  breaks down the line, the durable fix is a real free-tier API key from
  one provider (MapTiler/Stadia/Esri), not a fourth anonymous host.
- **Add-button (+) — actually fixed this time.** Flex-centering a text "+"
  character (build 11's fix) wasn't enough, because a font glyph's own ink
  isn't guaranteed to sit centered in its line box regardless of how the
  box itself is centered. Replaced the text character with a small
  hand-built SVG plus sign (`js/list-settings.js`) — exact, centered
  geometry, no font metrics involved at all. Same approach `#locate-btn`'s
  icon already used successfully.
- **Manual address entry / "70 N Geneva Rd" — root-caused, and it's a data
  limit, not a bug we can query our way around.** The structured-query fix
  from build 11 should be working correctly (verified its parsing output
  offline again), but Austin's retest of "70 N Geneva Rd" only resolved to
  the *street* ("Geneva Road, Orem, Utah") with no house number — that's
  what Nominatim returns when OpenStreetMap has the road but no address
  point for that specific building, which no amount of query tuning can
  manufacture. Rather than keep guessing at a fourth geocoding fix, added
  the fallback every real map app has for exactly this: **"set the exact
  spot on the map"**, offered from both the search and manual-address
  flows. It hides the form, drops a fixed crosshair pin at screen center,
  and lets Austin pan the real map underneath it (drag-the-map-not-the-pin
  — the same precise, standard pattern Google Maps/Uber use for a location
  picker) until it's exactly right, then "Use this location" reads the
  map's center coordinates straight in. No geocoding involved at all for
  this path, so it can't be wrong the way a geocoder can. The Add/List/
  Settings buttons are hidden for the moment (`body.pl-picking-location`)
  so there's no way to accidentally open a second form mid-pick and corrupt
  the flow.

**This is build 13.**

### Your turn — push, then test on your phone

```
cd "/Users/austinpeterson/Documents/Claude Projects/Local Restaurant Map"
git push
```

No icon change this time, so no Home Screen re-add needed. Then check:

1. Build tag reads **build 13**.
2. Map should load clean now — no "API Key Required" watermark repeating
   across it.
3. Any 4-5 star "Been" pin on the map should show a visible double-ring
   (bullseye) accent around it, not just a plain colored border.
4. The **+** button's plus sign should now look genuinely centered — this
   was a real fix (SVG icon, not a font tweak), so it should be resolved,
   not just nudged.
5. Add or edit a restaurant, get to the address step, and look for a new
   link: **"Or set the exact spot on the map"** (search flow) / **"None
   of these right? Set the exact spot on the map"** (manual-entry flow,
   after a lookup). Tap it — the form should disappear, a banner should
   appear at the top ("Pan the map to position the pin") with a crosshair
   pin fixed at screen center, and panning/zooming the map underneath
   should let you position it precisely. Tap "Use this location" and
   confirm it drops you back into the form with that address confirmed.
   Try "Cancel" too, and confirm it just returns you to the form
   unchanged.
6. Try this pin-drop specifically for "70 N Geneva Rd" (5 Star BBQ) and
   "430 W 800 N" (or any address that's been resolving wrong/imprecise) —
   this should now be the reliable path for those, independent of whatever
   Nominatim does or doesn't have mapped.
7. Sanity-check nothing else regressed: other pins (non-high-rated Been,
   Want to Go), list, filters, detail sheet, Directions, Settings.

### Open items still logged for later phases

- Whatever this round's test turns up.

### Confirmed by Austin on device (2026-08-29)

All of build 13 tested and approved as-is, no further changes requested:
Esri map tiles (watermark gone), plate-rim double-ring accent on 4-5 star
"Been" pins, the SVG-based FAB "+" (genuinely centered now), and the new
map pin-drop fallback for setting a restaurant's exact location. No open
items carried forward from this round.

**Phase 7 (polish) is closed.** Austin will open a new chat with
instructions for the next stage/features.
