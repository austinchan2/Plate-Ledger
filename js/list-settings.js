// Plate Ledger — restaurant list + search/filter + Settings panel + Add button.
// Phase 4 retired the plain interim list this file started as: rows carry the
// same headline facts the map pins do (status, rating, price, cuisine, town),
// and tapping one takes you to that restaurant *on the map* with its detail
// sheet open, instead of dropping straight into the edit form. Editing is
// still one tap away from there — it's just no longer the only thing a row
// can do.
// Phase 5 adds search (name/notes/area, one box) and combinable filters
// (REQUIREMENTS.md §7), and replaces the old Want-to-Go/Been alphabetical
// grouping with a single list ordered by distance from wherever the map is
// centred when the list is opened (Austin's request, 2026-08-28 Phase 4
// review) — a small badge on each row still shows its status since the list
// is no longer grouped by it.
// Settings houses Export/Import/Delete all per REQUIREMENTS.md §10 — bulk and
// destructive actions live behind this, not as top-level buttons. Phase 7
// gives all of this its real visual design pass; this is functional first.

(function () {
  "use strict";

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c) node.appendChild(c);
    });
    return node;
  }

  function downloadJSON(data, filename) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = el("a", { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---- Phase 5: distance -----------------------------------------------

  // Haversine, in miles — Austin's in the US, so miles rather than km.
  function haversineMiles(lat1, lng1, lat2, lng2) {
    var R = 3958.8;
    function toRad(d) {
      return (d * Math.PI) / 180;
    }
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function formatDistance(mi) {
    if (mi < 0.1) return "< 0.1 mi";
    if (mi < 10) return mi.toFixed(1) + " mi";
    return Math.round(mi) + " mi";
  }

  // ---- Phase 5: search + filter state ------------------------------------
  // Combinable with AND logic across fields (REQUIREMENTS.md §7). Fields that
  // accept more than one value (cuisine, price, service style, reservations,
  // dietary tags, noise level) match a restaurant if it has *any* of the
  // selected values for that field (OR within the field) — e.g. selecting
  // "$" and "$$" shows either, not neither. The tri-state fields (non-chain,
  // good date spot, would go again, good for groups, outdoor seating) are
  // "Any" (no filter) / "Yes" / "No".

  var filters = {
    query: "",
    status: null, // null = all, else PlateLedgerDB.STATUS.*
    cuisines: new Set(),
    minRating: 0, // 0 = no minimum
    priceRanges: new Set(),
    serviceStyles: new Set(),
    nonChain: undefined,
    goodDateSpot: undefined,
    wouldGoAgain: undefined,
    goodForGroups: undefined,
    outdoorSeating: undefined,
    reservations: new Set(),
    dietaryTags: new Set(),
    noiseLevels: new Set(),
  };

  function resetFilters() {
    filters.status = null;
    filters.cuisines.clear();
    filters.minRating = 0;
    filters.priceRanges.clear();
    filters.serviceStyles.clear();
    filters.nonChain = undefined;
    filters.goodDateSpot = undefined;
    filters.wouldGoAgain = undefined;
    filters.goodForGroups = undefined;
    filters.outdoorSeating = undefined;
    filters.reservations.clear();
    filters.dietaryTags.clear();
    filters.noiseLevels.clear();
    // Search text is a separate control from "Filters" (it has its own
    // native clear "x") — Clear filters only resets the filter panel.
  }

  function countActiveFilters() {
    var n = 0;
    if (filters.status) n++;
    if (filters.cuisines.size) n++;
    if (filters.minRating > 0) n++;
    if (filters.priceRanges.size) n++;
    if (filters.serviceStyles.size) n++;
    if (filters.nonChain !== undefined) n++;
    if (filters.goodDateSpot !== undefined) n++;
    if (filters.wouldGoAgain !== undefined) n++;
    if (filters.goodForGroups !== undefined) n++;
    if (filters.outdoorSeating !== undefined) n++;
    if (filters.reservations.size) n++;
    if (filters.dietaryTags.size) n++;
    if (filters.noiseLevels.size) n++;
    return n;
  }

  function matchesQuery(r) {
    var q = filters.query.trim().toLowerCase();
    if (!q) return true;
    // One box covers both §7 bullets: "area search" is just typing the town
    // name here, and it also matches name/notes/full address.
    var haystack = [r.name, r.notes, r.town, r.address].filter(Boolean).join(" \n ").toLowerCase();
    return haystack.indexOf(q) !== -1;
  }

  function matchesFilters(r) {
    if (!matchesQuery(r)) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.cuisines.size) {
      var hasCuisine = (r.cuisines || []).some(function (c) { return filters.cuisines.has(c); });
      if (!hasCuisine) return false;
    }
    if (filters.minRating > 0) {
      if (!r.rating || r.rating < filters.minRating) return false;
    }
    if (filters.priceRanges.size && !filters.priceRanges.has(r.priceRange)) return false;
    if (filters.serviceStyles.size && !filters.serviceStyles.has(r.serviceStyle)) return false;
    if (filters.nonChain !== undefined && r.nonChain !== filters.nonChain) return false;
    if (filters.goodDateSpot !== undefined && r.goodDateSpot !== filters.goodDateSpot) return false;
    if (filters.wouldGoAgain !== undefined && r.wouldGoAgain !== filters.wouldGoAgain) return false;
    if (filters.goodForGroups !== undefined && r.goodForGroups !== filters.goodForGroups) return false;
    if (filters.outdoorSeating !== undefined && r.outdoorSeating !== filters.outdoorSeating) return false;
    if (filters.reservations.size && !filters.reservations.has(r.reservations)) return false;
    if (filters.dietaryTags.size) {
      var hasDietary = (r.dietaryTags || []).some(function (t) { return filters.dietaryTags.has(t); });
      if (!hasDietary) return false;
    }
    if (filters.noiseLevels.size && !filters.noiseLevels.has(r.noiseLevel)) return false;
    return true;
  }

  // ---- Phase 5: filter panel widgets -------------------------------------

  function buildPillGroupMulti(labelText, options, selectedSet, onChange) {
    var buttons = options.map(function (opt) {
      var btn = el("button", { type: "button", text: opt, class: "pill-btn" });
      btn.classList.toggle("pill-selected", selectedSet.has(opt));
      btn.onclick = function () {
        if (selectedSet.has(opt)) selectedSet.delete(opt);
        else selectedSet.add(opt);
        btn.classList.toggle("pill-selected", selectedSet.has(opt));
        onChange();
      };
      return btn;
    });
    return el("div", { class: "field-row" }, [
      el("label", { class: "field-label", text: labelText }),
      el("div", { class: "pill-group" }, buttons),
    ]);
  }

  function buildPillGroupSingle(labelText, options, getVal, setVal, onChange) {
    // options: [{label, value}, ...]; value === null means "no filter" (e.g. All).
    var buttons = options.map(function (opt) {
      var btn = el("button", { type: "button", text: opt.label, class: "pill-btn" });
      btn.onclick = function () {
        setVal(opt.value);
        buttons.forEach(function (b, i) {
          b.classList.toggle("pill-selected", options[i].value === getVal());
        });
        onChange();
      };
      return btn;
    });
    buttons.forEach(function (b, i) {
      b.classList.toggle("pill-selected", options[i].value === getVal());
    });
    return el("div", { class: "field-row" }, [
      el("label", { class: "field-label", text: labelText }),
      el("div", { class: "pill-group" }, buttons),
    ]);
  }

  function buildTriStateFilter(labelText, getVal, setVal, onChange) {
    var anyBtn = el("button", { type: "button", text: "Any", class: "pill-btn" });
    var yesBtn = el("button", { type: "button", text: "Yes", class: "pill-btn" });
    var noBtn = el("button", { type: "button", text: "No", class: "pill-btn" });
    function refresh() {
      anyBtn.classList.toggle("pill-selected", getVal() === undefined);
      yesBtn.classList.toggle("pill-selected", getVal() === true);
      noBtn.classList.toggle("pill-selected", getVal() === false);
    }
    anyBtn.onclick = function () { setVal(undefined); refresh(); onChange(); };
    yesBtn.onclick = function () { setVal(true); refresh(); onChange(); };
    noBtn.onclick = function () { setVal(false); refresh(); onChange(); };
    refresh();
    return el("div", { class: "field-row" }, [
      el("label", { class: "field-label", text: labelText }),
      el("div", { class: "pill-group" }, [anyBtn, yesBtn, noBtn]),
    ]);
  }

  function buildCheckboxMulti(labelText, key, options, selectedSet, onChange) {
    var wrap = el("div", { class: "checkbox-list" });
    options.forEach(function (opt, idx) {
      var id = "filter-cb-" + key + "-" + idx;
      var checkbox = el("input", { type: "checkbox", id: id });
      checkbox.checked = selectedSet.has(opt);
      checkbox.onchange = function () {
        if (checkbox.checked) selectedSet.add(opt);
        else selectedSet.delete(opt);
        onChange();
      };
      var label = el("label", { for: id, text: opt });
      wrap.appendChild(el("div", { class: "checkbox-item" }, [checkbox, label]));
    });
    return el("div", { class: "field-row" }, [
      el("label", { class: "field-label", text: labelText }),
      wrap,
    ]);
  }

  function buildMinRatingFilter(getVal, setVal, onChange) {
    var buttons = [];
    function refresh() {
      buttons.forEach(function (b, i) {
        b.textContent = i < getVal() ? "★" : "☆";
        b.classList.toggle("star-filled", i < getVal());
      });
    }
    for (var i = 1; i <= 5; i++) {
      (function (value) {
        var btn = el("button", { type: "button", class: "star-btn" });
        btn.onclick = function () {
          setVal(getVal() === value ? 0 : value);
          refresh();
          onChange();
        };
        buttons.push(btn);
      })(i);
    }
    refresh();
    return el("div", { class: "field-row" }, [
      el("label", { class: "field-label", text: "Minimum rating" }),
      el("div", { class: "star-group" }, buttons),
    ]);
  }

  // ---- List panel -------------------------------------------------------

  var listPanel, listBody, filtersPanel, filtersBody, filtersToggleBtn, searchInput;
  var listOpen = false;
  var filtersVisible = false;
  var listCenter = null; // {lat, lng} captured when the list opens

  function statusLabel(r) {
    return r.status === PlateLedgerDB.STATUS.BEEN ? "Been" : "Want to Go";
  }

  function buildRow(r, dist) {
    var been = r.status === PlateLedgerDB.STATUS.BEEN;

    var badge = el("span", {
      class: "list-row-badge " + (been ? "list-row-badge-been" : "list-row-badge-want"),
      text: statusLabel(r),
    });

    // Rating lives on its own line-leading element rather than in the meta
    // string so it can be gold and sized independently — it's the field
    // Austin is most likely to be scanning the list for.
    var ratingEl = null;
    if (been && r.rating) {
      ratingEl = el("span", { class: "list-row-rating", text: "★".repeat(r.rating) });
    }

    // Everything else that exists, in decreasing order of how likely it is
    // to be the thing you're scanning for. Empty fields are skipped rather
    // than rendered as stray separators.
    var bits = [];
    if (r.priceRange) bits.push(r.priceRange);
    if (r.cuisines && r.cuisines.length) bits.push(r.cuisines.join(", "));
    if (r.town) bits.push(r.town);
    if (!been && r.recommendedBy) bits.push("rec. " + r.recommendedBy);

    var meta = el("div", { class: "list-row-meta" });
    meta.appendChild(badge);
    if (dist != null) meta.appendChild(el("span", { class: "list-row-dist", text: formatDistance(dist) }));
    if (ratingEl) meta.appendChild(ratingEl);
    if (bits.length) meta.appendChild(el("span", { text: bits.join(" · ") }));

    var row = el("button", { type: "button", class: "list-row" }, [
      el("div", { class: "list-row-name", text: r.name }),
      meta,
    ]);
    row.onclick = function () {
      // Close the list so the map is actually visible — the whole point of
      // tapping a row now is to be shown where the place is. The detail
      // sheet that opens has its own Edit button, so nothing is lost.
      closeList();
      PlateLedgerPins.focus(r);
    };
    return row;
  }

  function refreshList() {
    if (!listBody) return;
    if (filtersToggleBtn) {
      var count = countActiveFilters();
      filtersToggleBtn.textContent = count > 0 ? "Filters (" + count + ")" : "Filters";
      filtersToggleBtn.classList.toggle("filters-toggle-active", count > 0);
    }
    listBody.innerHTML = "";
    PlateLedgerDB.getAllRestaurants().then(function (restaurants) {
      if (!restaurants.length) {
        listBody.appendChild(el("div", { class: "list-empty", text: "No restaurants saved yet. Tap + to add one." }));
        return;
      }
      var filtered = restaurants.filter(matchesFilters);
      if (!filtered.length) {
        listBody.appendChild(el("div", { class: "list-empty", text: "No restaurants match your search and filters." }));
        return;
      }

      // Phase 5: one flat list ordered by distance from wherever the map was
      // centred when the list opened (not GPS position — "what's near where
      // I'm looking", per Austin's Phase 4 review request), with a status
      // badge per row in place of the old Want-to-Go/Been section grouping.
      // Records missing coordinates (shouldn't normally happen — address is
      // required and geocoded) sort to the end, alphabetically.
      var withDist = filtered.map(function (r) {
        var dist = null;
        if (listCenter && typeof r.lat === "number" && typeof r.lng === "number") {
          dist = haversineMiles(listCenter.lat, listCenter.lng, r.lat, r.lng);
        }
        return { r: r, dist: dist };
      });
      withDist.sort(function (a, b) {
        if (a.dist == null && b.dist == null) return a.r.name.localeCompare(b.r.name);
        if (a.dist == null) return 1;
        if (b.dist == null) return -1;
        return a.dist - b.dist;
      });
      withDist.forEach(function (entry) {
        listBody.appendChild(buildRow(entry.r, entry.dist));
      });
    });
  }

  function onFiltersChanged() {
    refreshList();
  }

  function openList() {
    // The sheet is anchored to a pin the list is about to cover; leaving it
    // open means closing the list drops you back on a stale card.
    if (window.PlateLedgerDetail) PlateLedgerDetail.close();
    listOpen = true;
    var m = window.PlateLedgerMap && window.PlateLedgerMap.map;
    listCenter = m ? m.getCenter() : null;
    // Cuisine list can grow (custom cuisines added from the Add/Edit form)
    // while the list panel stays mounted between opens — rebuild it fresh
    // every time the list opens so a newly-added cuisine shows up as a
    // filter option.
    renderCuisineFilter();
    listPanel.style.display = "flex";
    refreshList();
  }

  function closeList() {
    listOpen = false;
    listPanel.style.display = "none";
  }

  // ---- Phase 5: filters panel --------------------------------------------

  var cuisineHolder;

  function renderCuisineFilter() {
    if (!cuisineHolder) return;
    cuisineHolder.innerHTML = "";
    cuisineHolder.appendChild(
      buildCheckboxMulti("Cuisine", "cuisine", PlateLedgerDB.getCuisineList(), filters.cuisines, onFiltersChanged)
    );
  }

  function renderFiltersPanel() {
    filtersBody.innerHTML = "";

    var clearBtn = el("button", { type: "button", text: "Clear filters", class: "link-btn" });
    clearBtn.onclick = function () {
      resetFilters();
      renderFiltersPanel();
      onFiltersChanged();
    };
    filtersBody.appendChild(clearBtn);

    filtersBody.appendChild(
      buildPillGroupSingle(
        "Status",
        [
          { label: "All", value: null },
          { label: "Want to Go", value: PlateLedgerDB.STATUS.WANT_TO_GO },
          { label: "Been", value: PlateLedgerDB.STATUS.BEEN },
        ],
        function () { return filters.status; },
        function (v) { filters.status = v; },
        onFiltersChanged
      )
    );

    filtersBody.appendChild(
      buildMinRatingFilter(
        function () { return filters.minRating; },
        function (v) { filters.minRating = v; },
        onFiltersChanged
      )
    );

    cuisineHolder = el("div");
    filtersBody.appendChild(cuisineHolder);
    renderCuisineFilter();

    filtersBody.appendChild(buildPillGroupMulti("Price range", PlateLedgerDB.PRICE_RANGES, filters.priceRanges, onFiltersChanged));
    filtersBody.appendChild(buildPillGroupMulti("Service style", PlateLedgerDB.SERVICE_STYLES, filters.serviceStyles, onFiltersChanged));
    filtersBody.appendChild(buildTriStateFilter("Non-chain / independent", function () { return filters.nonChain; }, function (v) { filters.nonChain = v; }, onFiltersChanged));
    filtersBody.appendChild(buildTriStateFilter("Good date spot", function () { return filters.goodDateSpot; }, function (v) { filters.goodDateSpot = v; }, onFiltersChanged));
    filtersBody.appendChild(buildTriStateFilter("Would go again", function () { return filters.wouldGoAgain; }, function (v) { filters.wouldGoAgain = v; }, onFiltersChanged));
    filtersBody.appendChild(buildTriStateFilter("Good for groups", function () { return filters.goodForGroups; }, function (v) { filters.goodForGroups = v; }, onFiltersChanged));
    filtersBody.appendChild(buildTriStateFilter("Outdoor seating / patio", function () { return filters.outdoorSeating; }, function (v) { filters.outdoorSeating = v; }, onFiltersChanged));
    filtersBody.appendChild(buildPillGroupMulti("Reservations", PlateLedgerDB.RESERVATIONS_OPTIONS, filters.reservations, onFiltersChanged));
    filtersBody.appendChild(buildCheckboxMulti("Dietary-friendly", "dietary", PlateLedgerDB.DIETARY_TAGS, filters.dietaryTags, onFiltersChanged));
    filtersBody.appendChild(buildPillGroupMulti("Noise level", PlateLedgerDB.NOISE_LEVELS, filters.noiseLevels, onFiltersChanged));
  }

  function buildFiltersPanel() {
    filtersBody = el("div", { class: "filters-body" });
    filtersPanel = el("div", { class: "filters-panel" }, [filtersBody]);
    filtersPanel.style.display = "none";
    renderFiltersPanel();
    return filtersPanel;
  }

  function buildSearchRow() {
    searchInput = el("input", {
      type: "search",
      class: "text-input search-input",
      placeholder: "Search name, notes, or area",
    });
    searchInput.value = filters.query;

    // Phase 7: explicit "x in a circle" clear button (Austin asked for this
    // during Phase 6 testing) rather than leaning on the native iOS
    // search-input cancel button, which wasn't a reliable enough tap target.
    var clearBtn = el("button", { type: "button", text: "\u2715", class: "search-clear-btn" });
    clearBtn.setAttribute("aria-label", "Clear search");

    function syncClearBtn() {
      clearBtn.style.display = searchInput.value ? "flex" : "none";
    }
    syncClearBtn();

    searchInput.oninput = function () {
      filters.query = searchInput.value;
      syncClearBtn();
      refreshList();
    };

    clearBtn.onclick = function () {
      searchInput.value = "";
      filters.query = "";
      syncClearBtn();
      searchInput.focus();
      refreshList();
    };

    var searchWrap = el("div", { class: "search-input-wrap" }, [searchInput, clearBtn]);

    filtersToggleBtn = el("button", { type: "button", text: "Filters", class: "filters-toggle-btn" });
    filtersToggleBtn.onclick = function () {
      filtersVisible = !filtersVisible;
      filtersPanel.style.display = filtersVisible ? "block" : "none";
    };

    return el("div", { class: "list-search-row" }, [searchWrap, filtersToggleBtn]);
  }

  // ---- Settings panel -----------------------------------------------------

  var settingsPanel;

  function buildSettingsPanel() {
    var closeBtn = el("button", { type: "button", text: "✕", class: "form-close-btn" });
    var header = el("div", { class: "form-header" }, [
      closeBtn,
      el("div", { class: "form-title", text: "Settings" }),
      el("div", { class: "form-header-spacer" }),
    ]);
    closeBtn.onclick = function () {
      settingsPanel.style.display = "none";
    };

    var exportBtn = el("button", { type: "button", text: "Export all data (JSON)", class: "settings-btn" });
    exportBtn.onclick = function () {
      PlateLedgerDB.exportAll().then(function (data) {
        downloadJSON(data, "plate-ledger-export-" + Date.now() + ".json");
      });
    };

    var importInput = el("input", { type: "file", accept: "application/json", id: "settings-import-input" });
    importInput.style.display = "none";
    importInput.onchange = function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          PlateLedgerDB.importAll(data, "merge").then(function (summary) {
            alert("Imported " + summary.imported + ", skipped " + summary.skipped + ".");
            window.dispatchEvent(new CustomEvent("plateledger:changed"));
          });
        } catch (err) {
          alert("Import failed: " + err.message);
        }
      };
      reader.readAsText(file);
      importInput.value = "";
    };
    var importBtn = el("button", { type: "button", text: "Import data (JSON)", class: "settings-btn" });
    importBtn.onclick = function () {
      importInput.click();
    };

    var deleteAllBtn = el("button", { type: "button", text: "Delete all restaurants", class: "settings-btn settings-danger" });
    deleteAllBtn.onclick = function () {
      if (confirm("Delete ALL saved restaurants? This can't be undone. Consider exporting first.")) {
        PlateLedgerDB.deleteAllRestaurants().then(function () {
          window.dispatchEvent(new CustomEvent("plateledger:changed"));
        });
      }
    };

    var body = el("div", { class: "settings-body" }, [exportBtn, importBtn, importInput, deleteAllBtn]);
    settingsPanel = el("div", { class: "settings-panel" }, [header, body]);
    settingsPanel.style.display = "none";
    document.body.appendChild(settingsPanel);
  }

  // ---- Top-level buttons: List, Settings, Add (+) --------------------------

  function buildTopButtons() {
    var listBtn = el("button", { type: "button", text: "☰ List", id: "list-toggle-btn" });
    listBtn.onclick = function () {
      if (listOpen) closeList();
      else openList();
    };

    var settingsBtn = el("button", { type: "button", text: "⚙", id: "settings-toggle-btn" });
    settingsBtn.onclick = function () {
      settingsPanel.style.display = settingsPanel.style.display === "none" ? "flex" : "none";
    };

    var addBtn = el("button", { type: "button", text: "+", id: "add-fab-btn" });
    addBtn.onclick = function () {
      PlateLedgerForm.openAdd();
    };

    document.body.appendChild(listBtn);
    document.body.appendChild(settingsBtn);
    document.body.appendChild(addBtn);
  }

  function buildListPanel() {
    var closeBtn = el("button", { type: "button", text: "✕", class: "form-close-btn" });
    var header = el("div", { class: "form-header" }, [
      closeBtn,
      el("div", { class: "form-title", text: "Your Restaurants" }),
      el("div", { class: "form-header-spacer" }),
    ]);
    closeBtn.onclick = closeList;

    var searchRow = buildSearchRow();
    var filtersPanelEl = buildFiltersPanel();

    listBody = el("div", { class: "list-body" });
    listPanel = el("div", { class: "list-panel" }, [header, searchRow, filtersPanelEl, listBody]);
    listPanel.style.display = "none";
    document.body.appendChild(listPanel);
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildTopButtons();
    buildListPanel();
    buildSettingsPanel();
  });

  window.addEventListener("plateledger:changed", function () {
    // Always refresh, not just when the list happens to be open: the list
    // panel now stays mounted (just hidden) behind an edit form opened from
    // a row, so its content needs to be current the moment it's visible
    // again, not only re-fetched the next time it's explicitly opened.
    refreshList();
  });
})();
