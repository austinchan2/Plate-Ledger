// Plate Ledger — Phase 1: IndexedDB storage layer.
// Owns the restaurant record schema (REQUIREMENTS.md §6), CRUD, per-record
// schema migration, and export/import. No UI here.

var PlateLedgerDB = (function () {
  "use strict";

  var DB_NAME = "plate-ledger";
  var DB_VERSION = 1; // IndexedDB object-store schema (bump + migrate in onupgradeneeded)
  var STORE_NAME = "restaurants";

  // Per-record schema version, independent of DB_VERSION above. This is what
  // makes REQUIREMENTS.md §10a's "no data loss on update" real: every record
  // read from storage (or from an imported file) is passed through
  // migrateRecord(), which upgrades old shapes to the current one instead of
  // ever discarding or resetting data.
  var CURRENT_SCHEMA_VERSION = 1;

  var STATUS = { WANT_TO_GO: "want_to_go", BEEN: "been" };
  var PRICE_RANGES = ["$", "$$", "$$$", "$$$$"];
  var SERVICE_STYLES = ["Sit-down", "Order-at-counter/bar", "Fast casual", "Food truck"];
  var RESERVATIONS_OPTIONS = ["Required", "Accepted", "Not Taken"];
  var DIETARY_TAGS = ["Vegetarian-friendly", "Vegan-friendly", "Gluten-friendly"];
  var NOISE_LEVELS = ["Quiet", "Moderate", "Loud"];
  // Fixed but extensible cuisine list (§6.2) — add new ones here as they come up.
  var CUISINES = [
    "American", "Italian", "Mexican", "Thai", "Chinese", "Japanese", "Indian",
    "French", "Mediterranean", "Greek", "Vietnamese", "Korean", "Spanish",
    "Middle Eastern", "BBQ", "Seafood", "Pizza", "Burgers", "Breakfast/Brunch",
    "Bakery/Cafe", "Vegetarian/Vegan",
  ];

  var CUSTOM_CUISINES_KEY = "plateLedgerCustomCuisines";

  // Cuisine list is fixed-but-extensible (REQUIREMENTS.md §6.2): CUISINES
  // above is the maintained baseline, and any cuisine typed into the form
  // that isn't already in it gets appended here (localStorage, not
  // IndexedDB -- it's a small flat list, not restaurant data) so it shows up
  // in the picker from then on.
  function getCuisineList() {
    var custom = [];
    try {
      custom = JSON.parse(localStorage.getItem(CUSTOM_CUISINES_KEY) || "[]");
    } catch (e) {
      custom = [];
    }
    return CUISINES.concat(
      custom.filter(function (c) {
        return CUISINES.indexOf(c) === -1;
      })
    );
  }

  function addCustomCuisine(name) {
    name = (name || "").trim();
    if (!name || getCuisineList().indexOf(name) !== -1) return getCuisineList();
    var custom = [];
    try {
      custom = JSON.parse(localStorage.getItem(CUSTOM_CUISINES_KEY) || "[]");
    } catch (e) {
      custom = [];
    }
    custom.push(name);
    localStorage.setItem(CUSTOM_CUISINES_KEY, JSON.stringify(custom));
    return getCuisineList();
  }

  var dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (event) {
        var db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
        // Future DB_VERSION bumps: add new indexes / stores here, migrating
        // existing data forward rather than recreating the store.
      };
      req.onsuccess = function (event) {
        resolve(event.target.result);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
    return dbPromise;
  }

  function withStore(mode, fn) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, mode);
        var store = tx.objectStore(STORE_NAME);
        var result;
        fn(store, function (r) {
          result = r;
        });
        tx.oncomplete = function () {
          resolve(result);
        };
        tx.onerror = function () {
          reject(tx.error);
        };
        tx.onabort = function () {
          reject(tx.error);
        };
      });
    });
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    // Fallback for older WebKit without crypto.randomUUID.
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Fills in any field missing from an older record shape with its current
  // default, and stamps schemaVersion. Add version-specific transforms here
  // (e.g. `if (record.schemaVersion < 2) { ... }`) as the schema evolves —
  // this is the mechanism, not a one-off.
  function migrateRecord(record) {
    var migrated = Object.assign({}, defaultRecord(), record);
    migrated.schemaVersion = CURRENT_SCHEMA_VERSION;
    return migrated;
  }

  function defaultRecord() {
    return {
      id: null,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      // 6.1 — base fields
      name: "",
      address: "",
      town: "",
      lat: null,
      lng: null,
      status: STATUS.WANT_TO_GO,
      dateAdded: null,
      recommendedBy: "",
      notes: "",
      // 6.2 — Been fields
      rating: null,
      priceRange: null,
      nonChain: null,
      serviceStyle: null,
      cuisines: [],
      mealsHad: "",
      goodDateSpot: null,
      lastVisited: null,
      // 6.3 — confirmed additional fields
      wouldGoAgain: null,
      goodForGroups: null,
      outdoorSeating: null,
      reservations: null,
      dietaryTags: [],
      noiseLevel: null,
      websiteUrl: "",
      photos: [], // v1.1 fast-follow; field reserved so future records don't need a migration to gain it
    };
  }

  function addRestaurant(fields) {
    if (!fields || !fields.name || !fields.address) {
      return Promise.reject(new Error("name and address are required"));
    }
    var record = migrateRecord(
      Object.assign({}, fields, {
        id: uuid(),
        dateAdded: new Date().toISOString(),
      })
    );
    return withStore("readwrite", function (store, setResult) {
      store.add(record);
      setResult(record);
    });
  }

  function getRestaurant(id) {
    return withStore("readonly", function (store, setResult) {
      var req = store.get(id);
      req.onsuccess = function () {
        setResult(req.result ? migrateRecord(req.result) : null);
      };
    });
  }

  function getAllRestaurants() {
    return withStore("readonly", function (store, setResult) {
      var req = store.getAll();
      req.onsuccess = function () {
        setResult(req.result.map(migrateRecord));
      };
    });
  }

  function updateRestaurant(id, patch) {
    return withStore("readwrite", function (store, setResult) {
      var getReq = store.get(id);
      getReq.onsuccess = function () {
        var existing = getReq.result;
        if (!existing) {
          setResult(null);
          return;
        }
        var updated = migrateRecord(Object.assign({}, existing, patch, { id: id }));
        store.put(updated);
        setResult(updated);
      };
    });
  }

  function deleteRestaurant(id) {
    return withStore("readwrite", function (store, setResult) {
      store.delete(id);
      setResult(true);
    });
  }

  function deleteAllRestaurants() {
    return withStore("readwrite", function (store, setResult) {
      store.clear();
      setResult(true);
    });
  }

  function exportAll() {
    return getAllRestaurants().then(function (restaurants) {
      return {
        app: "plate-ledger",
        schemaVersion: CURRENT_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        restaurants: restaurants,
      };
    });
  }

  // mode: "replace" clears the store first; "merge" (default) upserts by id.
  function importAll(data, mode) {
    if (!data || !Array.isArray(data.restaurants)) {
      return Promise.reject(new Error("invalid import file: missing restaurants array"));
    }
    var incoming = data.restaurants;
    var summary = { imported: 0, skipped: 0 };

    var clearStep = mode === "replace" ? deleteAllRestaurants() : Promise.resolve();

    return clearStep.then(function () {
      return withStore("readwrite", function (store, setResult) {
        incoming.forEach(function (raw) {
          if (!raw || !raw.name || !raw.address) {
            summary.skipped++;
            return;
          }
          var record = migrateRecord(
            Object.assign({}, raw, { id: raw.id || uuid() })
          );
          store.put(record);
          summary.imported++;
        });
        setResult(summary);
      });
    });
  }

  return {
    CURRENT_SCHEMA_VERSION: CURRENT_SCHEMA_VERSION,
    STATUS: STATUS,
    PRICE_RANGES: PRICE_RANGES,
    SERVICE_STYLES: SERVICE_STYLES,
    RESERVATIONS_OPTIONS: RESERVATIONS_OPTIONS,
    DIETARY_TAGS: DIETARY_TAGS,
    NOISE_LEVELS: NOISE_LEVELS,
    CUISINES: CUISINES,
    getCuisineList: getCuisineList,
    addCustomCuisine: addCustomCuisine,
    addRestaurant: addRestaurant,
    getRestaurant: getRestaurant,
    getAllRestaurants: getAllRestaurants,
    updateRestaurant: updateRestaurant,
    deleteRestaurant: deleteRestaurant,
    deleteAllRestaurants: deleteAllRestaurants,
    exportAll: exportAll,
    importAll: importAll,
  };
})();
