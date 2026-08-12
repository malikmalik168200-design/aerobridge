/* ============================================================
   AeroBridge — progress.js
   Single source of truth for trainee progress. Read-only consumer
   of the persisted real event log written by event-bridge.js.

   Does NOT modify parser.js / pnr.js / pricing.js / ancillary.js /
   queues.js / seatmaps.js / errors.js / errors.json. Uses errors.js's
   existing exported classification API exactly as-is (initErrors,
   classifyError) — the same way event-bridge.js already uses
   parser.js's exports without modifying parser.js itself.

   No mock/seed/historical data. An empty or missing event log
   produces all-zero/empty output.
   ============================================================ */

// ------------------------------------------------------------
// Contract shared with event-bridge.js. Must match exactly.
// ------------------------------------------------------------
const EVENT_LOG_KEY = 'aerobridge.event-log.v1';

// ------------------------------------------------------------
// Audited classification exclusions (AeroBridge Real Progress
// System Audit). errors.json currently has no matchKey for these
// commands' "not real data yet" responses (NO FARE RULES AVAILABLE
// FOR THIS FARE / NO SEATMAP DATA FOR THIS AIRCRAFT TYPE), so
// classifyError() would return null (= "looks like success") for
// them even on failure. Excluded from success-counting until either
// the catalog is extended or fares.json/seatmaps.json gain real
// data. Attempts still count as "attempted", never as "successful".
// ------------------------------------------------------------
const EXCLUDED_FROM_SUCCESS = new Set(['FQN', 'FQR', 'SM', 'ST']);

// ------------------------------------------------------------
// Command-code extraction — mirrors parser.js's own dispatch
// order (3-letter codes checked before 2-letter codes). Read-only
// classification of an already-produced command string; does not
// touch parser.js.
// ------------------------------------------------------------
const THREE_LETTER_CODES = ['FQD', 'FXP', 'TTP', 'FXB', 'DAC', 'DNA', 'FQN', 'FQR'];
const TWO_LETTER_CODES = [
  'AN', 'SS', 'NM', 'AP', 'TK', 'RF', 'ER',
  'HA', 'HS', 'CA', 'CS', 'SR', 'TI',
  'QT', 'QC', 'QS', 'QN', 'QI', 'QE',
  'RT', 'XE', 'IG', 'ET',
  'RM', 'OS', 'SN',
  'QD',
  'SM', 'ST'
];

function extractCommandCode(command) {
  if (!command) return null;
  const upper = command.toUpperCase();
  const three = upper.slice(0, 3);
  if (THREE_LETTER_CODES.indexOf(three) !== -1) return three;
  const two = upper.slice(0, 2);
  if (TWO_LETTER_CODES.indexOf(two) !== -1) return two;
  return null;
}

// ------------------------------------------------------------
// Curriculum mapping — level -> which real command codes belong
// to it. Grounded in AMADEUS_CURRICULUM.md's lesson groupings and
// COMMAND_REFERENCE.md, adapted to fit the 8-level Technical /
// 5-level Customer Service structure already shown in index.html.
// Levels with an empty codes[] have no real engine-backed activity
// yet (Advanced Fares & Reissue, Interline & Group Bookings, and
// the entire Customer Service track — no CS scenario engine exists
// yet, only the raw Amadeus terminal). They stay locked/not-started
// until a real activity source exists for them — no invented data.
//
// NOTE: this is an explicit editorial decision, not something
// documented elsewhere verbatim — flagged in the implementation
// report for review.
// ------------------------------------------------------------
const LEVELS = {
  technical: [
    { key: 'signin', nameAr: 'تسجيل الدخول والترميز', nameEn: 'Sign-in & Encode/Decode', codes: ['DAC', 'DNA'], course: 'basic' },
    { key: 'availability', nameAr: 'التوفر والحجز', nameEn: 'Availability & Sell', codes: ['AN', 'SN', 'SS'], course: 'basic' },
    { key: 'pricing', nameAr: 'التسعير وإصدار التذاكر', nameEn: 'Pricing & Ticketing', codes: ['FQD', 'FXP', 'FXB', 'FQN', 'FQR', 'TTP'], course: 'basic' },
    { key: 'pnr', nameAr: 'إنشاء ملف الحجز', nameEn: 'PNR Creation', codes: ['NM', 'AP', 'TK', 'RF', 'ER', 'ET'], course: 'basic' },
    { key: 'ancillaries', nameAr: 'الخدمات الإضافية والمقاعد والخدمات الخاصة', nameEn: 'Ancillaries, Seats & Special Services', codes: ['HA', 'HS', 'CA', 'CS', 'SR', 'SM', 'ST', 'TI'], course: 'basic' },
    { key: 'queues', nameAr: 'قوائم الانتظار وإدارة الحجوزات', nameEn: 'Queues & PNR Management', codes: ['QT', 'QC', 'QS', 'QD', 'QE', 'RT', 'XE', 'IG', 'RM', 'OS'], course: 'basic' },
    { key: 'fares', nameAr: 'الأسعار المتقدمة وإعادة الإصدار', nameEn: 'Advanced Fares & Reissue', codes: [], course: 'advanced' },
    { key: 'interline', nameAr: 'الرحلات المشتركة والحجوزات الجماعية', nameEn: 'Interline & Group Bookings', codes: [], course: 'advanced' }
  ],
  service: [
    { key: 'greeting', nameAr: 'الترحيب وبناء العلاقة', nameEn: 'Greeting & Rapport', codes: [], course: 'basic' },
    { key: 'disruption', nameAr: 'التعامل مع اضطرابات الرحلات', nameEn: 'Handling Flight Disruptions', codes: [], course: 'basic' },
    { key: 'complaints', nameAr: 'تهدئة الشكاوى', nameEn: 'De-escalating Complaints', codes: [], course: 'basic' },
    { key: 'upsell', nameAr: 'البيع الإضافي بتعاطف', nameEn: 'Upselling with Empathy', codes: [], course: 'advanced' },
    { key: 'vip', nameAr: 'كبار الشخصيات والمساعدة الخاصة', nameEn: 'VIP & Special Assistance', codes: [], course: 'advanced' }
  ]
};

