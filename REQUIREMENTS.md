# Local Restaurant Map — Requirements

## 1. Overview

A personal, single-user restaurant database with a map-based interface. Austin adds restaurants he's heard about or been to, attaches his own metadata (ratings, price, cuisine, notes, etc.), and can later search/filter that personal database — by town, cuisine, rating, and more — to answer questions like "what Thai places in this town have I already been to, and how did I rate them?" Directions to a chosen restaurant open in Apple Maps; this app does not implement its own mapping, routing, or turn-by-turn navigation.

## 2. Goals

- A single searchable home for restaurants Austin has added, whether or not he's been yet.
- Rich, personal metadata per restaurant that goes beyond a simple star rating.
- Search by area (town/city) combined with multiple filters at once.
- One-tap handoff to Apple Maps for directions.
- Low ongoing cost/maintenance — this is a personal tool, not a product.

## 3. Non-Goals (see also §11 Out of Scope)

- Recreating map rendering, geocoding UI, or turn-by-turn directions — an existing map framework/service handles display, and Apple Maps handles directions.
- Social features (following, feeds, sharing with the public).
- Being a general restaurant-discovery/review aggregator (no pulling in Yelp/Google reviews).

## 4. Users

Just Austin (single user, v1). No accounts, logins, or permissions system needed. Data model should not actively preclude adding read-only sharing of the list later, but nothing should be built for that now.

## 5. Platform & Environment

- Primary and only target for v1: iPhone, used as an installable web app (add to Home Screen), so it opens full-screen like a native app without going through the App Store.
- Single device. No sync across phone/laptop/other devices required for v1.

## 6. Data Model

### 6.1 Fields on every restaurant (regardless of status)

| Field | Notes |
|---|---|
| Name | required |
| Address | required; geocoded to lat/lng for map placement |
| Town / City / Area | derived from address; used for area-based search |
| Status | `Want to Go` or `Been` |
| Date added | automatic |
| Recommended by | free text, optional — who told you about this place |
| Notes | open free text |

### 6.2 Additional fields once marked "Been"

| Field | Notes |
|---|---|
| Star rating | 1–5 |
| Price range | $ / $$ / $$$ / $$$$ |
| Non-chain flag | yes/no — is this a local/independent restaurant vs. a chain |
| Restaurant type / service style | e.g. sit-down, order-at-counter/bar, fast casual, food truck |
| Cuisine | one or more tags from a fixed, maintained list (e.g. Mexican, Thai, Italian). A restaurant can carry multiple cuisine tags. The list is extensible — a new cuisine can be added to it the first time it's needed (e.g. adding "Nigerian" the first time such a restaurant is logged) — but browsing/filtering should generally be from that maintained list rather than arbitrary free text. |
| Meal(s) had | what you ordered, free text or a simple repeatable list |
| Good date spot | yes/no flag |
| Visit date | when you went (see open question on multiple visits) |

### 6.3 Additional confirmed fields (decided 2026-08-25)

- **Would go again** — yes/no, separate signal from star rating; sometimes a place is good but a one-time thing.
- **Good for groups** — yes/no.
- **Outdoor seating / patio** — yes/no.
- **Reservations** — dropdown with three options: `Required` / `Accepted` / `Not Taken`.
- **Dietary-friendly options** — multi-select tags: `Vegetarian-friendly`, `Vegan-friendly`, `Gluten-friendly` (a place can have any combination, or none).
- **Noise level** — e.g. quiet / moderate / loud. This reflects the *current* known noise level only — if it changes on a later visit, the field is simply updated in place (see §6.4 on visits, no history is kept per field).
- **Website or menu link**
- **Photos** — attach a photo or two from a visit. Confirmed as wanted, but lower priority than the rest of v1 — acceptable to ship as a fast-follow (v1.1) if it meaningfully slows down the first working version.

**Rejected / excluded (not building):**
- Kid-friendly flag
- Phone number field

### 6.4 Multiple visits

A restaurant can be visited more than once. The app does **not** keep a separate rating/notes entry per visit. Instead:
- A **"Last visited"** date is tracked and updated each time you log a new visit.
- All review fields (rating, notes, price range, noise level, meal had, etc.) represent the current/latest state — updating them on a later visit simply overwrites the previous value. No per-visit history is stored.

## 7. Search & Filtering

