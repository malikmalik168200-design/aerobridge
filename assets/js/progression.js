/* ============================================================
   AeroBridge — Progression screen (page-specific)
   Vanilla JS, no dependencies. Depends on shell.js having run first
   (for language/theme + the shared header/nav).
   ============================================================ */
(function () {
  "use strict";

  var doc = document;

  /* ----------------------------------------------------------
     Content i18n — English (LTR) + Arabic (RTL)
     ---------------------------------------------------------- */
  var I18N = {
    en: {
      "continue.eyebrow": "Continue where you left off",
      "continue.level": "Level 3 · Basic",
      "continue.sub": "6 of 9 command sets practiced",
      "action.continue": "Continue",
      "tracks.heading": "Choose your track",
      "track.technical": "Technical Track",
      "track.service": "Customer Service Track",
      "track.technical.desc": "Core Amadeus GDS commands, from Basic fundamentals to Advanced workflows.",
      "track.service.desc": "Real-world communication scenarios: handling travellers with clarity, calm, and care.",
      "status.mastered": "Mastered",
      "status.available": "Ready to start",
      "status.locked": "Locked",
      "page.heading": "Progression",
      "level.signin.name": "Sign-in & Encode/Decode",
      "level.availability.name": "Availability & Sell",
      "level.pricing.name": "Pricing & Ticketing",
      "level.pnr.name": "PNR Creation",
      "level.ancillaries.name": "Ancillaries, Seats & Special Services",
      "level.queues.name": "Queues & PNR Management",
      "level.fares.name": "Advanced Fares & Reissue",
      "level.interline.name": "Interline & Group Bookings",
      "level.greeting.name": "Greeting & Rapport",
      "level.disruption.name": "Handling Flight Disruptions",
      "level.complaints.name": "De-escalating Complaints",
      "level.upsell.name": "Upselling with Empathy",
      "level.vip.name": "VIP & Special Assistance"
    },
    ar: {
      "continue.eyebrow": "تابع من حيث توقفت",
      "continue.level": "المستوى 3 · أساسي",
      "continue.sub": "تدربت على 6 من أصل 9 مجموعات أوامر",
      "action.continue": "متابعة",
      "tracks.heading": "اختر مسارك",
      "track.technical": "المسار التقني",
      "track.service": "مسار خدمة العملاء",
      "track.technical.desc": "أوامر أنظمة أماديوس الأساسية، من المبادئ الأساسية إلى سير العمل المتقدم.",
      "track.service.desc": "سيناريوهات تواصل واقعية: التعامل مع المسافرين بوضوح وهدوء واهتمام.",
      "status.mastered": "متقن",
      "status.available": "جاهز للبدء",
      "status.locked": "مقفل",
      "page.heading": "التقدّم",
      "level.signin.name": "تسجيل الدخول والترميز",
      "level.availability.name": "التوفر والحجز",
      "level.pricing.name": "التسعير وإصدار التذاكر",
      "level.pnr.name": "إنشاء ملف الحجز",
      "level.ancillaries.name": "الخدمات الإضافية والمقاعد والخدمات الخاصة",
      "level.queues.name": "قوائم الانتظار وإدارة الحجوزات",
      "level.fares.name": "الأسعار المتقدمة وإعادة الإصدار",
      "level.interline.name": "الرحلات المشتركة والحجوزات الجماعية",
      "level.greeting.name": "الترحيب وبناء العلاقة",
      "level.disruption.name": "التعامل مع اضطرابات الرحلات",
      "level.complaints.name": "تهدئة الشكاوى",
      "level.upsell.name": "البيع الإضافي بتعاطف",
      "level.vip.name": "كبار الشخصيات والمساعدة الخاصة"
    }
  };

  function currentLang() {
    return window.AeroBridgeShell ? window.AeroBridgeShell.getLang() : "ar";
  }

  function applyContentLang() {
    var dict = I18N[currentLang()];
    var nodes = doc.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute("data-i18n");
      if (dict[key] != null) nodes[i].textContent = dict[key];
    }
    doc.title = currentLang() === "ar" ? "AeroBridge — التقدّم" : "AeroBridge — Progression";
    updateTrackDesc();
  }

  /* ----------------------------------------------------------
     Track switcher
     ---------------------------------------------------------- */
  var trackSwitch = doc.querySelector(".track-switch");
  var trackTabs = doc.querySelectorAll(".track-tab");
  var trackDescEl = doc.getElementById("trackDesc");
  var panels = {
    technical: doc.getElementById("panel-technical"),
    service: doc.getElementById("panel-service")
  };
  var activeTrack = "technical";

  function updateTrackDesc() {
    if (!trackDescEl) return;
    var key = activeTrack === "service" ? "track.service.desc" : "track.technical.desc";
    trackDescEl.textContent = I18N[currentLang()][key];
  }

  function selectTrack(track) {
    if (track === activeTrack) return;
    activeTrack = track;
    if (trackSwitch) trackSwitch.setAttribute("data-active", track);

    for (var i = 0; i < trackTabs.length; i++) {
      var isActive = trackTabs[i].getAttribute("data-track") === track;
      trackTabs[i].classList.toggle("is-active", isActive);
      trackTabs[i].setAttribute("aria-selected", isActive ? "true" : "false");
    }

    Object.keys(panels).forEach(function (key) {
      var panel = panels[key];
      if (!panel) return;
      var show = key === track;
      panel.classList.toggle("is-hidden", !show);
      if (show) panel.removeAttribute("hidden"); else panel.setAttribute("hidden", "");
    });

    updateTrackDesc();
    animateProgress(panels[track]);
  }

  for (var t = 0; t < trackTabs.length; t++) {
    trackTabs[t].addEventListener("click", function () {
      selectTrack(this.getAttribute("data-track"));
    });
  }

  /* ----------------------------------------------------------
     Progress fill animation (bars + counting %)
     ---------------------------------------------------------- */
  function animateCount(el, target) {
    var start = null;
    var duration = 900;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = Math.round(eased * target);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  function animateProgress(scope) {
    if (!scope) return;
    var fills = scope.querySelectorAll(".level-bar-fill");
    var counts = scope.querySelectorAll(".pct-num");

    for (var i = 0; i < fills.length; i++) fills[i].style.width = "0%";
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        for (var j = 0; j < fills.length; j++) {
          fills[j].style.width = fills[j].getAttribute("data-fill") + "%";
        }
      });
    });
    for (var k = 0; k < counts.length; k++) {
      animateCount(counts[k], parseInt(counts[k].getAttribute("data-count"), 10) || 0);
    }
  }

  /* ----------------------------------------------------------
     Continue ring animation
     ---------------------------------------------------------- */
  function animateRing() {
    var ring = doc.getElementById("continueRing");
    var valEl = doc.getElementById("continueRingValue");
    var target = ring ? parseInt(ring.getAttribute("data-target"), 10) || 0 : 0;
    var circumference = 326.7; // 2 * pi * 52
    if (ring) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          ring.style.strokeDashoffset = circumference * (1 - target / 100);
        });
      });
    }
    if (valEl) animateCount(valEl, target);
  }

  /* ----------------------------------------------------------
     Real progress (AeroBridge Real Progress System Audit — approved)
     Reads assets/js/progress.js's computed output and applies it to
     the EXISTING level markup/CSS states (mastered/active/available/
     locked all already exist in index.html+CSS for every level —
     this only decides which level currently gets which state,
     instead of that being hardcoded per-level in the HTML).
     ---------------------------------------------------------- */
  var latestProgress = null;

  var STATUS_ICONS = {
    mastered: '<svg class="icon" viewBox="0 0 24 24"><path d="m5 13 4 4L19 7" /></svg>',
    chevron: '<svg class="icon" viewBox="0 0 24 24" stroke-width="2.4"><path d="m9 6 6 6-6 6" /></svg>',
    locked: '<svg class="icon" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>'
  };
  var CSS_STATE = { mastered: "mastered", progress: "active", available: "available", locked: "locked" };

  function levelButtonFor(key) {
    // Scoped to .level .level-name specifically — index.html's
    // continue-card title reuses the same data-i18n value as the
    // real level-list item for whichever level was hardcoded as the
    // original example (level.pricing.name), so a bare attribute
    // selector can match the wrong element.
    var nameEl = doc.querySelector('.level .level-name[data-i18n="level.' + key + '.name"]');
    return nameEl ? nameEl.closest(".level") : null;
  }

  function applyLevelResult(lvl) {
    var btn = levelButtonFor(lvl.key);
    if (!btn) return;

    var cssState = CSS_STATE[lvl.state] || "locked";
    btn.className = "level level--" + cssState;
    btn.setAttribute("data-progress", lvl.pct);
    if (cssState === "active") btn.setAttribute("aria-current", "step"); else btn.removeAttribute("aria-current");
    if (cssState === "locked") btn.setAttribute("aria-disabled", "true"); else btn.removeAttribute("aria-disabled");

    var main = btn.querySelector(".level-main");
    var nameSpan = main.querySelector(".level-name");
    var second = nameSpan.nextElementSibling;
    if (cssState === "active") {
      second.outerHTML =
        '<span class="level-progress"><span class="level-bar"><span class="level-bar-fill" data-fill="' + lvl.pct + '"></span></span>' +
        '<span class="level-pct"><span class="pct-num" data-count="' + lvl.pct + '">0</span>%</span></span>';
    } else {
      var metaKey = cssState === "mastered" ? "status.mastered" : cssState === "locked" ? "status.locked" : "status.available";
      second.outerHTML = '<span class="level-meta" data-i18n="' + metaKey + '"></span>';
    }

    var statusEl = btn.querySelector(".level-status");
    if (statusEl) {
      statusEl.setAttribute("data-status", cssState);
      statusEl.innerHTML = cssState === "mastered" ? STATUS_ICONS.mastered : cssState === "locked" ? STATUS_ICONS.locked : STATUS_ICONS.chevron;
    }
  }

  function courseLabel(lvl, lang) {
    var advanced = lvl.course === "advanced";
    if (lang === "ar") return advanced ? "متقدم" : "أساسي";
    return advanced ? "Advanced" : "Basic";
  }

  // .continue-label / .continue-sub / .continue-title carry a fixed
  // data-i18n in index.html (can't be changed — index.html is not
  // modified by this task) that only ever matches the ORIGINAL
  // hardcoded "Level 3 · Pricing" example. Real values are computed
  // per-language and applied here, run AFTER applyContentLang() so
  // they are not clobbered by its generic [data-i18n] loop.
  function applyContinueCard() {
    var lang = currentLang();
    var labelEl = doc.querySelector(".continue-label");
    var subEl = doc.querySelector(".continue-sub");
    var titleEl = doc.querySelector(".continue-title");

    if (!latestProgress || !latestProgress.frontier) {
      if (labelEl) labelEl.textContent = "";
      if (subEl) subEl.textContent = "";
      if (titleEl) titleEl.textContent = "";
      return;
    }
    var lvl = latestProgress.frontier;
    var idx = latestProgress.technical.findIndex(function (l) { return l.key === lvl.key; }) + 1;

    if (labelEl) {
      labelEl.textContent = lang === "ar"
        ? "المستوى " + idx + " · " + courseLabel(lvl, lang)
        : "Level " + idx + " · " + courseLabel(lvl, lang);
    }
    if (titleEl) titleEl.textContent = lang === "ar" ? lvl.nameAr : lvl.nameEn;
    if (subEl) {
      subEl.textContent = lvl.totalCount > 0
        ? (lang === "ar"
            ? "تدربت على " + lvl.attemptedCount + " من أصل " + lvl.totalCount + " مجموعات أوامر"
            : lvl.attemptedCount + " of " + lvl.totalCount + " command sets practiced")
        : (lang === "ar" ? "لسه محتاج تبدأ هنا" : "Not started yet");
    }
  }

  function applyRealProgress(progress) {
    latestProgress = progress;
    progress.technical.forEach(applyLevelResult);
    progress.service.forEach(applyLevelResult);

    var ringTarget = progress.frontier ? progress.frontier.pct : 0;
    var ring = doc.getElementById("continueRing");
    if (ring) ring.setAttribute("data-target", ringTarget);
    var ringWrap = doc.querySelector(".ring");
    if (ringWrap) {
      ringWrap.setAttribute("aria-label", ringTarget + (currentLang() === "ar" ? " بالمئة مكتمل" : " percent complete"));
    }
  }

  function loadRealProgress() {
    import("./progress.js").then(function (mod) {
      return mod.computeProgress();
    }).catch(function (err) {
      console.error("progression.js: real progress unavailable, failing safe to empty/zero state", err);
      return import("./progress.js").then(function (mod) { return mod.emptyProgress(); });
    }).then(function (progress) {
      applyRealProgress(progress);
      applyContentLang();
      applyContinueCard();
      animateRing();
      animateProgress(panels[activeTrack]);
    });
  }

  /* ----------------------------------------------------------
     Continue button — gentle press feedback (no real routing yet;
     Practice screen isn't built, so this stays a no-op on purpose —
     see PROJECT.md Honest Scope principle)
     ---------------------------------------------------------- */
  var continueBtn = doc.getElementById("continueBtn");
  if (continueBtn) {
    continueBtn.addEventListener("click", function () {
      continueBtn.animate(
        [{ transform: "scale(1)" }, { transform: "scale(0.97)" }, { transform: "scale(1)" }],
        { duration: 220, easing: "ease-out" }
      );
    });
  }

  /* ----------------------------------------------------------
     Init
     ---------------------------------------------------------- */
  document.documentElement.addEventListener("aerobridge:langchange", function () {
    applyContentLang();
    applyContinueCard();
  });
  applyContentLang();
  loadRealProgress();
})();