// ------------------------------------------------------------
// Provisional mastery constant. Not invented from nothing: 5 is
// the one number already used uniformly as the "clean/target" for
// every skill in growth-record.js's old DEFAULT_DATA mock, and
// matches the "cleanRunsNeeded" concept described in
// PRODUCT_STRATEGY_UX_ARCHITECTURE.md §5/§8 (a single success does
// not equal mastery). No such rule exists in engine code today —
// this is the smallest concrete placeholder needed to render the
// existing Mastered/Active/Locked states from real data, isolated
// in this one constant so it is trivially replaceable once a real
// mastery rule is decided. Flagged explicitly in the audit report.
// ------------------------------------------------------------
const CLEAN_RUNS_TARGET = 5;

function readLocalStorage(key) {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch (err) {
    return null;
  }
}

function loadEventLog() {
  const raw = readLocalStorage(EVENT_LOG_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

/**
 * Loads errors.json and initializes errors.js's classifier.
 * Uses errors.js's existing exported API only (initErrors,
 * classifyError) — does not modify errors.js.
 *
 * @param {string} [errorsJsonPath] - defaults to 'Data/errors.json',
 *   matching the Data/ location event-bridge.js already confirmed
 *   for the other engine JSON files. NOT independently re-confirmed
 *   for errors.json specifically in this session — flagged in the
 *   report as an assumption to verify.
 */
async function loadClassifier(errorsJsonPath) {
  const path = errorsJsonPath || 'Data/errors.json';
  const mod = await import('../../errors.js');
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`progress.js: failed to load ${path} (HTTP ${res.status})`);
  }
  const catalog = await res.json();
  mod.initErrors(catalog);
  return mod.classifyError;
}

/**
 * Groups raw events by command code and reduces each group to
 * {attempts, successes, currentStreak, lastTimestamp}, walking the
 * events for that code in chronological order. currentStreak is
 * the number of consecutive successes ending at the most recent
 * attempt for that code (resets to 0 on the most recent failure).
 */
function computePerCodeStats(events, classifyError) {
  const sorted = events.slice().sort(function (a, b) {
    return new Date(a.timestamp) - new Date(b.timestamp);
  });

  const byCode = {};

  sorted.forEach(function (evt) {
    const code = extractCommandCode(evt.command);
    if (!code) return; // unrecognized/malformed command — not attributable to any skill

    if (!byCode[code]) {
      byCode[code] = { code: code, attempts: 0, successes: 0, currentStreak: 0, lastTimestamp: null, lastSuccess: null };
    }
    const stat = byCode[code];

    const trustedForSuccess = !EXCLUDED_FROM_SUCCESS.has(code);
    const isSuccess = trustedForSuccess && classifyError(evt.response) === null;

    stat.attempts += 1;
    stat.lastTimestamp = evt.timestamp;
    stat.lastSuccess = isSuccess;
    if (isSuccess) {
      stat.successes += 1;
      stat.currentStreak += 1;
    } else {
      stat.currentStreak = 0;
    }
  });

  return byCode;
}

function readiness(stat) {
  if (!stat) return 0;
  return Math.min(stat.currentStreak, CLEAN_RUNS_TARGET) / CLEAN_RUNS_TARGET;
}

