# Recommendation — How to Build This

## TL;DR

Build a custom, single-user installable web app for iPhone: **Leaflet.js + OpenStreetMap** for the map, restaurant data stored **locally on the phone** (with export/import for backup), and a **"Directions" button that hands off to Apple Maps**. No existing app on the market offers the specific combination of custom structured fields (non-chain flag, sit-down vs. order-at-counter, "good date spot," etc.) plus combinable area + cuisine + rating + price filtering that you described — and since this only needs to run on one device, a full custom app is achievable without any backend, hosting cost, or account system.

## Options Considered

### A. Existing restaurant-tracking apps (Beli, Truffle, Crumble, Dishrant, Mapstr, YUMMI, etc.)

These are largely built around social discovery — Beli's head-to-head comparative ranking system, Crumble's per-dish ratings with a shared friends' map, Mapstr's tag-and-note place-saving. None expose a schema like yours (chain vs. independent, service style, date-spot flag) with combinable multi-field filtering, and most assume a social/friends layer you don't want. You'd be working around the app's model instead of using your own.

**Verdict:** Doesn't fit the core requirement — rejected as the primary solution.

### B. Google Maps saved lists / Yelp bookmarks

Free, already on your phone, syncs automatically. But the metadata is limited to a star and a list name — no price/cuisine/service-style/date-spot fields, and no way to combine filters the way you want.

**Verdict:** Fine as a bookmarking tool, not as a personal review database — rejected.

### C. No-code database with a map view (Airtable, or similar)

Airtable in particular can get close: you define exactly the custom fields you want, filter/sort on any of them, and its Map view (with geocoding) plots records on a map. Free tier, mobile app, zero code to maintain.

**Trade-offs:** it's a general-purpose database wearing a restaurant-app costume, not a tool shaped around "search this town, filter to Thai, see what I've already tried." Directions to Apple Maps would mean tapping a generated link rather than a dedicated button, and the free-tier map view has record/feature limits.

**Verdict:** A legitimate zero-maintenance fallback if you'd rather not have a custom codebase at all — worth keeping in your back pocket — but you said you want this built for you and are comfortable with a real app, so it's not the primary recommendation.

### D. Custom-built app (recommended)

Given the answers you picked — iPhone only, single user, single device, "build it for me" — here's the shape:

- **Map framework:** Leaflet.js with OpenStreetMap tiles. Free, no API key or account needed, well-documented, straightforward for pins/markers/tap handling. (I also looked at Apple MapKit JS for a more native Apple-map look, but it requires an active Apple Developer Program membership — $99/year — just to render tiles. Not worth it for a single-user tool; easy to revisit later if you ever get a developer account for other reasons.)
- **Data storage:** on-device (browser local storage/IndexedDB). Since only one device needs the data, this avoids standing up any server, database, or account system entirely.
- **Backup:** built-in export to a file and import from one. This is required, not optional — local-only storage has no safety net otherwise (clearing Safari's data or replacing the phone would otherwise wipe everything).
- **Geocoding:** a free lookup (e.g. OpenStreetMap's Nominatim) used only when you add a place, converting the address to map coordinates. No ongoing cost since it's not called on every search.
- **Directions:** a button that opens `maps.apple.com/...` for the restaurant's location, which iOS hands off to the native Apple Maps app automatically.
- **Delivery:** a small static site (HTML/CSS/JS), hosted for free (e.g. GitHub Pages), added to your iPhone Home Screen so it opens full-screen like a real app.

**Why this wins:** it's the only option that gives you the exact data model and search behavior you described, with no recurring cost, no signups, and nothing to host or maintain beyond the app itself.

## Addendum: CloudKit for automatic backup (evaluated 2026-08-25)

Austin asked whether storing data in iCloud via CloudKit could remove the need for manual export/import backups. Findings: CloudKit JS requires the same paid Apple Developer Program membership ($99/yr) already ruled out for MapKit JS, plus setting up an iCloud container (normally via an Xcode/native-app project), a "Sign in with Apple" auth flow in the web app, manual index setup in the CloudKit Dashboard, and a real server to host the app (a plain static file won't work due to cookie requirements). That's a lot of infrastructure to take on just for backup on a single-user, single-device app.

**Decision: deferred to v2.** v1 keeps local storage + export/import. If Austin later wants a developer account anyway (e.g. for MapKit or a native app), CloudKit becomes more attractive; otherwise a lighter free backend (Firebase/Supabase) is worth considering as a lower-friction alternative for automatic backup. See REQUIREMENTS.md §10 and PROJECT_PLAN.md's v2 backlog.

## Addendum: native app without a paid developer account (evaluated 2026-08-27)

Austin asked whether a native iOS app (Swift/Xcode) could be installed directly on his own phone without the $99/yr Apple Developer Program or the App Store, prompted by wanting to compare against the PWA's iOS Safari rendering quirks (see PROJECT_PLAN.md Phase 3). Findings: yes, this is possible with just a free Apple ID — Xcode can build and install an app straight to a connected iPhone over USB with no App Store involved. The catches: it requires a Mac (Xcode doesn't run on Windows/Linux), the app's provisioning certificate expires roughly every 7 days and the phone has to be reconnected to Xcode to reinstall it or the app stops launching, and a free account caps you at about 3 sideloaded apps on the device at once. Tools like SideStore can automate the weekly renewal without a computer, but that's a more involved setup on top of the base Xcode workflow.

**Decision: not pursued for v1.** This doesn't remove the original reason MapKit/CloudKit were ruled out (see above) — those still need the paid account regardless of the sideloading question — and the free-account path trades PWA installation friction (none) for a recurring 7-day resign requirement, which is worse for a "just works" personal tool. Worth knowing about if Austin ever wants a real native rebuild (e.g. once a developer account is justified for other reasons, per the v2 backlog), but the PWA approach stands for now.

## Recommended Path Forward

1. ~~Review REQUIREMENTS.md open questions~~ — done, see REQUIREMENTS.md §13.
2. Follow PROJECT_PLAN.md, starting a new chat in this project to build the first working version: data model, add/edit flow, map + pins, filters, Apple Maps handoff.
3. Try it on your phone; iterate from there.

## Sources consulted

- [7 Best Restaurant Tracking Apps in 2026 (Honest Comparison)](https://crumble.me/guides/best-restaurant-tracking-apps)
- [Beli - App Store](https://apps.apple.com/us/app/beli/id1478375386)
- [Mapstr – Save & Follow Places - App Store](https://apps.apple.com/ug/app/mapstr-save-follow-places/id917288465)
- [Apple Maps on the Web - MapKit JS - Apple Developer](https://developer.apple.com/maps/web/)
- [Exploring CloudKit JS - Steve Harrison](https://steveharrison.dev/exploring-cloudkit-js/)
