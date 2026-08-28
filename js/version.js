// Build/version marker — purely so Austin can glance at the app and know
// for sure a given push actually reached his phone, rather than guessing
// whether he's looking at a stale cached copy. Not part of the data model,
// not persisted, nothing else in the app reads this.
//
// Habit: bump BUILD_NUMBER by 1 and update BUILT_AT every time a change
// meant to reach Austin's phone gets committed (see phase_delivery_workflow
// in project memory) — including this file's own first commit, which is
// build 1.
window.PLATE_LEDGER_BUILD = {
  number: 4,
  builtAt: "2026-08-27 07:34 PM MDT",
};
