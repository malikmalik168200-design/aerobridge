/* ============================================================
   AeroBridge — event-bridge.js
   Integration layer described in SDD.md §2.

   RESPONSIBILITY (and only this): take exactly what the trainee
   typed, route it to the real engine, take exactly what the real
   engine returns, hand it back untouched, and log the event. No
   reformatting of engine output. No invented responses. No error
   classification (that is errors.js / Coach's job — out of scope
   here by design, per SDD.md §2 and PROJECT.md's frozen-module
   rule).

   ROUTING EXCEPTION (COMMAND_REFERENCE.md §8):
   parser.js's own QN/QI handlers always return "NOT IN QUEUE MODE"
   — the real "next/ignore" logic for an active queue browse session
   lives in queues.js's handleQueueModeInput(), reached only via
   startQueueBrowse() (QS). This bridge checks isQueueModeActive()
   BEFORE calling parser.js, and routes there directly when true.
   queues.js is a singleton module (same import specifier as the one
   parser.js uses internally), so both sides observe the same
   browseState — no duplicated state here.

   SCOPE PHASE 2 (FQD/FXP/FXB/FQN/FQR): fares.json is loaded and
   pricing.js is initialized too. FQD/FXP/FXB/FQN/FQR needed ZERO
   new routing logic here — they were already reaching parser.js's
   real handlers through the existing parseCommand() branch (no
   queue-mode-style exception exists for pricing). The only gap was
   that pricing.js's internal fare data was never loaded, so this
   phase's change is one more fetch+init call, mirroring the
   parser.js pattern above.

   DATA PATH (confirmed against the actual deployed repository, not
   assumed): all five JSON files — airports, airlines, flights, rbd,
   fares — live together in one root-level Data/ folder. Two earlier,
   incorrect assumptions were made and corrected in sequence: first
   that all five lived under assets/data/ (wrong — that caused a
   total engine-boot failure the moment fares.json was added, since
   Promise.all rejects if any one fetch 404s), then that only
   fares.json lived under Data/ while the other four stayed under
   assets/data/ (also wrong — confirmed via direct inspection that
   airports/airlines/flights/rbd.json are in Data/ too). There is now
   a single dataBasePath, used identically for all five files — no
   more reason to special-case fares.json separately, since it isn't
   actually in a different location. SDD.md §5 documents a plain
   `data/*.json` path with no assets/ prefix at all; that section
   predates the current assets/ reorganization for CSS/JS and was not
   used to decide this path, but its lowercase `data/` is closer in
   spirit to the real Data/ than assets/data/ ever was.

   SCOPE PHASE 3 (Terminal Live Wiring Gap — L5/L6, narrowly closed):
   Scenario Bank scenarios 11 and 12 require SM/ST (seatmaps.js) and
   QT/QC/QS/QN/QI (queues.js) to be genuinely reachable, not just
   routed. Both were already fully wired inside parser.js itself
   (imports + switch/case handlers existed for both command families
   before this change) — the only missing piece was that
   initSeatmaps()/initQueues() were never called anywhere, so both
   modules' internal data stayed empty and every SM/QT/etc. call
   degraded to the already-coded "no data" response (e.g.
   'NO ACTIVE QUEUES', 'NO SEATMAP DATA FOR THIS AIRCRAFT TYPE') —
   never a route failure, always a real, executed function operating
   on an empty array.
   Same fetch+init pattern as pricing.js above: seatmaps.json (a raw
   array — initSeatmaps(data) expects data itself to be the array,
   confirmed by reading seatmaps.js directly) and queues.json (an
   object shaped { queues: [...] } — initQueues(data) expects
   data.queues, confirmed the same way) are fetched and passed
   through as-is, with zero transformation.
   ancillary.js's initAncillary() is deliberately still NOT called.
   Neither scenario 11 (SM/ST only) nor scenario 12 (QT/QC/QS/QN/QI
   only) exercises any ancillary.js command (HA/HS/CA/CS/SR/TI) —
   confirmed by reading both scenarios' `steps` arrays directly, not
   assumed. Wiring initAncillary() now would be unrelated scope
   expansion with no current scenario to justify or test it against;
   it remains an open item for whenever ancillary-specific scenario
   content is actually authored.
   ============================================================ */

import { initParser, normalizeInput, parseCommand } from '../../parser.js';
import { isQueueModeActive, handleQueueModeInput, initQueues } from '../../queues.js';
import { initPricing } from '../../pricing.js';
import { initSeatmaps } from '../../seatmaps.js';

