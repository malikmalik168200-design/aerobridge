/* ============================================================
   AeroBridge — Growth Record (page-specific)
   Vanilla JS. Depends on shell.js having run first (for language/
   theme + the shared header/nav).
   ============================================================ */
(function () {
  "use strict";

  var STORAGE_KEY = "aerobridge.growth-record.v1";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------
     Seed data — modest, realistic (two-person personal tool).
     "clean" = consecutive error-free runs toward mastery target.
     trend = direction of recent ERROR-RATE ("down" is good).
     ---------------------------------------------------------- */
  var DEFAULT_DATA = {
    owner: { name: "نورة الشهري", initials: "NS" },
    updated: "2026-08-06",
    skills: [
      { track: "tech", code: "AN", nameAr: "توفر الرحلات", nameEn: "Availability", state: "mastered", pct: 100, clean: 5, target: 5, trend: "down" },
      { track: "tech", code: "SS", nameAr: "حجز المقاعد", nameEn: "Sell Segment", state: "mastered", pct: 100, clean: 5, target: 5, trend: "flat" },
      { track: "tech", code: "NM", nameAr: "اسم المسافر", nameEn: "Name Element", state: "progress", pct: 72, clean: 3, target: 5, trend: "down" },
      { track: "tech", code: "FQD", nameAr: "عرض الأسعار", nameEn: "Fare Display", state: "progress", pct: 45, clean: 2, target: 5, trend: "up" },
      { track: "tech", code: "FXP", nameAr: "تسعير الحجز", nameEn: "Pricing (PNR)", state: "progress", pct: 20, clean: 1, target: 5, trend: "flat" },
      { track: "tech", code: "ER/ET", nameAr: "حفظ الحجز", nameEn: "End & Retrieve", state: "notstarted", pct: 0, clean: 0, target: 5, trend: "flat" },
      { track: "tech", code: "TQT", nameAr: "معاينة التذكرة", nameEn: "Ticket Quote", state: "notstarted", pct: 0, clean: 0, target: 5, trend: "flat" },
      { track: "cs", code: "DE-ESC", nameAr: "تهدئة المسافر الغاضب", nameEn: "De-escalation", state: "progress", pct: 60, clean: 3, target: 5, trend: "down" },
      { track: "cs", code: "SCRIPT", nameAr: "نصوص إنجليزية احترافية", nameEn: "Professional English Scripts", state: "progress", pct: 38, clean: 2, target: 5, trend: "flat" },
      { track: "cs", code: "IRROPS", nameAr: "التعامل مع اضطراب الرحلات", nameEn: "Irregular Ops Handling", state: "notstarted", pct: 0, clean: 0, target: 5, trend: "flat" }
    ],
    history: [
      { date: "2026-08-06T14:20", track: "tech", code: "FXP", labelAr: "تسعير الحجز", labelEn: "Pricing (PNR)", durationMin: 18, result: "warn", summaryAr: "خطأ واحد في اختيار خانة السعر — أعيدت المحاولة بنجاح.", summaryEn: "One error selecting the fare line — retried successfully.", errors: 1 },
      { date: "2026-08-05T20:05", track: "cs", code: "DE-ESC", labelAr: "تهدئة المسافر الغاضب", labelEn: "De-escalation", durationMin: 12, result: "ok", summaryAr: "جولة نظيفة — نبرة مهنية وحل واضح.", summaryEn: "Clean run — professional tone, clear resolution.", errors: 0 },
      { date: "2026-08-05T09:40", track: "tech", code: "NM", labelAr: "اسم المسافر", labelEn: "Name Element", durationMin: 9, result: "ok", summaryAr: "جولة نظيفة — إدخال الاسم بالصيغة الصحيحة.", summaryEn: "Clean run — correct name format entered.", errors: 0 },
      { date: "2026-08-04T16:15", track: "tech", code: "FQD", labelAr: "عرض الأسعار", labelEn: "Fare Display", durationMin: 22, result: "warn", summaryAr: "خطآن في قراءة قواعد الأجرة — بحاجة لمراجعة.", summaryEn: "Two errors reading fare rules — needs review.", errors: 2 },
      { date: "2026-08-03T11:00", track: "tech", code: "SS", labelAr: "حجز المقاعد", labelEn: "Sell Segment", durationMin: 7, result: "ok", summaryAr: "جولة نظيفة — إتقان تام.", summaryEn: "Clean run — fully mastered.", errors: 0 },
      { date: "2026-08-02T19:30", track: "cs", code: "SCRIPT", labelAr: "نصوص إنجليزية احترافية", labelEn: "Professional English Scripts", durationMin: 15, result: "ok", summaryAr: "صياغة واضحة — خطأ نحوي بسيط.", summaryEn: "Clear phrasing — one minor grammar slip.", errors: 1 }
    ]
  };

  /* ---------------------------------------------------------- */
  var T = {
    ar: {
      dir: "rtl", lang: "ar",
      tabs: { record: "السجل", history: "التاريخ", reports: "التقارير" },
      backup: "نسخة احتياطية",
      pageSub: "سجل تدريب شخصي — تتبّع صادق للتقدّم عبر المسارين.",
      combinedNote: "سجل واحد يجمع المسارين التقني وخدمة العملاء.",
      tech: "المسار التقني — أوامر أماديوس", cs: "مسار خدمة العملاء",
      mastered: "مُتقَن", progress: "قيد التقدّم", notstarted: "لم يبدأ",
      cleanRuns: "جولات نظيفة", of: "من",
      trendDown: "معدّل الخطأ ينخفض", trendUp: "معدّل الخطأ يرتفع", trendFlat: "مستقر",
      legendMastered: "مُتقَن", legendProgress: "قيد التقدّم", legendNot: "لم يبدأ",
      min: "دقيقة", errors: "أخطاء", noErr: "بلا أخطاء",
      resultOk: "نظيفة", resultWarn: "بحاجة مراجعة",
      reportNote: "هذا ملخّص شخصي محلّي — <b>ليس شهادة موثّقة خارجيًا</b>. لا يوجد خادم أو تحقّق عبر الإنترنت؛ إنه سجلّك الخاص فقط.",
      reportKind: "ملخّص شخصي", exportPdf: "تصدير PDF", printLabel: "طباعة الملخّص",
      totalSkills: "المهارات", masteredN: "مُتقَنة", cleanN: "جولات نظيفة",
      backupTitle: "نسخة احتياطية للبيانات",
      backupDesc: "احفظ سجلّك الكامل كملف JSON خام أو استوردهُ. هذا يحميك من فقدان بيانات المتصفّح لأن التطبيق يعمل محليًا بدون خادم.",
      exportJson: "تصدير JSON", importJson: "استيراد JSON",
      backupHint: "JSON خام — يعمل بلا خادم، لحماية بياناتك المحلية.",
      close: "إغلاق", updated: "آخر تحديث", range: "الفترة"
    },
    en: {
      dir: "ltr", lang: "en",
      tabs: { record: "Record", history: "History", reports: "Reports" },
      backup: "Backup",
      pageSub: "A personal training log — an honest record across both tracks.",
      combinedNote: "One combined record for the Technical and Customer Service tracks.",
      tech: "Technical Track — Amadeus commands", cs: "Customer Service Track",
      mastered: "Mastered", progress: "In progress", notstarted: "Not started",
      cleanRuns: "clean runs", of: "of",
      trendDown: "error rate falling", trendUp: "error rate rising", trendFlat: "steady",
      legendMastered: "Mastered", legendProgress: "In progress", legendNot: "Not started",
      min: "min", errors: "errors", noErr: "no errors",
      resultOk: "Clean", resultWarn: "Needs review",
      reportNote: "This is a local personal summary — <b>not an externally verified certificate</b>. There is no server or online verification; it is your own record only.",
      reportKind: "Personal summary", exportPdf: "Export PDF", printLabel: "Print summary",
      totalSkills: "Skills", masteredN: "Mastered", cleanN: "Clean runs",
      backupTitle: "Back up your data",
      backupDesc: "Save your full record as raw JSON, or import it back. This protects you against browser data loss because the app runs locally with no backend.",
      exportJson: "Export JSON", importJson: "Import JSON",
      backupHint: "Raw JSON — works with no backend, to protect your local data.",
      close: "Close", updated: "Updated", range: "Range"
    }
  };

  /* ---------- State ---------- */
  var data = loadData();

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
  function saveData() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
  }

  function currentLang() {
    return window.AeroBridgeShell ? window.AeroBridgeShell.getLang() : "ar";
  }
  function t() { return T[currentLang()]; }

  /* ---------- Icons (linear, 1.5px stroke) ---------- */
  var I = {
    check: '<svg class="icon" viewBox="0 0 24 24" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>',
    terminal: '<svg class="icon" viewBox="0 0 24 24"><path d="m4 17 6-6-6-6"/><path d="M12 19h8"/></svg>',
    headset: '<svg class="icon" viewBox="0 0 24 24"><path d="M3 14v-3a9 9 0 0 1 18 0v3"/><path d="M21 16a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2z"/><path d="M3 16a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z"/><path d="M21 15v2a4 4 0 0 1-4 4h-5"/></svg>',
    down: '<svg class="icon" viewBox="0 0 24 24" stroke-width="1.8"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>',
    up: '<svg class="icon" viewBox="0 0 24 24" stroke-width="1.8"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>',
    flat: '<svg class="icon" viewBox="0 0 24 24" stroke-width="1.8"><path d="M5 12h14"/></svg>',
    clock: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    alert: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 9v4"/><path d="M10.4 3.4 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.6 3.4a2 2 0 0 0-3.2 0Z"/><path d="M12 17h.01"/></svg>',
    info: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>',
    printer: '<svg class="icon" viewBox="0 0 24 24"><path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7" rx="1"/></svg>',
    upload: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>',
    download: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>',
    x: '<svg class="icon" viewBox="0 0 24 24" stroke-width="1.8"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
  };

  /* ---------- Render: Record tab ---------- */
  function renderRecord() {
    var L = t();
    var techs = data.skills.filter(function (s) { return s.track === "tech"; });
    var css = data.skills.filter(function (s) { return s.track === "cs"; });

    var masteredCount = data.skills.filter(function (s) { return s.state === "mastered"; }).length;
    var progressCount = data.skills.filter(function (s) { return s.state === "progress"; }).length;
    var notCount = data.skills.filter(function (s) { return s.state === "notstarted"; }).length;

    var html = '<p class="page__sub" style="margin-bottom:var(--sp-4)">' + L.combinedNote + "</p>";
    html += '<div class="record-meta">' +
      chip("mastered", masteredCount, L.legendMastered) +
      chip("progress", progressCount, L.legendProgress) +
      chip("notstarted", notCount, L.legendNot) +
      "</div>";
    html += trackGroup("tech", I.terminal, L.tech, techs, L);
    html += trackGroup("cs", I.headset, L.cs, css, L);

    document.getElementById("panel-record").innerHTML = html;
  }

  function chip(kind, n, label) {
    return '<span class="chip"><span class="dot ' + kind + '"></span><b>' + n + "</b> " + label + "</span>";
  }

  function trackGroup(track, icon, title, list, L) {
    var items = list.map(function (s) { return skillRow(s, L); });
    return '<section class="track-group">' +
      '<div class="track-head">' + icon + "<h2>" + title + "</h2>" +
      '<span class="track-count">' + list.length + "</span></div>" +
      '<div class="skill-list">' + items.join("") + "</div>" +
      "</section>";
  }

  function skillRow(s, L) {
    var name = L.lang === "ar" ? s.nameAr : s.nameEn;
    var ring = ringMarkup(s);
    var stateTag = '<span class="state-tag ' + s.state + '">' + L[s.state] + "</span>";

    var trendClass = s.trend;
    var trendLabel = s.trend === "down" ? L.trendDown : s.trend === "up" ? L.trendUp : L.trendFlat;
    var trendIcon = s.trend === "down" ? I.down : s.trend === "up" ? I.up : I.flat;
    var trend = '<span class="trend ' + trendClass + '" title="' + trendLabel + '" aria-label="' + trendLabel + '">' + trendIcon + "</span>";

    var pips = "";
    for (var i = 0; i < s.target; i++) pips += '<span class="pip' + (i < s.clean ? " on" : "") + '"></span>';
    var clean = '<span class="clean-runs" title="' + s.clean + " " + L.of + " " + s.target + " " + L.cleanRuns + '">' +
      '<span class="pips">' + pips + "</span>" + s.clean + "/" + s.target + "</span>";

    var bar = s.state === "progress" ? '<div class="skill__bar"><span data-pct="' + s.pct + '"></span></div>' : "";

    return '<div class="skill skill--' + s.state + '">' + ring +
      '<div class="skill__main"><div class="skill__code">' + s.code + '</div><div class="skill__name">' + name + "</div>" + bar + "</div>" +
      '<div class="skill__aside">' + stateTag + '<div class="skill__meta">' + trend + clean + "</div></div>" +
      "</div>";
  }

  // SVG ring; JS animates stroke-dashoffset later
  function ringMarkup(s) {
    var r = 18;
    var c = 2 * Math.PI * r;
    var mod = s.state === "mastered" ? " ring--mastered" : s.state === "notstarted" ? " ring--notstarted" : "";
    var center = s.state === "mastered" ? '<span class="ring__label">' + I.check + "</span>" :
      s.state === "notstarted" ? '<span class="ring__label" style="color:var(--color-text-3)">—</span>' :
      '<span class="ring__label">' + s.pct + "</span>";

    return '<span class="ring__wrap"><svg class="ring' + mod + '" viewBox="0 0 44 44">' +
      '<circle class="ring__track" cx="22" cy="22" r="' + r + '"></circle>' +
      '<circle class="ring__fill" cx="22" cy="22" r="' + r + '" stroke-dasharray="' + c.toFixed(2) +
      '" stroke-dashoffset="' + c.toFixed(2) + '" data-circ="' + c.toFixed(2) + '" data-pct="' + s.pct + '"></circle>' +
      "</svg>" + center + "</span>";
  }

  /* ---------- Animation: bars + rings ---------- */
  function animateRecord() {
    var bars = document.querySelectorAll(".skill__bar span[data-pct]");
    var rings = document.querySelectorAll(".ring__fill[data-pct]");

    if (reduceMotion) {
      bars.forEach(function (b) { b.style.width = b.getAttribute("data-pct") + "%"; });
      rings.forEach(function (r) {
        var circ = parseFloat(r.getAttribute("data-circ"));
        var pct = parseFloat(r.getAttribute("data-pct"));
        r.style.strokeDashoffset = circ - (circ * pct) / 100;
      });
      return;
    }

    requestAnimationFrame(function () {
      rings.forEach(function (r) {
        var circ = parseFloat(r.getAttribute("data-circ"));
        var pct = parseFloat(r.getAttribute("data-pct"));
        r.style.strokeDashoffset = circ - (circ * pct) / 100;
      });
    });

    var DUR = 900;
    bars.forEach(function (b) {
      var target = parseFloat(b.getAttribute("data-pct"));
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / DUR, 1);
        var e = 1 - Math.pow(1 - p, 3);
        b.style.width = (target * e).toFixed(2) + "%";
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ---------- Render: History tab ---------- */
  function renderHistory() {
    var L = t();
    var items = data.history
      .slice()
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; })
      .map(function (h) {
        var label = L.lang === "ar" ? h.labelAr : h.labelEn;
        var summary = L.lang === "ar" ? h.summaryAr : h.summaryEn;
        var cls = h.result === "ok" ? "ok" : "warn";
        var resultTxt = h.result === "ok" ? L.resultOk : L.resultWarn;
        var errTxt = h.errors === 0 ? L.noErr : h.errors + " " + L.errors;

        return '<li class="tl-item ' + cls + '"><div class="tl-card">' +
          '<div class="tl-top"><div class="tl-title"><span class="code">' + h.code + "</span> · " + label + "</div>" +
          '<span class="tl-time">' + fmtDate(h.date, L.lang) + "</span></div>" +
          '<p class="tl-body">' + summary + "</p>" +
          '<div class="tl-foot"><span class="kv">' + I.clock + h.durationMin + " " + L.min + "</span>" +
          '<span class="kv">' + (h.errors === 0 ? I.check : I.alert) + errTxt + "</span>" +
          '<span class="tl-result ' + cls + '">' + resultTxt + "</span></div>" +
          "</div></li>";
      });

    document.getElementById("panel-history").innerHTML = '<ul class="timeline">' + items.join("") + "</ul>";
  }

  /* ---------- Render: Reports tab ---------- */
  function renderReports() {
    var L = t();
    var mastered = data.skills.filter(function (s) { return s.state === "mastered"; });
    var totalClean = data.skills.reduce(function (a, s) { return a + s.clean; }, 0);

    var rows = data.skills
      .filter(function (s) { return s.state !== "notstarted"; })
      .map(function (s) {
        var name = L.lang === "ar" ? s.nameAr : s.nameEn;
        var val = s.state === "mastered"
          ? '<span class="rp-val ok">' + L.mastered + "</span>"
          : '<span class="rp-val">' + s.pct + "% · " + s.clean + "/" + s.target + "</span>";
        return "<li>" + '<span class="rp-skill"><span class="code">' + s.code + "</span> " + name + "</span>" + val + "</li>";
      })
      .join("");

    var html = '<div class="report-note">' + I.info + "<p>" + L.reportNote + "</p></div>" +
      '<div class="report-preview" id="report-preview">' +
      '<div class="rp-head"><span class="brand__word"><span class="w-aero">Aero</span><span class="w-bridge">Bridge</span></span>' +
      '<span class="rp-kind">' + L.reportKind + "</span></div>" +
      '<div class="rp-body"><div class="rp-person">' + data.owner.name + "</div>" +
      '<div class="rp-range">' + L.updated + ": " + data.updated + "</div>" +
      '<div class="rp-stats">' +
      rpStat(data.skills.length, L.totalSkills) +
      rpStat(mastered.length, L.masteredN, true) +
      rpStat(totalClean, L.cleanN) +
      "</div>" +
      '<ul class="rp-list">' + rows + "</ul>" +
      "</div>" +
      '<div class="rp-foot">AeroBridge · local personal record · generated ' + new Date().toISOString().slice(0, 10) + "</div>" +
      "</div>" +
      '<div class="report-actions"><button class="btn btn--primary" id="export-pdf">' + I.printer + "<span>" + L.exportPdf + "</span></button></div>";

    document.getElementById("panel-reports").innerHTML = html;
    document.getElementById("export-pdf").addEventListener("click", function () { window.print(); });
  }

  function rpStat(n, label, ok) {
    return '<div class="rp-stat"><div class="n' + (ok ? " ok" : "") + '">' + n + '</div><div class="l">' + label + "</div></div>";
  }

  /* ---------- Helpers ---------- */
  function fmtDate(iso, lang) {
    var d = new Date(iso);
    try {
      return new Intl.DateTimeFormat(lang === "ar" ? "ar-SA" : "en-GB", {
        month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false
      }).format(d);
    } catch (e) {
      return iso.replace("T", " ");
    }
  }

  /* ---------- Tabs ---------- */
  function initTabs() {
    Array.prototype.slice.call(document.querySelectorAll(".tab")).forEach(function (btn) {
      btn.addEventListener("click", function () { selectTab(btn.getAttribute("data-tab")); });
    });
  }
  function selectTab(name) {
    document.querySelectorAll(".tab").forEach(function (b) {
      b.setAttribute("aria-selected", b.getAttribute("data-tab") === name ? "true" : "false");
    });
    ["record", "history", "reports"].forEach(function (n) {
      document.getElementById("panel-" + n).hidden = n !== name;
    });
    if (name === "record") animateRecord();
  }

  /* ---------- Labels that depend on language (content only — nav labels come from shell.js) ---------- */
  function applyContentLang() {
    var L = t();
    document.getElementById("page-title").textContent = L.lang === "ar" ? "سجل النمو" : "Growth Record";
    document.title = L.lang === "ar" ? "AeroBridge — سجل النمو" : "AeroBridge — Growth Record";
    document.getElementById("page-sub").textContent = L.pageSub;
    document.querySelector('[data-tab="record"]').textContent = L.tabs.record;
    document.querySelector('[data-tab="history"]').textContent = L.tabs.history;
    document.querySelector('[data-tab="reports"]').textContent = L.tabs.reports;
    document.getElementById("backup-label").textContent = L.backup;
  }

  function renderAll() {
    applyContentLang();
    renderRecord();
    renderHistory();
    renderReports();
    var active = document.querySelector('.tab[aria-selected="true"]');
    selectTab(active ? active.getAttribute("data-tab") : "record");
  }

  /* ---------- Backup (JSON import/export) ---------- */
  function initBackup() {
    var dlg = document.getElementById("backup-dialog");

    document.getElementById("backup-btn").addEventListener("click", function () {
      var L = t();
      document.getElementById("bk-title").textContent = L.backupTitle;
      document.getElementById("bk-desc").textContent = L.backupDesc;
      document.querySelector("#bk-export span").textContent = L.exportJson;
      document.querySelector("#bk-import span").textContent = L.importJson;
      document.getElementById("bk-hint").textContent = L.backupHint;
      if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    });

    document.getElementById("bk-close").addEventListener("click", function () { dlg.close(); });

    document.getElementById("bk-export").addEventListener("click", function () {
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "aerobridge-record-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    var fileInput = document.getElementById("bk-file");
    document.getElementById("bk-import").addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      var f = fileInput.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = JSON.parse(reader.result);
          if (!parsed.skills || !parsed.history) throw new Error("invalid shape");
          data = parsed;
          saveData();
          renderAll();
          dlg.close();
        } catch (e) {
          var hint = document.getElementById("bk-hint");
          hint.textContent = (currentLang() === "ar" ? "ملف غير صالح: " : "Invalid file: ") + e.message;
          hint.style.color = "var(--color-amber)";
        }
      };
      reader.readAsText(f);
      fileInput.value = "";
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    initTabs();
    initBackup();
    renderAll();
    document.documentElement.addEventListener("aerobridge:langchange", renderAll);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
