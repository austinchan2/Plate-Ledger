# Build Progress — Local Restaurant Map

Tracks phase-by-phase status against PROJECT_PLAN.md. Updated at each phase's
exit criteria: "built, awaiting your test" → "tested and confirmed working" (or
back to "in progress" if a fix is needed).

## Phase 0 — Project scaffolding

**Status: Built. Awaiting your test on your iPhone.** (2026-08-25)

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