let engineReady = false;
const eventLog = [];

// Persistence (AeroBridge Real Progress System Audit — approved).
// Same read/write-a-JSON-blob pattern already proven in
// growth-record.js's loadData()/saveData(), applied to this
// module's own eventLog. Does not change what gets routed to the
// engine or what the terminal displays — additive only.
const EVENT_LOG_STORAGE_KEY = 'aerobridge.event-log.v1';

function loadPersistedEventLog() {
  try {
    const raw = localStorage.getItem(EVENT_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function persistEventLog() {
  try {
    localStorage.setItem(EVENT_LOG_STORAGE_KEY, JSON.stringify(eventLog));
  } catch (err) {
    // Storage unavailable/full — this session's in-memory log still
    // works for the current page; persistence is best-effort only.
  }
}

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`event-bridge: failed to load ${path} (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Loads the real data files parser.js, pricing.js, queues.js, and
 * seatmaps.js need, and initializes all four. Must resolve before
 * submitCommand() is called — the terminal input should stay
 * disabled until this promise resolves.
 *
 * @param {string} [dataBasePath] - defaults to 'Data/'. All seven
 *   JSON files (airports, airlines, flights, rbd, fares, queues,
 *   seatmaps) live in this single root-level Data/ folder in the
 *   actual repository — confirmed directly against the deployed
 *   repo, not assumed.
 */
export async function initEngine(dataBasePath) {
  const base = dataBasePath || 'Data/';

  const [airports, airlines, flights, rbd, fares, queues, seatmaps] = await Promise.all([
    fetchJSON(base + 'airports.json'),
    fetchJSON(base + 'airlines.json'),
    fetchJSON(base + 'flights.json'),
    fetchJSON(base + 'rbd.json'),
    fetchJSON(base + 'fares.json'),
    fetchJSON(base + 'queues.json'),
    fetchJSON(base + 'seatmaps.json')
  ]);

  initParser({ airports, airlines, flights, rbd });
  initPricing(fares);
  initQueues(queues);
  initSeatmaps(seatmaps);

  eventLog.push.apply(eventLog, loadPersistedEventLog());

  engineReady = true;
}

export function isEngineReady() {
  return engineReady;
}

/**
 * The single entry point the terminal UI calls. Takes exactly what
 * the trainee typed (pre-normalization is fine — this normalizes
 * again internally, matching the engine's own normalizeInput, so
 * callers never need to think about case).
 *
 * @param {string} rawInput
 * @param {{ scenarioId?: (number|string), scenarioStepIndex?: number, mode?: ('learn'|'practice'|'assessment') }} [options] -
 *   Optional, additive Scenario Bank forward-compatibility hook (see
 *   AeroBridge_Scenario_Bank_Architecture_Decision_Review.md §8A/§9).
 *   No current caller (practice.js) passes this — when omitted, the
 *   returned/logged event object is identical in shape to before
 *   this change. Nothing here reads or interprets these values;
 *   they are recorded as-is for a future scenario-runner to consume.
 * @returns {{ command: string, response: string, event: object }}
 */
export function submitCommand(rawInput, options) {
  if (!engineReady) {
    throw new Error('event-bridge: initEngine() must complete before submitCommand() is called');
  }

  const command = normalizeInput(rawInput);

  // Routing exception — COMMAND_REFERENCE.md §8. Must be checked
  // BEFORE parser.js, not after, and not as a fallback.
  const response = isQueueModeActive()
    ? handleQueueModeInput(command)
    : parseCommand(command);

  const event = {
    type: 'terminal_command',
    command,
    response,
    timestamp: new Date().toISOString()
  };

  if (options && options.scenarioId !== undefined) {
    event.scenarioId = options.scenarioId;
  }
  if (options && options.scenarioStepIndex !== undefined) {
    event.scenarioStepIndex = options.scenarioStepIndex;
  }
  if (options && options.mode !== undefined) {
    event.mode = options.mode;
  }

  eventLog.push(event);
  persistEventLog();

  return { command, response, event };
}

/**
 * Read-only snapshot of everything logged so far, including events
 * restored from a previous session. Persisted to localStorage under
 * EVENT_LOG_STORAGE_KEY on every push and restored in initEngine();
 * progress.js reads the same storage key independently as the
 * single source of truth for Progression / Growth Record.
 */
export function getEventLog() {
  return eventLog.slice();
}
