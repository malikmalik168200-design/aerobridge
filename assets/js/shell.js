/* ============================================================
   AeroBridge — Shared Shell behavior
   Runs on every page. Owns: language + theme persistence (shared
   localStorage keys so choices survive navigating between pages),
   header controls, and marking the active bottom-nav item.

   Exposes window.AeroBridgeShell = { getLang, getTheme, t }
   Fires "aerobridge:langchange" and "aerobridge:themechange" on
   <html> so each page's own script can re-render its own content.
   ============================================================ */
(function () {
  "use strict";

  var PREFS_KEY = "aerobridge.prefs.v1";
  var doc = document;
  var html = doc.documentElement;

  var NAV_LABELS = {
    ar: { progression: "التقدّم", practice: "التدريب", growth: "سجل النمو" },
    en: { progression: "Progression", practice: "Practice", growth: "Growth Record" }
  };

  /* ---------- Prefs ---------- */
  function loadPrefs() {
    try {
      var p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      return { lang: p.lang === "en" ? "en" : "ar", theme: p.theme === "light" ? "light" : "dark" };
    } catch (e) {
      return { lang: "ar", theme: "dark" };
    }
  }
  function savePrefs(prefs) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) {}
  }

  var prefs = loadPrefs();

  function applyTheme() {
    html.setAttribute("data-theme", prefs.theme);
    var meta = doc.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", prefs.theme === "light" ? "#f4f6fb" : "#0b0e1a");
  }

  function applyLang() {
    html.setAttribute("lang", prefs.lang);
    html.setAttribute("dir", prefs.lang === "ar" ? "rtl" : "ltr");

    var segAr = doc.getElementById("lang-ar");
    var segEn = doc.getElementById("lang-en");
    if (segAr) segAr.setAttribute("aria-pressed", prefs.lang === "ar" ? "true" : "false");
    if (segEn) segEn.setAttribute("aria-pressed", prefs.lang === "en" ? "true" : "false");

    var L = NAV_LABELS[prefs.lang];
    var navP = doc.getElementById("nav-progression");
    var navPr = doc.getElementById("nav-practice");
    var navG = doc.getElementById("nav-growth");
    if (navP) navP.textContent = L.progression;
    if (navPr) navPr.textContent = L.practice;
    if (navG) navG.textContent = L.growth;
  }

  function setLang(lang) {
    if (lang === prefs.lang) return;
    prefs.lang = lang;
    savePrefs(prefs);
    applyLang();
    html.dispatchEvent(new CustomEvent("aerobridge:langchange", { detail: { lang: lang } }));
  }

  function setTheme(theme) {
    prefs.theme = theme;
    savePrefs(prefs);
    applyTheme();
    html.dispatchEvent(new CustomEvent("aerobridge:themechange", { detail: { theme: theme } }));
  }

  /* ---------- Wire header controls ---------- */
  function initHeader() {
    var segAr = doc.getElementById("lang-ar");
    var segEn = doc.getElementById("lang-en");
    if (segAr) segAr.addEventListener("click", function () { setLang("ar"); });
    if (segEn) segEn.addEventListener("click", function () { setLang("en"); });

    var themeBtn = doc.getElementById("theme-toggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        setTheme(prefs.theme === "dark" ? "light" : "dark");
      });
    }
  }

  /* ---------- Prevent navigation on not-yet-built pages (Honest Scope) ---------- */
  function initNavGuards() {
    doc.querySelectorAll('.nav-item[aria-disabled="true"]').forEach(function (el) {
      el.addEventListener("click", function (e) { e.preventDefault(); });
    });
  }

  /* ---------- Mark the active bottom-nav item by current filename ---------- */
  function markActiveNav() {
    var path = (location.pathname.split("/").pop() || "index.html");
    var map = { "index.html": "nav-link-progression", "": "nav-link-progression",
                "growth-record.html": "nav-link-growth", "practice.html": "nav-link-practice" };
    var activeId = map[path];
    doc.querySelectorAll(".nav-item").forEach(function (el) {
      if (el.id === activeId) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
  }

  /* ---------- Boot ---------- */
  applyTheme();
  applyLang();
  initHeader();
  initNavGuards();
  markActiveNav();

  window.AeroBridgeShell = {
    getLang: function () { return prefs.lang; },
    getTheme: function () { return prefs.theme; }
  };
})();