function computeLevelResult(levelDef, byCode) {
  if (!levelDef.codes.length) {
    return { key: levelDef.key, nameAr: levelDef.nameAr, nameEn: levelDef.nameEn, course: levelDef.course, pct: 0, state: 'notstarted', attemptedCount: 0, totalCount: 0 };
  }

  let sumReadiness = 0;
  let attemptedCount = 0;
  let allMastered = true;
  let anyAttempted = false;

  levelDef.codes.forEach(function (code) {
    const stat = byCode[code];
    const r = readiness(stat);
    sumReadiness += r;
    if (stat && stat.attempts > 0) {
      attemptedCount += 1;
      anyAttempted = true;
    }
    if (r < 1) allMastered = false;
  });

  const pct = Math.round((sumReadiness / levelDef.codes.length) * 100);
  const state = allMastered ? 'mastered' : (anyAttempted ? 'progress' : 'notstarted');

  return {
    key: levelDef.key, nameAr: levelDef.nameAr, nameEn: levelDef.nameEn, course: levelDef.course,
    pct: pct, state: state, attemptedCount: attemptedCount, totalCount: levelDef.codes.length
  };
}

/**
 * Applies sequential unlock gating on top of raw computed level
 * results: level[0] of a track is always at least "available";
 * level[i>0] is "locked" unless level[i-1] is "mastered".
 */
function applyGating(levelResults) {
  const gated = [];
  levelResults.forEach(function (lvl, i) {
    if (i === 0) {
      gated.push(lvl.state === 'notstarted' ? Object.assign({}, lvl, { state: 'available' }) : lvl);
      return;
    }
    // Must check the already-gated previous entry, not the raw input
    // array — otherwise an earlier lock doesn't cascade forward.
    const prevMastered = gated[i - 1].state === 'mastered';
    if (!prevMastered) {
      gated.push(Object.assign({}, lvl, { state: 'locked', pct: 0 }));
      return;
    }
    gated.push(lvl.state === 'notstarted' ? Object.assign({}, lvl, { state: 'available' }) : lvl);
  });
  return gated;
}

function findFrontier(gatedLevels) {
  for (let i = 0; i < gatedLevels.length; i++) {
    if (gatedLevels[i].state !== 'mastered' && gatedLevels[i].state !== 'locked') return gatedLevels[i];
  }
  return null; // everything mastered or nothing unlockable (all-empty track)
}

/**
 * Main entry point. Returns the full computed progress structure
 * for both Progression and Growth Record to render from. Pure
 * function of the persisted event log + errors.json catalog — no
 * mock data, no invented history.
 *
 * @param {string} [errorsJsonPath]
 * @returns {object}
 */
export async function computeProgress(errorsJsonPath) {
  const events = loadEventLog();
  const classifyError = await loadClassifier(errorsJsonPath);
  const byCode = computePerCodeStats(events, classifyError);

  const technicalRaw = LEVELS.technical.map(function (l) { return computeLevelResult(l, byCode); });
  const serviceRaw = LEVELS.service.map(function (l) { return computeLevelResult(l, byCode); });

  const technical = applyGating(technicalRaw);
  const service = applyGating(serviceRaw);

  const frontier = findFrontier(technical);

  const sortedEvents = events.slice().sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
  const rawEvents = sortedEvents.map(function (evt) {
    const code = extractCommandCode(evt.command);
    const trustedForSuccess = code && !EXCLUDED_FROM_SUCCESS.has(code);
    const isSuccess = !!trustedForSuccess && classifyError(evt.response) === null;
    return { command: evt.command, code: code, response: evt.response, timestamp: evt.timestamp, isSuccess: isSuccess };
  });

  return {
    technical: technical,
    service: service,
    frontier: frontier, // level object or null
    perCode: byCode,
    rawEvents: rawEvents, // newest first, each classified
    hasAnyActivity: events.length > 0
  };
}

/**
 * Same shape as computeProgress(), assuming zero events — no fetch,
 * no classifier needed. Used as a safe, honest fallback if the real
 * catalog can't be loaded (e.g. errors.json unreachable), so callers
 * never have to fall back to leaving stale/mock UI content in place.
 */
export function emptyProgress() {
  const technical = applyGating(LEVELS.technical.map(function (l) { return computeLevelResult(l, {}); }));
  const service = applyGating(LEVELS.service.map(function (l) { return computeLevelResult(l, {}); }));
  return { technical: technical, service: service, frontier: findFrontier(technical), perCode: {}, rawEvents: [], hasAnyActivity: false };
}

export { LEVELS, CLEAN_RUNS_TARGET, EXCLUDED_FROM_SUCCESS, extractCommandCode };
