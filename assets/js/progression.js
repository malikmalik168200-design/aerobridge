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
    var target = 68;
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
  document.documentElement.addEventListener("aerobridge:langchange", applyContentLang);
  applyContentLang();
  animateRing();
  animateProgress(panels.technical);
})();
