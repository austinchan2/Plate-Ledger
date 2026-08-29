// Plate Ledger — Phase 2: Add/Edit restaurant form.
// Covers every field in REQUIREMENTS.md §6.1-6.4, the search-first address
// flow from §9 (via js/geocode.js), the Want to Go / Been status toggle that
// reveals the review fields, and delete-with-confirmation. Nothing here
// touches storage until Save (or Delete) is tapped — closing the form at any
// point before that discards changes.

var PlateLedgerForm = (function () {
  "use strict";

  var overlayEl = null;

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c) node.appendChild(c);
    });
    return node;
  }

  function closeForm() {
    if (overlayEl && overlayEl.parentNode) {
      overlayEl.parentNode.removeChild(overlayEl);
    }
    overlayEl = null;
  }

  // Phase 7: a soft location hint passed to PlateLedgerGeocode so search/
  // geocode results are ranked toward wherever Austin actually is (or, if we
  // have no GPS fix yet, wherever the map is currently looking) instead of
  // being unbiased free-text lookups. Never a hard filter — see geocode.js.
  function locationHint() {
    var pm = window.PlateLedgerMap;
    if (!pm) return null;
    if (pm.userPosition) return { lat: pm.userPosition.lat, lng: pm.userPosition.lng };
    if (pm.map) {
      var c = pm.map.getCenter();
      return { lat: c.lat, lng: c.lng };
    }
    return null;
  }

  function notifyChanged() {
    window.dispatchEvent(new CustomEvent("plateledger:changed"));
  }

  // ---- yes/no pill control -------------------------------------------------
  // `working` is the in-progress record object; clicking mutates working[key]
  // directly (Yes -> No -> unset -> Yes ...), no separate read-back needed.
  function buildYesNo(labelText, working, key) {
    var yesBtn = el("button", { type: "button", text: "Yes", class: "pill-btn" });
    var noBtn = el("button", { type: "button", text: "No", class: "pill-btn" });
    function refresh() {
      yesBtn.classList.toggle("pill-selected", working[key] === true);
      noBtn.classList.toggle("pill-selected", working[key] === false);
    }
    yesBtn.onclick = function () {
      working[key] = working[key] === true ? null : true;
      refresh();
    };
    noBtn.onclick = function () {
      working[key] = working[key] === false ? null : false;
      refresh();
    };
    refresh();
    return el("div", { class: "field-row" }, [
      el("label", { class: "field-label", text: labelText }),
      el("div", { class: "pill-group" }, [yesBtn, noBtn]),
    ]);
  }

  // ---- single-select pill group (price range, rating uses its own) --------
  function buildSingleSelectPills(labelText, options, working, key) {
    var buttons = options.map(function (opt) {
      var btn = el("button", { type: "button", text: opt, class: "pill-btn" });
      btn.onclick = function () {
        working[key] = working[key] === opt ? null : opt;
        buttons.forEach(function (b) {
          b.classList.toggle("pill-selected", b === btn && working[key] === opt);
        });
      };
      return btn;
    });
    buttons.forEach(function (b, i) {
      b.classList.toggle("pill-selected", options[i] === working[key]);
    });
    return el("div", { class: "field-row" }, [
      el("label", { class: "field-label", text: labelText }),
      el("div", { class: "pill-group" }, buttons),
    ]);
  }

  // ---- star rating ----------------------------------------------------------
  function buildRating(working) {
    var buttons = [];
    function refresh() {
      buttons.forEach(function (b, i) {
        b.textContent = i < (working.rating || 0) ? "★" : "☆";
        b.classList.toggle("star-filled", i < (working.rating || 0));
      });
    }
    for (var i = 1; i <= 5; i++) {
      (function (value) {
        var btn = el("button", { type: "button", class: "star-btn" });
        btn.onclick = function () {
          working.rating = working.rating === value ? null : value;
          refresh();
        };
        buttons.push(btn);
      })(i);
    }
    refresh();
    return el("div", { class: "field-row" }, [
      el("label", { class: "field-label", text: "Rating" }),
      el("div", { class: "star-group" }, buttons),
    ]);
  }

  // ---- multi-select checkbox list (cuisines, dietary tags) -----------------
  function buildCheckboxList(options, working, key) {
    var wrap = el("div", { class: "checkbox-list" });
    options.forEach(function (opt) {
      var checked = working[key].indexOf(opt) !== -1;
      var checkbox = el("input", { type: "checkbox", id: "cb-" + key + "-" + opt });
      checkbox.checked = checked;
      checkbox.onchange = function () {
        var idx = working[key].indexOf(opt);
        if (checkbox.checked && idx === -1) working[key].push(opt);
        if (!checkbox.checked && idx !== -1) working[key].splice(idx, 1);
      };
      var label = el("label", { for: "cb-" + key + "-" + opt, text: opt });
      wrap.appendChild(el("div", { class: "checkbox-item" }, [checkbox, label]));
    });
    return wrap;
  }

  function buildCuisinesField(working) {
    var wrap = el("div", { class: "field-row" });
    wrap.appendChild(el("label", { class: "field-label", text: "Cuisine" }));
    var listHolder = el("div");
    function renderList() {
      listHolder.innerHTML = "";
      listHolder.appendChild(buildCheckboxList(PlateLedgerDB.getCuisineList(), working, "cuisines"));
    }
    renderList();
    wrap.appendChild(listHolder);

    var newInput = el("input", { type: "text", placeholder: "Add a cuisine not listed above", class: "text-input" });
    var addBtn = el("button", { type: "button", text: "+ Add", class: "small-btn" });
    addBtn.onclick = function () {
      var name = newInput.value.trim();
      if (!name) return;
      PlateLedgerDB.addCustomCuisine(name);
      if (working.cuisines.indexOf(name) === -1) working.cuisines.push(name);
      newInput.value = "";
      renderList();
    };
    wrap.appendChild(el("div", { class: "add-row" }, [newInput, addBtn]));
    return wrap;
  }

  function buildSelectField(labelText, options, working, key) {
    var select = el("select", { class: "select-input" });
    select.appendChild(el("option", { value: "", text: "—" }));
    options.forEach(function (opt) {
      var optionEl = el("option", { value: opt, text: opt });
      if (working[key] === opt) optionEl.setAttribute("selected", "selected");
      select.appendChild(optionEl);
    });
    select.onchange = function () {
      working[key] = select.value || null;
    };
    return el("div", { class: "field-row" }, [
      el("label", { class: "field-label", text: labelText }),
      select,
    ]);
  }

  function buildTextField(labelText, working, key, opts) {
    opts = opts || {};
    var input = el("input", { type: opts.type || "text", class: "text-input" });
    input.value = working[key] || "";
    input.oninput = function () {
      working[key] = input.value;
    };
    if (opts.placeholder) input.setAttribute("placeholder", opts.placeholder);
    return el("div", { class: "field-row" }, [
      el("label", { class: "field-label", text: labelText }),
      input,
    ]);
  }

  function buildTextareaField(labelText, working, key) {
    var textarea = el("textarea", { class: "textarea-input", rows: "3" });
    textarea.value = working[key] || "";
    textarea.oninput = function () {
      working[key] = textarea.value;
    };
    return el("div", { class: "field-row" }, [
      el("label", { class: "field-label", text: labelText }),
      textarea,
    ]);
  }

  // ---- address picker: search-first, manual fallback (REQUIREMENTS §9) ----
  function buildAddressSection(working) {
    var container = el("div", { class: "field-row address-section" });
    container.appendChild(el("label", { class: "field-label", text: "Address" }));
    var body = el("div", { class: "address-body" });
    container.appendChild(body);

    var mode = working.lat != null && working.lng != null ? "confirmed" : "search";
    var searchTimer = null;

    function render() {
      body.innerHTML = "";
      if (mode === "confirmed") {
        renderConfirmed();
      } else if (mode === "manual") {
        renderManual();
      } else if (mode === "paste") {
        renderPaste();
      } else {
        renderSearch();
      }
    }

    // Build 12: manual "pan the map to set the location" fallback. Real-world
    // cases this exists for: Nominatim geocoding a grid-numbered Utah address
    // to the wrong block, or only resolving down to street level (no exact
    // house-number point in OSM's data) rather than the specific building —
    // both genuine data-precision limits, not something a better query can
    // always work around. Hides the form so the real map underneath is
    // tappable/pannable, then restores it with the picked coordinates filled
    // in (or unchanged, on cancel).
    function openPinPicker() {
      if (!window.PlateLedgerMap || !window.PlateLedgerMap.enterPickMode) return;
      if (!overlayEl) return;
      overlayEl.style.display = "none";
      window.PlateLedgerMap.enterPickMode(
        function (coords) {
          working.lat = coords.lat;
          working.lng = coords.lng;
          if (!working.address) working.address = "Pinned location";
          overlayEl.style.display = "flex";
          mode = "confirmed";
          render();
        },
        function () {
          overlayEl.style.display = "flex";
        }
      );
    }

    function renderConfirmed() {
      body.appendChild(
        el("div", { class: "address-confirmed" }, [
          el("div", { text: working.address || "" }),
          working.town ? el("div", { class: "address-town", text: working.town }) : null,
        ])
      );
      var changeLink = el("button", { type: "button", text: "Change address", class: "link-btn" });
      changeLink.onclick = function () {
        mode = "search";
        render();
      };
      body.appendChild(changeLink);
    }

    function renderSearch() {
      var input = el("input", {
        type: "text",
        class: "text-input",
        placeholder: "Search for a restaurant by name",
      });
      var resultsWrap = el("div", { class: "search-results" });
      input.oninput = function () {
        clearTimeout(searchTimer);
        var query = input.value;
        searchTimer = setTimeout(function () {
          resultsWrap.innerHTML = "";
          if (!query.trim()) return;
          resultsWrap.appendChild(el("div", { class: "search-status", text: "Searching…" }));
          PlateLedgerGeocode.searchPlaces(query, { near: locationHint() })
            .then(function (results) {
              resultsWrap.innerHTML = "";
              if (!results.length) {
                resultsWrap.appendChild(el("div", { class: "search-status", text: "No matches. Try a different search, or enter the address manually below." }));
                return;
              }
              results.forEach(function (r) {
                var row = el("button", { type: "button", class: "search-result-row", text: r.displayName });
                row.onclick = function () {
                  working.address = r.displayName;
                  working.town = r.town;
                  working.lat = r.lat;
                  working.lng = r.lng;
                  if (!working.name) {
                    working.name = r.displayName.split(",")[0].trim();
                    if (typeof onNameAutofill === "function") onNameAutofill(working.name);
                  }
                  mode = "confirmed";
                  render();
                };
                resultsWrap.appendChild(row);
              });
            })
            .catch(function () {
              resultsWrap.innerHTML = "";
              resultsWrap.appendChild(el("div", { class: "search-status", text: "Search failed. Check your connection, or enter the address manually below." }));
            });
        }, 400);
      };
      body.appendChild(input);
      body.appendChild(resultsWrap);
      var manualLink = el("button", { type: "button", text: "Can't find it? Enter address manually", class: "link-btn" });
      manualLink.onclick = function () {
        mode = "manual";
        render();
      };
      body.appendChild(manualLink);
      var pasteLink = el("button", { type: "button", text: "Or paste a Google/Apple Maps link", class: "link-btn" });
      pasteLink.onclick = function () {
        mode = "paste";
        render();
      };
      body.appendChild(pasteLink);
      var pinLink = el("button", { type: "button", text: "Or set the exact spot on the map", class: "link-btn" });
      pinLink.onclick = openPinPicker;
      body.appendChild(pinLink);
    }

    // Phase 8: "port over" a restaurant Nominatim can't find by name — paste
    // a share link (or plain "lat, lng") straight from the Maps app instead
    // of typing an address. See js/maps-import.js for exactly which link
    // shapes this can read directly vs. which need expanding first (short
    // links), and PROGRESS.md's Phase 8 section for the companion iOS
    // Shortcut that can do that expansion automatically.
    function applyParsedLocation(parsed) {
      working.lat = parsed.lat;
      working.lng = parsed.lng;
      if (parsed.name && !working.name) {
        working.name = parsed.name;
        if (typeof onNameAutofill === "function") onNameAutofill(working.name);
      }
      mode = "confirmed";
      render();
    }

    function renderPaste() {
      var textarea = el("textarea", {
        class: "textarea-input",
        rows: "3",
        placeholder: 'Paste a Google Maps or Apple Maps link, or "lat, lng"',
      });
      var statusWrap = el("div", { class: "search-status" });

      function setStatus(text, extraEl) {
        statusWrap.innerHTML = "";
        if (text) statusWrap.appendChild(el("div", { text: text }));
        if (extraEl) statusWrap.appendChild(extraEl);
      }

      var importBtn = el("button", { type: "button", text: "Import", class: "small-btn" });
      importBtn.onclick = function () {
        var text = textarea.value.trim();
        if (!text) {
          setStatus("Paste a link first.");
          return;
        }
        var parsed = PlateLedgerMapsImport.parse(text);
        if (!parsed.ok) {
          if (parsed.reason === "short-link") {
            var openLink = el("a", {
              href: parsed.url,
              target: "_blank",
              rel: "noopener",
              text: "Open the link to expand it",
              class: "link-btn",
            });
            setStatus(
              "That's a shortened link \u2014 it doesn't have the location in it directly. Open it once (below) to expand it, then copy the full address-bar URL it lands on and paste that here instead.",
              openLink
            );
          } else {
            setStatus('Couldn\u2019t find a location in that. Paste the full Google/Apple Maps link, or just "lat, lng".');
          }
          return;
        }
        // Apple links sometimes carry a real address string directly; Google
        // links never do, so those (and Apple links without one) need a
        // reverse-geocode lookup to get a human address/town instead of just
        // raw coordinates.
        if (parsed.address) {
          working.address = parsed.address;
          applyParsedLocation(parsed);
          return;
        }
        setStatus("Looking up the address\u2026");
        PlateLedgerGeocode.reverseGeocode({ lat: parsed.lat, lng: parsed.lng })
          .then(function (r) {
            working.address = (r && r.displayName) || "Pinned from Maps link";
            working.town = (r && r.town) || "";
            applyParsedLocation(parsed);
          })
          .catch(function () {
            working.address = "Pinned from Maps link";
            applyParsedLocation(parsed);
          });
      };

      body.appendChild(textarea);
      body.appendChild(importBtn);
      body.appendChild(statusWrap);
      var searchLink = el("button", { type: "button", text: "Search by name instead", class: "link-btn" });
      searchLink.onclick = function () {
        mode = "search";
        render();
      };
      body.appendChild(searchLink);
    }

    function renderManual() {
      var input = el("input", { type: "text", class: "text-input", placeholder: "Street address, city, state" });
      input.value = working.address || "";
      var status = el("div", { class: "search-status" });
      var resultsWrap = el("div", { class: "search-results" });
      var lookupBtn = el("button", { type: "button", text: "Look up address", class: "small-btn" });
      lookupBtn.onclick = function () {
        var address = input.value.trim();
        if (!address) return;
        resultsWrap.innerHTML = "";
        status.textContent = "Looking up…";
        PlateLedgerGeocode.geocodeAddress(address, { near: locationHint() })
          .then(function (results) {
            if (!results.length) {
              status.textContent = "Couldn't find that address. Check it and try again.";
              return;
            }
            // Phase 7: show every candidate rather than silently trusting
            // whichever Nominatim ranked first — grid-numbered addresses
            // (e.g. "800 N") are genuinely ambiguous across towns that share
            // the same numbering scheme, which is what caused a pin to land
            // a couple of blocks off. Letting Austin pick (or notice none of
            // them are right and refine the search) is the honest fix.
            status.textContent =
              results.length > 1
                ? "Multiple matches — tap the right one:"
                : "Confirm this is the right location:";
            results.forEach(function (r) {
              var row = el("button", { type: "button", class: "search-result-row", text: r.displayName });
              row.onclick = function () {
                // Keep what Austin actually typed as the saved address text
                // (unlike search-by-name, where the found place's own name
                // is the more useful label) — only the coordinates/town come
                // from the picked candidate.
                working.address = address;
                working.town = r.town;
                working.lat = r.lat;
                working.lng = r.lng;
                mode = "confirmed";
                render();
              };
              resultsWrap.appendChild(row);
            });
          })
          .catch(function () {
            status.textContent = "Lookup failed. Check your connection and try again.";
          });
      };
      body.appendChild(input);
      body.appendChild(lookupBtn);
      body.appendChild(status);
      body.appendChild(resultsWrap);
      var searchLink = el("button", { type: "button", text: "Search by name instead", class: "link-btn" });
      searchLink.onclick = function () {
        mode = "search";
        render();
      };
      body.appendChild(searchLink);
      var pinLink = el("button", { type: "button", text: "None of these right? Set the exact spot on the map", class: "link-btn" });
      pinLink.onclick = openPinPicker;
      body.appendChild(pinLink);
    }

    var onNameAutofill = null;
    render();
    return { container: container, setOnNameAutofill: function (fn) { onNameAutofill = fn; } };
  }

  // ---- Been-only fields section ---------------------------------------------
  function buildBeenSection(working) {
    var section = el("div", { class: "been-section" });
    section.appendChild(buildRating(working));
    section.appendChild(buildSingleSelectPills("Price range", PlateLedgerDB.PRICE_RANGES, working, "priceRange"));
    section.appendChild(buildYesNo("Non-chain / independent", working, "nonChain"));
    section.appendChild(buildSelectField("Service style", PlateLedgerDB.SERVICE_STYLES, working, "serviceStyle"));
    section.appendChild(buildCuisinesField(working));
    section.appendChild(buildTextField("Meal(s) had", working, "mealsHad"));
    section.appendChild(buildYesNo("Good date spot", working, "goodDateSpot"));
    section.appendChild(buildTextField("Last visited", working, "lastVisited", { type: "date" }));
    section.appendChild(buildYesNo("Would go again", working, "wouldGoAgain"));
    section.appendChild(buildYesNo("Good for groups", working, "goodForGroups"));
    section.appendChild(buildYesNo("Outdoor seating / patio", working, "outdoorSeating"));
    section.appendChild(buildSelectField("Reservations", PlateLedgerDB.RESERVATIONS_OPTIONS, working, "reservations"));
    section.appendChild(el("div", { class: "field-row" }, [
      el("label", { class: "field-label", text: "Dietary-friendly options" }),
      buildCheckboxList(PlateLedgerDB.DIETARY_TAGS, working, "dietaryTags"),
    ]));
    section.appendChild(buildSelectField("Noise level", PlateLedgerDB.NOISE_LEVELS, working, "noiseLevel"));
    section.appendChild(buildTextField("Website / menu link", working, "websiteUrl", { type: "url", placeholder: "https://…" }));
    return section;
  }

  function buildStatusToggle(working, beenSection) {
    var wantBtn = el("button", { type: "button", text: "Want to Go", class: "pill-btn status-btn" });
    var beenBtn = el("button", { type: "button", text: "Been", class: "pill-btn status-btn" });
    function refresh() {
      wantBtn.classList.toggle("pill-selected", working.status === PlateLedgerDB.STATUS.WANT_TO_GO);
      beenBtn.classList.toggle("pill-selected", working.status === PlateLedgerDB.STATUS.BEEN);
      beenSection.style.display = working.status === PlateLedgerDB.STATUS.BEEN ? "block" : "none";
    }
    wantBtn.onclick = function () {
      working.status = PlateLedgerDB.STATUS.WANT_TO_GO;
      refresh();
    };
    beenBtn.onclick = function () {
      working.status = PlateLedgerDB.STATUS.BEEN;
      refresh();
    };
    refresh();
    return el("div", { class: "field-row" }, [
      el("label", { class: "field-label", text: "Status" }),
      el("div", { class: "pill-group" }, [wantBtn, beenBtn]),
    ]);
  }

  // Phase 8: `prefill` lets a caller (the in-form "paste from Maps" flow's
  // sibling entry point, or the `?import=` URL hand-off from the companion
  // iOS Shortcut in js/app.js) open a *new* restaurant already populated
  // with a name/address/lat/lng, landing straight on the "confirmed"
  // address screen instead of "search" — same effect as picking a search
  // result, just from a different source. Only applies when adding
  // (existingRecord is null); an edit always starts from the saved record.
  function openForm(existingRecord, prefill) {
    closeForm();

    var isEdit = !!existingRecord;
    var working = Object.assign(
      {
        name: "",
        address: "",
        town: "",
        lat: null,
        lng: null,
        recommendedBy: "",
        notes: "",
        status: PlateLedgerDB.STATUS.WANT_TO_GO,
        rating: null,
        priceRange: null,
        nonChain: null,
        serviceStyle: null,
        cuisines: [],
        mealsHad: "",
        goodDateSpot: null,
        lastVisited: null,
        wouldGoAgain: null,
        goodForGroups: null,
        outdoorSeating: null,
        reservations: null,
        dietaryTags: [],
        noiseLevel: null,
        websiteUrl: "",
      },
      existingRecord || prefill || {}
    );
    // Work on independent copies of array fields so cancelling never mutates
    // the caller's record.
    working.cuisines = (working.cuisines || []).slice();
    working.dietaryTags = (working.dietaryTags || []).slice();

    var titleText = isEdit ? "Edit Restaurant" : "Add Restaurant";
    var closeBtn = el("button", { type: "button", text: "✕", class: "form-close-btn" });
    var saveBtn = el("button", { type: "button", text: "Save", class: "form-save-btn" });
    var header = el("div", { class: "form-header" }, [
      closeBtn,
      el("div", { class: "form-title", text: titleText }),
      saveBtn,
    ]);

    var form = el("div", { class: "form-body" });

    var addressPicker = buildAddressSection(working);
    form.appendChild(addressPicker.container);

    var nameField = buildTextField("Name", working, "name", { placeholder: "Restaurant name" });
    var nameInputEl = nameField.querySelector("input");
    addressPicker.setOnNameAutofill(function (name) {
      working.name = name;
      nameInputEl.value = name;
    });
    form.appendChild(nameField);

    form.appendChild(buildTextField("Recommended by", working, "recommendedBy", { placeholder: "Who told you about this place?" }));
    form.appendChild(buildTextareaField("Notes", working, "notes"));
    var beenSection = buildBeenSection(working);
    form.appendChild(buildStatusToggle(working, beenSection));
    form.appendChild(beenSection);

    if (isEdit) {
      var deleteBtn = el("button", { type: "button", text: "Delete restaurant", class: "delete-btn" });
      deleteBtn.onclick = function () {
        if (confirm('Delete "' + (working.name || "this restaurant") + '"? This can\'t be undone.')) {
          PlateLedgerDB.deleteRestaurant(existingRecord.id).then(function () {
            closeForm();
            notifyChanged();
          });
        }
      };
      form.appendChild(deleteBtn);
    }

    closeBtn.onclick = function () {
      closeForm();
    };

    saveBtn.onclick = function () {
      working.name = (nameInputEl.value || "").trim();
      if (!working.name) {
        alert("Please enter a name.");
        return;
      }
      if (!working.address || working.lat == null || working.lng == null) {
        alert("Please pick or look up an address first.");
        return;
      }
      var patch = Object.assign({}, working);
      delete patch.id;
      var savePromise = isEdit
        ? PlateLedgerDB.updateRestaurant(existingRecord.id, patch)
        : PlateLedgerDB.addRestaurant(patch);
      savePromise.then(function () {
        closeForm();
        notifyChanged();
      });
    };

    overlayEl = el("div", { class: "form-overlay" }, [header, form]);
    document.body.appendChild(overlayEl);
  }

  return {
    // `prefill` (optional): { name, address, town, lat, lng } — see the
    // comment on openForm() above.
    openAdd: function (prefill) {
      openForm(null, prefill);
    },
    openEdit: function (record) {
      openForm(record);
    },
  };
})();
