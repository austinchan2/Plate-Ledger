// Plate Ledger — Phase 4: restaurant detail bottom sheet.
// Tapping a pin (or a list row) opens this over the map: a card that slides
// up from the bottom, showing the headline facts in its collapsed peek and
// every stored field once expanded. Bottom sheet rather than a full-screen
// view (Austin's call, 2026-08-28) so the map stays visible above it —
// the same pattern Apple/Google Maps use, which matters here because the
// point of tapping a pin is usually "what is this one, and what's near it".

var PlateLedgerDetail = (function () {
  "use strict";

  var sheet, grabber, headEl, bodyEl, current = null, expanded = false;

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

  function isBeen(r) {
    return r.status === PlateLedgerDB.STATUS.BEEN;
  }

  function stars(n) {
    return "★".repeat(n) + "☆".repeat(5 - n);
  }

  function yesNo(v) {
    return v ? "Yes" : "No";
  }

  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  // One "Label / value" row. Anything empty, null, or an empty array is
  // skipped entirely rather than rendered as a blank line — a detail card
  // full of empty labels is worse than a short one.
  function detailRow(label, value) {
    if (value === null || value === undefined || value === "") return null;
    if (Array.isArray(value)) {
      if (!value.length) return null;
      value = value.join(", ");
    }
    return el("div", { class: "detail-row" }, [
      el("div", { class: "detail-row-label", text: label }),
      el("div", { class: "detail-row-value", text: String(value) }),
    ]);
  }

  function buildHead(r) {
    headEl.innerHTML = "";

    var badge = el("span", {
      class: "detail-badge " + (isBeen(r) ? "detail-badge-been" : "detail-badge-want"),
      text: isBeen(r) ? "Been" : "Want to Go",
    });

    headEl.appendChild(
      el("div", { class: "detail-title-row" }, [
        el("div", { class: "detail-name", text: r.name }),
        badge,
      ])
    );

    // Compact summary line: whichever of rating / price / cuisine / town
    // actually exist, in that order. This is what shows in the collapsed
    // peek, so it's deliberately the highest-signal fields only.
    var bits = [];
    if (isBeen(r) && r.rating) bits.push(stars(r.rating));
    if (r.priceRange) bits.push(r.priceRange);
    if (r.cuisines && r.cuisines.length) bits.push(r.cuisines.join(", "));
    if (r.town) bits.push(r.town);
    if (bits.length) {
      headEl.appendChild(el("div", { class: "detail-summary", text: bits.join("  ·  ") }));
    }
    if (r.address) {
      headEl.appendChild(el("div", { class: "detail-address", text: r.address }));
    }

    var editBtn = el("button", { type: "button", class: "detail-edit-btn", text: "Edit" });
    editBtn.onclick = function (e) {
      e.stopPropagation();
      PlateLedgerForm.openEdit(r);
    };
    headEl.appendChild(el("div", { class: "detail-actions" }, [editBtn]));
  }

  function buildBody(r) {
    bodyEl.innerHTML = "";
    var rows = [
      detailRow("Recommended by", r.recommendedBy),
      detailRow("Notes", r.notes),
      detailRow("Last visited", formatDate(r.lastVisited)),
      detailRow("What we had", r.mealsHad),
      detailRow("Service style", r.serviceStyle),
      detailRow("Reservations", r.reservations),
      detailRow("Noise level", r.noiseLevel),
      detailRow("Dietary", r.dietaryTags),
      // Booleans are tri-state in the schema (true / false / null =
      // "never answered"), so only render the ones actually answered.
      r.nonChain === null ? null : detailRow("Non-chain", yesNo(r.nonChain)),
      r.goodDateSpot === null ? null : detailRow("Good date spot", yesNo(r.goodDateSpot)),
      r.wouldGoAgain === null ? null : detailRow("Would go again", yesNo(r.wouldGoAgain)),
      r.goodForGroups === null ? null : detailRow("Good for groups", yesNo(r.goodForGroups)),
      r.outdoorSeating === null ? null : detailRow("Outdoor seating", yesNo(r.outdoorSeating)),
      detailRow("Added", formatDate(r.dateAdded)),
    ].filter(Boolean);

    rows.forEach(function (row) {
      bodyEl.appendChild(row);
    });

    if (r.websiteUrl) {
      var link = el("a", {
        class: "detail-link",
        href: r.websiteUrl,
        target: "_blank",
        rel: "noopener",
        text: "Website / menu",
      });
      bodyEl.appendChild(link);
    }

    if (!rows.length && !r.websiteUrl) {
      bodyEl.appendChild(
        el("div", { class: "detail-empty", text: "No extra details saved yet. Tap Edit to add some." })
      );
    }
  }

  function setExpanded(next) {
    expanded = next;
    sheet.classList.toggle("detail-expanded", expanded);
    sheet.classList.toggle("detail-collapsed", !expanded);
  }

  function open(r) {
    current = r;
    buildHead(r);
    buildBody(r);
    sheet.style.transform = "";
    sheet.classList.add("detail-open");
    setExpanded(false);
  }

  function close() {
    current = null;
    sheet.style.transform = "";
    sheet.classList.remove("detail-open", "detail-expanded", "detail-collapsed");
  }

  // Drag handling on the grabber/header. Follows the finger, then snaps to
  // expanded / collapsed / dismissed on release. Written with raw touch
  // events because `html, body { touch-action: none }` (the Phase 3 bottom-bar
  // fix) means we can't lean on any native scroll/drag behavior here.
  function wireDrag(handle) {
    var startY = null;
    var baseCollapsed = true;
    var dy = 0;

    handle.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) return;
      startY = e.touches[0].clientY;
      baseCollapsed = !expanded;
      dy = 0;
      sheet.style.transition = "none";
    }, { passive: true });

    handle.addEventListener("touchmove", function (e) {
      if (startY === null) return;
      dy = e.touches[0].clientY - startY;
      // Only let it move in the direction there's somewhere to go.
      if (expanded && dy < 0) dy = 0;
      sheet.style.transform = "translateY(calc(var(--detail-base) + " + dy + "px))";
    }, { passive: true });

    handle.addEventListener("touchend", function () {
      if (startY === null) return;
      sheet.style.transition = "";
      sheet.style.transform = "";
      var THRESHOLD = 60;
      if (baseCollapsed && dy < -THRESHOLD) setExpanded(true);
      else if (!baseCollapsed && dy > THRESHOLD) setExpanded(false);
      else if (baseCollapsed && dy > THRESHOLD) close();
      startY = null;
      dy = 0;
    });
  }

  function build() {
    grabber = el("div", { class: "detail-grabber" }, [el("div", { class: "detail-grabber-bar" })]);
    headEl = el("div", { class: "detail-head" });
    bodyEl = el("div", { class: "detail-body" });
    sheet = el("div", { class: "detail-sheet", id: "detail-sheet" }, [grabber, headEl, bodyEl]);
    document.body.appendChild(sheet);

    // Tap anywhere on the grabber/header (other than Edit, which stops
    // propagation) toggles expanded — dragging is nice but a plain tap is
    // the discoverable version.
    grabber.onclick = function () { setExpanded(!expanded); };
    headEl.onclick = function () { setExpanded(!expanded); };

    wireDrag(grabber);
    wireDrag(headEl);
  }

  document.addEventListener("DOMContentLoaded", build);

  // Keep an open sheet honest after an edit, a delete, or an import: re-read
  // the record and either refresh it or close if it's gone.
  window.addEventListener("plateledger:changed", function () {
    if (!current) return;
    PlateLedgerDB.getRestaurant(current.id).then(function (fresh) {
      if (!fresh) {
        close();
        return;
      }
      current = fresh;
      buildHead(fresh);
      buildBody(fresh);
    });
  });

  return {
    open: open,
    close: close,
    isOpen: function () { return !!current; },
  };
})();
