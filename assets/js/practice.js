/* ============================================================
   AeroBridge — Practice / Terminal screen (page-specific)
   Depends on shell.js having run first (language/theme + shared
   header/nav). Owns: mode switcher, coach card, reference drawer,
   timer. The terminal input itself has no page-specific JS beyond
   focus/caret styling (handled in CSS) — it's a visual shell only,
   not yet wired to the real Amadeus engine.
   ============================================================ */
(function () {
  "use strict";

  var doc = document;
  var modeButtons = Array.prototype.slice.call(doc.querySelectorAll(".mode-btn"));
  var modeStatus = doc.getElementById("mode-status");
  var warning = doc.getElementById("assessment-warning");
  var coach = doc.getElementById("coach-card");
  var coachToggle = doc.getElementById("coach-toggle");
  var drawer = doc.getElementById("reference-drawer");
  var backdrop = doc.getElementById("drawer-backdrop");
  var referenceToggle = doc.getElementById("reference-toggle");
  var referenceClose = doc.getElementById("reference-close");
  var timerEl = doc.getElementById("timer");

  var mode = "learn";
  var seconds = 42;

  var MODE_LABELS = {
    ar: { learn: "وضع التعلم", practice: "وضع التدريب", assessment: "وضع التقييم" },
    en: { learn: "Learn mode", practice: "Practice mode", assessment: "Assessment mode" }
  };
  var COACH_LABELS = {
    ar: { expand: "توسيع", collapse: "طي" },
    en: { expand: "Expand", collapse: "Collapse" }
  };

  function currentLang() {
    return window.AeroBridgeShell ? window.AeroBridgeShell.getLang() : "ar";
  }

  /* ---------------------------------------------------------
     Content translation — same data-ar/data-en attribute swap
     pattern as before, now driven by the shared language state.
     --------------------------------------------------------- */
  function applyContentLang() {
    var lang = currentLang();
    doc.querySelectorAll("[data-ar][data-en]").forEach(function (el) {
      el.textContent = el.dataset[lang];
    });
    modeStatus.textContent = MODE_LABELS[lang][mode];
    var collapsed = coach.classList.contains("is-collapsed");
    coachToggle.textContent = COACH_LABELS[lang][collapsed ? "expand" : "collapse"];
    doc.title = lang === "ar" ? "AeroBridge — التدريب" : "AeroBridge — Practice";
  }

  /* ---------------------------------------------------------
     Mode switcher
     --------------------------------------------------------- */
  function setMode(nextMode) {
    mode = nextMode;
    modeButtons.forEach(function (btn) {
      var active = btn.getAttribute("data-mode") === mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    modeStatus.textContent = MODE_LABELS[currentLang()][mode];

    var isAssessment = mode === "assessment";
    warning.hidden = !isAssessment;
    coach.hidden = isAssessment;
    referenceToggle.disabled = isAssessment;
    referenceToggle.setAttribute("aria-disabled", String(isAssessment));
    timerEl.classList.toggle("is-prominent", isAssessment);
    if (isAssessment) closeDrawer();
  }

  modeButtons.forEach(function (btn) {
    btn.addEventListener("click", function () { setMode(btn.getAttribute("data-mode")); });
  });

  /* ---------------------------------------------------------
     Coach card collapse/expand
     --------------------------------------------------------- */
  coachToggle.addEventListener("click", function () {
    var collapsed = coach.classList.toggle("is-collapsed");
    coachToggle.setAttribute("aria-expanded", String(!collapsed));
    coachToggle.textContent = COACH_LABELS[currentLang()][collapsed ? "expand" : "collapse"];
  });

  /* ---------------------------------------------------------
     Reference drawer
     --------------------------------------------------------- */
  function openDrawer() {
    if (mode === "assessment") return;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    referenceToggle.setAttribute("aria-expanded", "true");
    backdrop.hidden = false;
  }
  function closeDrawer() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    referenceToggle.setAttribute("aria-expanded", "false");
    backdrop.hidden = true;
  }
  referenceToggle.addEventListener("click", openDrawer);
  referenceClose.addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });

  /* ---------------------------------------------------------
     Elapsed-time timer (visual only, matches Practice/Assessment intent)
     --------------------------------------------------------- */
  setInterval(function () {
    seconds += 1;
    var m = String(Math.floor(seconds / 60)).padStart(2, "0");
    var s = String(seconds % 60).padStart(2, "0");
    timerEl.textContent = m + ":" + s;
  }, 1000);

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */
  doc.documentElement.addEventListener("aerobridge:langchange", applyContentLang);
  applyContentLang();
  setMode("learn");
})();
