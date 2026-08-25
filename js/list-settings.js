// Plate Ledger — Phase 2: interim restaurant list + Settings panel + Add button.
// The list here is intentionally plain (no map pins, no search/filter yet —
// that's Phase 3/4): it exists so Austin can get back into a saved restaurant
// to edit it or move it from "Want to Go" to "Been", now that the real
// add/edit form (js/restaurant-form.js) has replaced the Phase 1 debug panel.
// Settings houses Export/Import/Delete all per REQUIREMENTS.md §10 — bulk and
// destructive actions live behind this, not as top-level buttons. Phase 6
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

  // ---- List panel -------------------------------------------------------

  var listPanel, listBody, listOpen = false;

  function statusLabel(r) {
    return r.status === PlateLedgerDB.STATUS.BEEN ? "Been" : "Want to Go";
  }

  function buildRow(r) {
    var meta = statusLabel(r) + (r.town ? " · " + r.town : "");
    if (r.status === PlateLedgerDB.STATUS.BEEN && r.rating) {
      meta += " · " + "★".repeat(r.rating);
    }
    var row = el("button", { type: "button", class: "list-row" }, [
      el("div", { class: "list-row-name", text: r.name }),
      el("div", { class: "list-row-meta", text: meta }),
    ]);
    row.onclick = function () {
      // Deliberately leave the list panel open underneath (it's a lower
      // z-index than the form overlay) so that when Save/Delete/Cancel
      // closes the form, the list is still there -- refreshed with whatever
      // changed -- instead of dropping the user back on the bare map.
      PlateLedgerForm.openEdit(r);
    };
    return row;
  }

  function refreshList() {
    if (!listBody) return;
    listBody.innerHTML = "";
    PlateLedgerDB.getAllRestaurants().then(function (restaurants) {
      if (!restaurants.length) {
        listBody.appendChild(el("div", { class: "list-empty", text: "No restaurants saved yet. Tap + to add one." }));
        return;
      }
      var wantToGo = restaurants
        .filter(function (r) { return r.status !== PlateLedgerDB.STATUS.BEEN; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); });
      var been = restaurants
        .filter(function (r) { return r.status === PlateLedgerDB.STATUS.BEEN; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); });

      if (wantToGo.length) {
        listBody.appendChild(el("div", { class: "list-section-header", text: "Want to Go (" + wantToGo.length + ")" }));
        wantToGo.forEach(function (r) { listBody.appendChild(buildRow(r)); });
      }
      if (been.length) {
        listBody.appendChild(el("div", { class: "list-section-header", text: "Been (" + been.length + ")" }));
        been.forEach(function (r) { listBody.appendChild(buildRow(r)); });
      }
    });
  }

  function openList() {
    listOpen = true;
    listPanel.style.display = "flex";
    refreshList();
  }

  function closeList() {
    listOpen = false;
    listPanel.style.display = "none";
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
    listBody = el("div", { class: "list-body" });
    listPanel = el("div", { class: "list-panel" }, [header, listBody]);
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
