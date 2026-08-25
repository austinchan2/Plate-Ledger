# Plate Ledger

A personal, single-user iPhone app for keeping your own private database of restaurants — ones you've heard about and want to try, and ones you've been to and reviewed. Search by town and filter by cuisine, rating, price, service style, and more. Tap a place to open directions in Apple Maps.

## Status

**Phase 0 (project scaffolding) built, awaiting Austin's test on his iPhone.** See PROGRESS.md for phase-by-phase status and what to test next.

## What this is

- A "Want to Go" list, with notes on who recommended each place.
- A "Been" log with your own ratings, price range, cuisine, service style (sit-down vs. order-at-counter), a "good date spot" flag, notes, and more.
- Search by area combined with any of those filters at once — e.g. "Thai places in this town I've already been to."
- A map view for browsing, and a one-tap handoff to Apple Maps for directions. This app doesn't do its own mapping/routing — it leans on Apple Maps for that.

## Documents in this project

- **REQUIREMENTS.md** — full feature and data requirements, including the decisions log (all open questions resolved as of 2026-08-25).
- **RECOMMENDATION.md** — comparison of existing apps vs. a custom build, the recommended technical approach with rationale, and a CloudKit-for-backup evaluation.
- **PROJECT_PLAN.md** — phased build plan with exit criteria per phase; start here when building v1.
- **README.md** — this file.

## Planned technical approach

(Full detail and reasoning in RECOMMENDATION.md.)

- Installable web app (Add to Home Screen on iPhone) — no App Store needed.
- Map rendered with Leaflet.js + OpenStreetMap (free, no account required).
- All data stored locally on the phone — no account, no server — with export/import for backup.
- "Directions" button opens the place in Apple Maps.

## Next steps

1. Start a new chat in this project.
2. Point it at README.md, REQUIREMENTS.md, and PROJECT_PLAN.md to pick up where this planning chat left off.
3. Build v1 phase by phase per PROJECT_PLAN.md, testing on your phone at each phase's exit criteria.