- Search/filter by area: town or city name (derived from the stored address).
- Text search across name and notes.
- Filterable fields, combinable with AND logic: status (want to go / been), cuisine, minimum star rating, price range, restaurant type, non-chain flag, good-date-spot flag, and any accepted fields from §6.3.
- Worked example (from Austin's brief): search a specific town, filter to Thai, and see only the "Been" entries with his ratings.

## 8. Map Behavior

- The map (rendered via an existing map framework — see RECOMMENDATION.md) shows pins for the current filtered/searched set of restaurants.
- Tapping a pin or a list entry opens a detail view/card for that restaurant with all its stored metadata.
- From the detail view, a "Directions" action opens the restaurant's location in the Apple Maps app (native handoff via a maps.apple.com link) — no directions/routing logic lives inside this app.
- "Want to Go" and "Been" entries must be visually distinguishable on the map (different color/icon). Exact styling is left to design/implementation judgment.

## 9. Adding / Editing / Deleting

- Add a restaurant with at minimum a name and address; address is geocoded automatically to place it on the map.
- Edit any restaurant at any time — most commonly, moving a "Want to Go" entry to "Been" and filling in the review fields.
- Delete a restaurant.

## 10. Data Storage & Backup

- Data lives locally on the one device (no server, no account) — consistent with the "single device is fine" decision.
- Because local-only storage has no built-in safety net (clearing browser data, losing/replacing the phone would wipe it), the app **must** support exporting the full database to a file (e.g. JSON) and re-importing it. This is a required feature, not a nice-to-have, given the storage approach.
- **CloudKit considered and deferred to v2.** Storing data in iCloud via CloudKit JS was evaluated as a way to get automatic backup without manual export/import. It's not a lightweight add: it requires the same paid Apple Developer Program membership ($99/yr) already ruled out for MapKit JS (§ tech approach), plus setting up an iCloud container (normally done through an Xcode/native-app project), a "Sign in with Apple" auth flow inside the web app, manual index configuration in the CloudKit Dashboard, and running the app from a real server rather than a plain static file. That's a disproportionate amount of infrastructure for a single-user v1. **Decision: skip CloudKit for v1, keep local storage + export/import, and revisit automatic cloud backup as a v2 feature** — either CloudKit (if Austin ends up wanting a paid developer account anyway, e.g. for MapKit or a native app) or a lighter-weight free backend (e.g. Firebase/Supabase free tier) as a lower-friction alternative.

## 10a. Data Persistence Across App Versions (hard requirement)

As this app evolves — new versions, bug fixes, new features — **shipping/deploying an update must never clear or corrupt Austin's existing saved restaurant data.** Concretely:
- Local storage is the durable source of truth and must be treated as sacred: application code changes, redeployments of the static site, or a new build must never reset, wipe, or silently drop the existing on-device database.
- The data model must be versioned (a schema version stored alongside the data) so that future changes to the fields in §6 (adding a field, renaming one, changing a dropdown's options, etc.) are handled through a migration step that transforms existing records forward, rather than requiring or causing data loss.
- This is treated as a release-blocking requirement for every future version, not just v1 — any change that would clear existing data must be flagged and avoided (or, at minimum, must prompt an explicit export-first warning to Austin rather than silently deleting data).

## 11. Non-Functional Requirements

- Adding a place on the go should take very few taps — this needs to be fast to use while actually out and about.
- Should feel reasonably native on iPhone: installable to the Home Screen, full-screen, a real app icon.
- Browsing/searching already-saved data should ideally work with no signal (stretch goal, not required for v1).

## 12. Out of Scope (v1)

- Multi-user accounts, shared/collaborative editing, authentication.
- Android or cross-platform support.
- Social features (feeds, following, public sharing).
- In-app routing or turn-by-turn directions.
- Pulling in outside reviews or public restaurant data (Yelp/Google-style aggregation).
- Cloud sync across multiple devices.

## 13. Decisions Log

All initial open questions were resolved on 2026-08-25:

1. Field list (§6.3) confirmed — would-go-again, good-for-groups, outdoor seating, reservations (3-option dropdown), dietary tags, noise level, website/menu link, and photos are in; kid-friendly and phone number are out.
2. Cuisine is a fixed, maintained, multi-select list, extensible when a genuinely new cuisine comes up.
3. Multiple visits are tracked via a single "Last visited" date; review fields represent the latest state only, no per-visit history.
4. Photos are wanted, but lower priority — may ship as a fast-follow (v1.1) rather than blocking the first version.
5. "Want to Go" vs. "Been" pin styling is left to design/implementation judgment, as long as they're visually distinct.
6. CloudKit for automatic cloud backup was evaluated and deferred to v2 (see §10) — too much setup overhead (paid Apple Developer account, native-app-style container setup, auth flow) to justify for v1's single-device use case.

No further open questions at this time; see PROJECT_PLAN.md for phased build order.
