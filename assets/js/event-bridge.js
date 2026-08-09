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

   SCOPE THIS SESSION: only the data parser.js needs (airports,
   airlines, flights, rbd) is loaded/initialized. pricing.js,
   ancillary.js, and seatmaps.js are transitively imported (parser.js
   imports them at the top of its module graph) but their init
   functions are deliberately NOT called yet — their commands
   (FQD, HA, CA, QT...) are out of scope for this session and have
   not been tested end-to-end. Calling their real handlers with
   uninitialized (empty-array) internal data is still 100% honest —
   parser.js itself will return real messages like
   "NO FARES FOUND FOR CITY PAIR..." — but wiring their init is
   deferred to the session that actually builds and tests those
   commands, per DEVELOPMENT_RULES.md "build one feature at a time".
   ============================================================ */

import { initParser, normalizeInput, parseCommand } from './parser.js';
import { isQueueModeActive, handleQueueModeInput } from './queues.js';

let engineReady = false;
const eventLog = [];

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`event-bridge: failed to load ${path} (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Loads the real data files parser.js needs and initializes it.
 * Must resolve before submitCommand() is called — the terminal
 * input should stay disabled until this promise resolves.
 *
 * @param {string} [dataBasePath] - defaults to 'assets/data/' to
 *   match the existing assets/css, assets/js convention already
 *   used by shell.css / shell.js.
 */
export async function initEngine(dataBasePath) {
  const base = dataBasePath || 'assets/data/';

  const [airports, airlines, flights, rbd] = await Promise.all([
    fetchJSON(base + 'airports.json'),
    fetchJSON(base + 'airlines.json'),
    fetchJSON(base + 'flights.json'),
    fetchJSON(base + 'rbd.json')
  ]);

  initParser({ airports, airlines, flights, rbd });
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
 * @returns {{ command: string, response: string, event: object }}
 */
export function submitCommand(rawInput) {
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
  eventLog.push(event);

  return { command, response, event };
}

/**
 * Read-only snapshot of everything logged this session. storage.js
 * (Phase 5, not built yet) will be the thing that persists this —
 * this bridge only produces the correctly-shaped events in memory.
 */
export function getEventLog() {
  return eventLog.slice();
}
