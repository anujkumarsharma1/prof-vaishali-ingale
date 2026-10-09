/* Publications page: topic filter chips (topic map in _data/pub_topics.yml) and Copy BibTeX.
   Without JavaScript the chips stay hidden and every paper is listed. */
(function () {
  "use strict";
  var bar = document.querySelector(".pub-filter");
  var status = document.querySelector(".pub-status");
  var mapEl = document.getElementById("pub-topics");
  var list = document.querySelector(".publications");
  if (!bar || !mapEl || !list) return;

  var map = {};
  try { map = JSON.parse(mapEl.textContent) || {}; } catch (e) { return; }

  var items = Array.prototype.slice.call(list.querySelectorAll("ol.bibliography > li"));
  items.forEach(function (li) {
    var keyEl = li.querySelector("[id]");
    var key = keyEl ? keyEl.id : "";
    li.setAttribute("data-topic", map[key] || "other");
  });

  var chips = Array.prototype.slice.call(bar.querySelectorAll(".pub-chip"));
  var current = "all";

  function isShown(li) {
    return !li.classList.contains("topic-off") && !li.classList.contains("search-off");
  }

  function visibleCount() {
    return items.filter(isShown).length;
  }

  function regroup() {
    list.querySelectorAll("ol.bibliography").forEach(function (ol) {
      var shown = Array.prototype.some.call(ol.children, isShown);
      ol.classList.toggle("group-off", !shown);
      var h = ol.previousElementSibling;
      if (h && h.tagName === "H2") h.classList.toggle("group-off", !shown);
    });
  }

  function announce() {
    var n = visibleCount();
    status.textContent = "Showing " + n + (n === 1 ? " paper" : " papers");
  }

  function apply(topic, speak) {
    current = topic;
    items.forEach(function (li) {
      li.classList.toggle("topic-off", topic !== "all" && li.getAttribute("data-topic") !== topic);
    });
    chips.forEach(function (c) {
      c.setAttribute("aria-pressed", c.getAttribute("data-topic") === topic ? "true" : "false");
    });
    regroup();
    if (speak) announce();
  }

  chips.forEach(function (c) {
    c.addEventListener("click", function () { apply(c.getAttribute("data-topic"), true); });
  });

  /* ---------- text filter (replaces al-folio's bibsearch.js on this page) ---------- */
  var search = document.getElementById("bibsearch");
  var searchWrap = document.querySelector(".pub-search");
  var texts = items.map(function (li) { return li.textContent.replace(/\s+/g, " ").toLowerCase(); });
  var timer;
  function filterText() {
    var q = (search.value || "").trim().toLowerCase();
    items.forEach(function (li, i) { li.classList.toggle("search-off", q !== "" && texts[i].indexOf(q) === -1); });
    regroup();
    announce();
  }
  if (search) {
    search.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(filterText, 200); });
    if (searchWrap) searchWrap.hidden = false;
  }

  bar.hidden = false;
  status.hidden = false;
  apply("all", false);
  announce();

  /* ---------- Bib toggle: make it a real keyboard control ---------- */
  list.querySelectorAll("a.bibtex").forEach(function (a) {
    var panel = a.closest("li") && a.closest("li").querySelector(".bibtex.hidden");
    a.setAttribute("tabindex", "0");
    a.setAttribute("aria-expanded", "false");
    a.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); a.click(); }
    });
    a.addEventListener("click", function () {
      setTimeout(function () {
        a.setAttribute("aria-expanded", panel && panel.classList.contains("open") ? "true" : "false");
      }, 0);
    });

    /* ---------- Copy BibTeX ---------- */
    var code = panel && panel.querySelector("code");
    if (!code) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm z-depth-0 pub-copy";
    btn.textContent = "Copy BibTeX";
    a.insertAdjacentElement("afterend", btn);
    btn.addEventListener("click", function () {
      var text = code.textContent.trim() + "\n";
      function done(ok) {
        btn.textContent = ok ? "Copied" : "Select and copy";
        status.textContent = ok ? "BibTeX copied" : "BibTeX shown below. Select it and copy.";
        setTimeout(function () { btn.textContent = "Copy BibTeX"; }, 2000);
      }
      function fallback() {
        if (!panel.classList.contains("open")) a.click();
        var r = document.createRange();
        r.selectNodeContents(code);
        var s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
        done(false);
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
      } else {
        fallback();
      }
    });
  });
})();
