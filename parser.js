import {
  sellSegment,
  addName,
  addContact,
  addTicketingArrangement,
  addReceivedFrom,
  endAndRetrieve,
  getCurrentPNR,
  addHotelSegment,
  addCarSegment,
  addSSR,
  endTransact,
  ignorePnr,
  retrievePnr,
  cancelElement,
  addTicketingTimeLimit,
  addMobileContact,
  addEmailContact,
  addRemark,
  addOsi,
  issueTicket,
  setSelectedSeat
} from './pnr.js';

import { getFareQuote, getFareForBookingClass, getFareRules } from './pricing.js';

import {
  findHotelsByCity,
  findCarsByCity,
  getSSRInfo,
  getTimaticInfo,
  addNightsToDate
} from './ancillary.js';

import {
  getQueueTableDisplay,
  getQueueCountDisplay,
  startQueueBrowse,
  addPnrToQueue,
  deletePnrFromQueue
} from './queues.js';

import { getSeatMapDisplay, selectSeat } from './seatmaps.js';

const COMMAND_CODES = [
  'AN', 'SS', 'NM', 'AP', 'TK', 'RF', 'ER',
  'HA', 'HS', 'CA', 'CS', 'SR', 'TI',
  'QT', 'QC', 'QS', 'QN', 'QI', 'QE',
  'RT', 'XE', 'IG', 'ET',
  'RM', 'OS', 'SN',
  'QD',
  'SM', 'ST'
];

const THREE_LETTER_COMMAND_CODES = ['FQD', 'FXP', 'TTP', 'FXB', 'DAC', 'DNA', 'FQN', 'FQR'];

let airportsData = [];
let airlinesData = [];
let flightsData = [];
let rbdCodes = [];

let lastAvailabilityDisplay = null;
let lastHotelAvailabilityDisplay = null;
let lastCarAvailabilityDisplay = null;

let lastCompletedPnr = null;

export function initParser(data) {
  airportsData = data.airports || [];
  airlinesData = data.airlines || [];
  flightsData = data.flights || [];

  rbdCodes = extractRbdCodes(data.rbd);
  if (rbdCodes.length !== 10) {
    rbdCodes = ['F', 'A', 'J', 'C', 'D', 'Y', 'B', 'M', 'H', 'K'];
  }
}

function extractRbdCodes(rbdData) {
  if (!Array.isArray(rbdData)) return [];
  return rbdData
    .map((item) => {
      if (typeof item === 'string') return item.toUpperCase();
      if (item && typeof item === 'object') {
        for (const key of Object.keys(item)) {
          const val = item[key];
          if (typeof val === 'string' && /^[A-Z]$/i.test(val)) {
            return val.toUpperCase();
          }
        }
      }
      return null;
    })
    .filter(Boolean);
}

export function normalizeInput(raw) {
  return String(raw).trim().toUpperCase();
}

export function parseCommand(cmd) {
  const threeCode = cmd.slice(0, 3);
  if (THREE_LETTER_COMMAND_CODES.includes(threeCode)) {
    switch (threeCode) {
      case 'FQD':
        return handleFQD(cmd);
      case 'FXP':
        return handleFXP(cmd);
      case 'TTP':
        return handleTTP(cmd);
      case 'FXB':
        return handleFXB(cmd);
      case 'DAC':
        return handleDAC(cmd);
      case 'DNA':
        return handleDNA(cmd);
      case 'FQN':
      case 'FQR':
        return handleFQN(cmd);
      default:
        return 'UNKNOWN COMMAND';
    }
  }

  const code = cmd.slice(0, 2);

  if (!COMMAND_CODES.includes(code)) {
    return 'UNKNOWN COMMAND';
  }

  switch (code) {
    case 'AN':
      return handleAN(cmd);
    case 'SS':
      return handleSS(cmd);
    case 'NM':
      return handleNM(cmd);
    case 'AP':
      return handleAP(cmd);
    case 'TK':
      return handleTK(cmd);
    case 'RF':
      return handleRF(cmd);
    case 'ER':
      return handleER(cmd);
    case 'HA':
      return handleHA(cmd);
    case 'HS':
      return handleHS(cmd);
    case 'CA':
      return handleCA(cmd);
    case 'CS':
      return handleCS(cmd);
    case 'SR':
      return handleSR(cmd);
    case 'TI':
      return handleTI(cmd);
    case 'QT':
      return handleQT(cmd);
    case 'QC':
      return handleQC(cmd);
    case 'QS':
      return handleQS(cmd);
    case 'QN':
      return handleQN(cmd);
    case 'QI':
      return handleQI(cmd);
    case 'QE':
      return handleQE(cmd);
    case 'RT':
      return handleRT(cmd);
    case 'XE':
      return handleXE(cmd);
    case 'IG':
      return handleIG(cmd);
    case 'ET':
      return handleET(cmd);
    case 'RM':
      return handleRM(cmd);
    case 'OS':
      return handleOS(cmd);
    case 'SN':
      return handleSN(cmd);
    case 'QD':
      return handleQD(cmd);
    case 'SM':
      return handleSM(cmd);
    case 'ST':
      return handleST(cmd);
    default:
      return 'UNKNOWN COMMAND';
  }
}

/* ---------------- AN ---------------- */
const AN_REGEX = /^AN(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)([A-Z]{3})([A-Z]{3})$/;

function handleAN(cmd) {
  const match = cmd.match(AN_REGEX);
  if (!match) return 'FORMAT';

  const [, dayStr, month, origin, destination] = match;
  const day = parseInt(dayStr, 10);
  if (day < 1 || day > 31) return 'FORMAT';

  const date = dayStr + month;

  if (!airportsData.some((a) => a.iataCode === origin)) {
    return `UNKNOWN CITY/AIRPORT ${origin}`;
  }
  if (!airportsData.some((a) => a.iataCode === destination)) {
    return `UNKNOWN CITY/AIRPORT ${destination}`;
  }
  if (origin === destination) return 'INVALID CITY PAIR';

  const matches = flightsData.filter(
    (f) => f.origin === origin && f.destination === destination && f.departureDate === date
  );

  if (matches.length === 0) return 'NO FLIGHTS FOUND FOR CITY PAIR/DATE';

  lastAvailabilityDisplay = { origin, destination, date, flights: matches };

  const lines = [];
  lines.push(`** AVAILABILITY - AN **  ${origin}-${destination}  ${date}`);
  lines.push('');

  matches.forEach((f, idx) => {
    const lineNum = String(idx + 1).padStart(2, ' ');
    const rbdBlock = rbdCodes
      .map((code) => {
        const value = f.availability[code] ?? 0;
        return `${code}${value === -1 ? 'L' : value}`;
      })
      .join(' ');
    const line =
      `${lineNum}  ${f.airlineCode} ${f.flightNumber.padEnd(4, ' ')}  ${rbdBlock}  ` +
      `${f.origin} ${f.destination}  ${f.departureTime} ${f.arrivalTime}  ${f.aircraftType}`;
    lines.push(line);
  });

  return lines.join('\n');
}

/* ---------------- SS ---------------- */
const SS_REGEX = /^SS(\d{1,2})([A-Z])(\d)$/;

const DIRECT_SS_REGEX =
  /^SS([A-Z]{2})(\d{3,4})([A-Z])(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)([A-Z]{3})([A-Z]{3})NN(\d)$/;

function handleSS(cmd) {
  const match = cmd.match(SS_REGEX);
  if (match) {
    return handleSSFromDisplay(match);
  }

  const directMatch = cmd.match(DIRECT_SS_REGEX);
  if (directMatch) {
    return handleDirectSell(directMatch);
  }

  return 'FORMAT';
}

function handleSSFromDisplay(match) {
  const [, lineNumStr, bookingClass, seatsStr] = match;

  if (!lastAvailabilityDisplay) return 'NEED AVAILABILITY DISPLAY FIRST';

  const lineNum = parseInt(lineNumStr, 10);
  const flightsShown = lastAvailabilityDisplay.flights;
  if (lineNum < 1 || lineNum > flightsShown.length) return 'INVALID LINE NUMBER';

  if (!rbdCodes.includes(bookingClass)) return 'INVALID CLASS';

  const flight = flightsShown[lineNum - 1];
  const available = flight.availability[bookingClass] ?? 0;

  if (available === -1) {
    const waitlistSeats = parseInt(seatsStr, 10);
    const result = sellSegment(lineNum, flight, bookingClass, waitlistSeats, 'HL');
    return result.message;
  }

  if (available === 0) return 'CLASS NOT AVAILABLE';

  const seats = parseInt(seatsStr, 10);
  if (seats > available) return 'NOT ENOUGH SEATS AVAILABLE';

  const result = sellSegment(lineNum, flight, bookingClass, seats);
  return result.message;
}

function handleDirectSell(match) {
  const [, airlineCode, flightNumber, bookingClass, dayStr, month, origin, destination, seatsStr] = match;

  const day = parseInt(dayStr, 10);
  if (day < 1 || day > 31) return 'FORMAT';
  const date = dayStr + month;

  if (!airportsData.some((a) => a.iataCode === origin)) {
    return `UNKNOWN CITY/AIRPORT ${origin}`;
  }
  if (!airportsData.some((a) => a.iataCode === destination)) {
    return `UNKNOWN CITY/AIRPORT ${destination}`;
  }

  const flight = flightsData.find(
    (f) =>
      f.airlineCode === airlineCode &&
      f.flightNumber === flightNumber &&
      f.origin === origin &&
      f.destination === destination &&
      f.departureDate === date
  );
  if (!flight) return 'NO FLIGHTS FOUND FOR CITY PAIR/DATE';

  if (!rbdCodes.includes(bookingClass)) return 'INVALID CLASS';

  const available = flight.availability[bookingClass] ?? 0;

  const seats = parseInt(seatsStr, 10);

  if (available === -1) {
    const result = sellSegment(1, flight, bookingClass, seats, 'HL');
    return result.message;
  }

  if (available === 0) return 'CLASS NOT AVAILABLE';
  if (seats > available) return 'NOT ENOUGH SEATS AVAILABLE';

  const result = sellSegment(1, flight, bookingClass, seats);
  return result.message;
}

/* ---------------- NM ---------------- */
const NM_REGEX = /^NM1([A-Z]+)\/([A-Z]+)(?:\s(MR|MRS|MS|MSTR|MISS))?$/;

function handleNM(cmd) {
  const match = cmd.match(NM_REGEX);
  if (!match) return 'FORMAT';

  const [, lastName, firstName, title] = match;

  const result = addName(lastName, firstName, title);
  return result.message;
}

/* ---------------- AP (+ إضافة المرحلة 11 دفعة 2: APM/APE) ---------------- */
const AP_REGEX = /^AP\s([A-Z]{3})\s(\d{6,15})$/;
const APM_REGEX = /^APM\s(\d{6,15})$/;
const APE_REGEX = /^APE\s([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})$/;

function handleAP(cmd) {
  const apMatch = cmd.match(AP_REGEX);
  if (apMatch) {
    const [, cityCode, phone] = apMatch;
    const result = addContact(cityCode, phone);
    return result.message;
  }

  const apmMatch = cmd.match(APM_REGEX);
  if (apmMatch) {
    const [, phone] = apmMatch;
    const result = addMobileContact(phone);
    return result.message;
  }

  const apeMatch = cmd.match(APE_REGEX);
  if (apeMatch) {
    const [, email] = apeMatch;
    const result = addEmailContact(email);
    return result.message;
  }

  return 'FORMAT';
}

/* ---------------- TK (+ إضافة المرحلة 11 دفعة 2: TKTL) ---------------- */
const TKTL_REGEX = /^TKTL(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/;

function handleTK(cmd) {
  if (cmd === 'TKOK') {
    const result = addTicketingArrangement();
    return result.message;
  }

  const tlMatch = cmd.match(TKTL_REGEX);
  if (tlMatch) {
    const [, dayStr, month] = tlMatch;
    const day = parseInt(dayStr, 10);
    if (day < 1 || day > 31) return 'FORMAT';
    const result = addTicketingTimeLimit(dayStr + month);
    return result.message;
  }

  return 'FORMAT';
}

/* ---------------- RF ---------------- */
const RF_REGEX = /^RF\s([A-Z ]{2,20})$/;

function handleRF(cmd) {
  const match = cmd.match(RF_REGEX);
  if (!match) return 'FORMAT';

  const [, name] = match;
  const result = addReceivedFrom(name);
  return result.message;
}

/* ---------------- ER ---------------- */
// === تعديل المرحلة 13: nameSnapshot (كائن واحد) بقى passengersSnapshot
// (array) — بيتعرض الراكب الأول + "+N" لو فيه أكتر من راكب ===
function handleER(cmd) {
  if (cmd !== 'ER') return 'FORMAT';

  const passengersSnapshot = getCurrentPNR().passengers;

  const result = endAndRetrieve();

  if (result.success) {
    const locatorMatch = result.message.match(/RECORD LOCATOR:\s*([A-Z]{6})/);
    if (locatorMatch && passengersSnapshot.length > 0) {
      const first = passengersSnapshot[0];
      const titlePart = first.title ? ` ${first.title}` : '';
      const extra = passengersSnapshot.length > 1 ? ` +${passengersSnapshot.length - 1}` : '';
      lastCompletedPnr = {
        recordLocator: locatorMatch[1],
        passengerName: `${first.lastName}/${first.firstName}${titlePart}${extra}`
      };
    }
  }

  return result.message;
}

/* ==================================================================
   إضافة المرحلة 11 — سد فجوات ❌ (استرجاع/تجاهل/إلغاء عنصر/إنهاء بديل)
   ================================================================== */

/* ---------------- RT (فجوة عالية الأولوية) ---------------- */
const RT_REGEX = /^RT([A-Z]{6})$/;

function handleRT(cmd) {
  const match = cmd.match(RT_REGEX);
  if (!match) return 'FORMAT';

  const [, recordLocator] = match;
  const result = retrievePnr(recordLocator);
  return result.message;
}

/* ---------------- XE (فجوة عالية الأولوية) ---------------- */
const XE_REGEX = /^XE(\d{1,2})$/;

function handleXE(cmd) {
  const match = cmd.match(XE_REGEX);
  if (!match) return 'FORMAT';

  const [, lineNumStr] = match;
  const lineNumber = parseInt(lineNumStr, 10);

  const result = cancelElement(lineNumber);
  return result.message;
}

/* ---------------- IG (فجوة عالية الأولوية) ---------------- */
function handleIG(cmd) {
  if (cmd !== 'IG') return 'FORMAT';
  const result = ignorePnr();
  return result.message;
}

/* ---------------- RM (دفعة 2 — فجوة متوسطة الأولوية) ---------------- */
const RM_REGEX = /^RM (.+)$/;

function handleRM(cmd) {
  const match = cmd.match(RM_REGEX);
  if (!match) return 'FORMAT';

  const [, text] = match;
  const result = addRemark(text);
  return result.message;
}

/* ---------------- OS (دفعة 2 — فجوة متوسطة الأولوية) ---------------- */
const OS_REGEX = /^OS (.+)$/;

function handleOS(cmd) {
  const match = cmd.match(OS_REGEX);
  if (!match) return 'FORMAT';

  const [, text] = match;
  const result = addOsi(text);
  return result.message;
}

/* ---------------- SN (دفعة 2 — فجوة متوسطة الأولوية، جدول رحلات) ---------------- */
const SN_REGEX = /^SN(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)([A-Z]{3})([A-Z]{3})$/;

function handleSN(cmd) {
  const match = cmd.match(SN_REGEX);
  if (!match) return 'FORMAT';

  const [, dayStr, month, origin, destination] = match;
  const day = parseInt(dayStr, 10);
  if (day < 1 || day > 31) return 'FORMAT';

  const date = dayStr + month;

  if (!airportsData.some((a) => a.iataCode === origin)) {
    return `UNKNOWN CITY/AIRPORT ${origin}`;
  }
  if (!airportsData.some((a) => a.iataCode === destination)) {
    return `UNKNOWN CITY/AIRPORT ${destination}`;
  }
  if (origin === destination) return 'INVALID CITY PAIR';

  const matches = flightsData.filter(
    (f) => f.origin === origin && f.destination === destination && f.departureDate === date
  );

  if (matches.length === 0) return 'NO FLIGHTS FOUND FOR CITY PAIR/DATE';

  const lines = [];
  lines.push(`** SCHEDULE - SN **  ${origin}-${destination}  ${date}`);
  lines.push('');

  matches.forEach((f, idx) => {
    const lineNum = String(idx + 1).padStart(2, ' ');
    lines.push(
      `${lineNum}  ${f.airlineCode} ${f.flightNumber.padEnd(4, ' ')}  ` +
        `${f.origin} ${f.destination}  ${f.departureTime} ${f.arrivalTime}  ${f.aircraftType}`
    );
  });

  return lines.join('\n');
}

/* ---------------- ET (فجوة منخفضة الأولوية) ---------------- */
// === تعديل المرحلة 13: نفس تعديل handleER بالظبط ===
function handleET(cmd) {
  if (cmd !== 'ET') return 'FORMAT';

  const passengersSnapshot = getCurrentPNR().passengers;
  const result = endTransact();

  if (result.success) {
    const locatorMatch = result.message.match(/RECORD LOCATOR:\s*([A-Z]{6})/);
    if (locatorMatch && passengersSnapshot.length > 0) {
      const first = passengersSnapshot[0];
      const titlePart = first.title ? ` ${first.title}` : '';
      const extra = passengersSnapshot.length > 1 ? ` +${passengersSnapshot.length - 1}` : '';
      lastCompletedPnr = {
        recordLocator: locatorMatch[1],
        passengerName: `${first.lastName}/${first.firstName}${titlePart}${extra}`
      };
    }
  }

  return result.message;
}

/* ---------------- FQD ---------------- */
const FQD_REGEX = /^FQD([A-Z]{3})([A-Z]{3})$/;

function handleFQD(cmd) {
  const match = cmd.match(FQD_REGEX);
  if (!match) return 'FORMAT';

  const [, origin, destination] = match;

  if (!airportsData.some((a) => a.iataCode === origin)) {
    return `UNKNOWN CITY/AIRPORT ${origin}`;
  }
  if (!airportsData.some((a) => a.iataCode === destination)) {
    return `UNKNOWN CITY/AIRPORT ${destination}`;
  }
  if (origin === destination) return 'INVALID CITY PAIR';

  const quote = getFareQuote(origin, destination);
  if (!quote) {
    return `NO FARES FOUND FOR CITY PAIR ${origin}${destination}`;
  }

  const lines = [];
  lines.push(`** FARE DISPLAY - FQD **  ${origin}-${destination}  (${quote.currency})`);
  lines.push('');

  quote.fares.forEach((f) => {
    const total = f.baseFare + quote.totalTaxes;
    lines.push(
      `${f.bookingClass}  ${f.fareBasis.padEnd(6, ' ')}  FARE ${String(f.baseFare).padStart(6, ' ')}  ` +
        `TAX ${String(quote.totalTaxes).padStart(5, ' ')}  TTL ${String(total).padStart(6, ' ')}  BAG ${f.baggageAllowance}`
    );
  });

  lines.push('');
  quote.taxes.forEach((t) => {
    lines.push(`${t.code}  ${t.amount}  ${t.descriptionAr}`);
  });

  return lines.join('\n');
}

/* ---------------- FXP ---------------- */
// === تعديل المرحلة 13: بدل تسعير segments[0] بس، بيلف على كل
// الـSegments (ذهاب وعودة لو موجودين) ويجمعهم، وبيضرب الإجمالي في
// عدد الركاب — عشان السعر المعروض يبقى السعر الحقيقي للحجز كله. ===
function handleFXP(cmd) {
  if (cmd !== 'FXP') return 'FORMAT';

  const currentPnr = getCurrentPNR();
  if (currentPnr.segments.length === 0) {
    return 'NO ITINERARY SEGMENTS';
  }

  const paxCount = Math.max(currentPnr.passengers.length, 1);
  const lines = [];
  lines.push(`** ITINERARY PRICING - FXP **  (${paxCount} PAX)`);
  lines.push('');

  let perPaxTotal = 0;
  let currency = null;

  for (const seg of currentPnr.segments) {
    const fareInfo = getFareForBookingClass(seg.origin, seg.destination, seg.bookingClass);
    if (!fareInfo) {
      return `NO FARES FOUND FOR CITY PAIR ${seg.origin}${seg.destination}`;
    }
    currency = fareInfo.currency;
    lines.push(`${seg.airlineCode} ${seg.flightNumber}  ${seg.origin}-${seg.destination}  CLASS ${seg.bookingClass}  FARE BASIS ${fareInfo.fareBasis}`);
    lines.push(`FARE   ${fareInfo.baseFare}`);
    fareInfo.taxes.forEach((t) => {
      lines.push(`TAX    ${t.amount}  ${t.code}  ${t.descriptionAr}`);
    });
    lines.push(`SUBTOTAL (PER PAX)  ${fareInfo.total}  ${fareInfo.currency}`);
    lines.push(`BAGGAGE ALLOWANCE  ${fareInfo.baggageAllowance}`);
    lines.push('');
    perPaxTotal += fareInfo.total;
  }

  lines.push(`TOTAL PER PASSENGER   ${perPaxTotal}  ${currency}`);
  lines.push(`GRAND TOTAL (x${paxCount} PAX)   ${perPaxTotal * paxCount}  ${currency}`);

  return lines.join('\n');
}

/* ---------------- TTP (دفعة 3 — سد فجوة متوسطة، إصدار تذكرة فعلي) ---------------- */
function handleTTP(cmd) {
  if (cmd !== 'TTP') return 'FORMAT';
  const result = issueTicket();
  return result.message;
}

/* ---------------- FXB (دفعة 3 — سد فجوة منخفضة، تسعير بديل/أرخص) ---------------- */
// === تعديل المرحلة 13: نفس فكرة FXP — بيلف على كل الـSegments
// ويجمع أرخص سعر لكل واحد، وبيضرب الإجمالي في عدد الركاب. ===
function handleFXB(cmd) {
  if (cmd !== 'FXB') return 'FORMAT';

  const currentPnr = getCurrentPNR();
  if (currentPnr.segments.length === 0) {
    return 'NO ITINERARY SEGMENTS';
  }

  const paxCount = Math.max(currentPnr.passengers.length, 1);
  const lines = [];
  lines.push(`** BEST BUY PRICING - FXB **  (${paxCount} PAX)`);
  lines.push('');

  let perPaxTotal = 0;
  let currency = null;

  for (const seg of currentPnr.segments) {
    const quote = getFareQuote(seg.origin, seg.destination);
    if (!quote) {
      return `NO FARES FOUND FOR CITY PAIR ${seg.origin}${seg.destination}`;
    }
    currency = quote.currency;
    const cheapest = quote.fares[0];
    const total = cheapest.baseFare + quote.totalTaxes;

    lines.push(`${seg.origin}-${seg.destination}   BOOKED: ${seg.bookingClass}   CHEAPEST: ${cheapest.bookingClass}`);
    lines.push(`FARE BASIS ${cheapest.fareBasis}   FARE ${cheapest.baseFare}   TAX ${quote.totalTaxes}   SUBTOTAL ${total} ${quote.currency}`);
    if (cheapest.bookingClass !== seg.bookingClass) {
      lines.push('NOTE: CHEAPEST CLASS DIFFERS FROM BOOKED CLASS - REBOOKING REQUIRED TO APPLY');
    }
    lines.push('');
    perPaxTotal += total;
  }

  lines.push(`TOTAL PER PASSENGER   ${perPaxTotal}  ${currency}`);
  lines.push(`GRAND TOTAL (x${paxCount} PAX)   ${perPaxTotal * paxCount}  ${currency}`);

  return lines.join('\n');
}

/* ---------------- DAC (دفعة 4 — فك تشفير مدينة/مطار) ---------------- */
const DAC_REGEX = /^DAC([A-Z]{3})$/;

function handleDAC(cmd) {
  const match = cmd.match(DAC_REGEX);
  if (!match) return 'FORMAT';

  const [, code] = match;
  const airport = airportsData.find((a) => a.iataCode === code);
  if (!airport) return `UNKNOWN CITY/AIRPORT ${code}`;

  const nameCandidate =
    airport.name || airport.cityNameAr || airport.cityName || airport.city || airport.nameEn || null;

  if (!nameCandidate) {
    return `DECODE DATA NOT AVAILABLE FOR ${code} - ADD A NAME FIELD TO airports.json`;
  }

  const countryCandidate = airport.country || airport.countryAr || '';
  const lines = [];
  lines.push(`** DECODE - DAC **  ${code}`);
  lines.push(`${code}  ${nameCandidate}${countryCandidate ? `  ${countryCandidate}` : ''}`);
  return lines.join('\n');
}

/* ---------------- DNA (دفعة 4 — فك تشفير شركة طيران) ---------------- */
const DNA_REGEX = /^DNA([A-Z]{2})$/;

function handleDNA(cmd) {
  const match = cmd.match(DNA_REGEX);
  if (!match) return 'FORMAT';

  const [, code] = match;
  const airline = airlinesData.find((a) => a.code === code || a.iataCode === code);
  if (!airline) return `UNKNOWN AIRLINE ${code}`;

  const nameCandidate = airline.name || airline.airlineName || airline.nameEn || null;
  if (!nameCandidate) {
    return `DECODE DATA NOT AVAILABLE FOR ${code} - ADD A NAME FIELD TO airlines.json`;
  }

  return `** DECODE - DNA **  ${code}  ${nameCandidate}`;
}

/* ---------------- FQN/FQR (دفعة 5 — قواعد وقيود التسعير) ---------------- */
function handleFQN(cmd) {
  if (cmd !== 'FQN' && cmd !== 'FQR') return 'FORMAT';

  const currentPnr = getCurrentPNR();
  if (currentPnr.segments.length === 0) {
    return 'NO ITINERARY SEGMENTS';
  }

  const seg = currentPnr.segments[0];
  const rules = getFareRules(seg.origin, seg.destination, seg.bookingClass);

  if (!rules) {
    return `NO FARES FOUND FOR CITY PAIR ${seg.origin}${seg.destination}`;
  }

  if (!rules.available) {
    return 'NO FARE RULES DATA AVAILABLE FOR THIS FARE';
  }

  const lines = [];
  lines.push(`** FARE RULES - FQN **  ${seg.origin}-${seg.destination}  FARE BASIS ${rules.fareBasis}`);
  lines.push('');
  Object.entries(rules.rules).forEach(([key, value]) => {
    lines.push(`${key.toUpperCase()}: ${value}`);
  });

  return lines.join('\n');
}

/* ================== المرحلة 7 — الخدمات الإضافية ================== */

const HA_REGEX = /^HA([A-Z]{3})(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/;

function handleHA(cmd) {
  const match = cmd.match(HA_REGEX);
  if (!match) return 'FORMAT';

  const [, cityCode, dayStr, month] = match;
  const day = parseInt(dayStr, 10);
  if (day < 1 || day > 31) return 'FORMAT';

  if (!airportsData.some((a) => a.iataCode === cityCode)) {
    return `UNKNOWN CITY/AIRPORT ${cityCode}`;
  }

  const checkInDate = dayStr + month;
  const hotels = findHotelsByCity(cityCode);

  if (hotels.length === 0) return 'NO HOTELS FOUND FOR CITY';

  lastHotelAvailabilityDisplay = { cityCode, checkInDate, hotels };

  const lines = [];
  lines.push(`** HOTEL AVAILABILITY - HA **  ${cityCode}  ${checkInDate}`);
  lines.push('');

  hotels.forEach((h, idx) => {
    const lineNum = String(idx + 1).padStart(2, ' ');
    const stars = '*'.repeat(h.category);
    lines.push(
      `${lineNum}  ${h.chainCode}  ${h.hotelName.padEnd(38, ' ')}  ${stars.padEnd(5, ' ')}  ` +
        `${h.roomType}  ${String(h.nightlyRate).padStart(5, ' ')} ${h.currency}/NGT`
    );
  });

  return lines.join('\n');
}

const HS_REGEX = /^HS(\d{1,2})N(\d{1,2})$/;

function handleHS(cmd) {
  const match = cmd.match(HS_REGEX);
  if (!match) return 'FORMAT';

  const [, lineNumStr, nightsStr] = match;

  if (!lastHotelAvailabilityDisplay) return 'NEED HOTEL AVAILABILITY DISPLAY FIRST';

  const lineNum = parseInt(lineNumStr, 10);
  const hotelsShown = lastHotelAvailabilityDisplay.hotels;
  if (lineNum < 1 || lineNum > hotelsShown.length) return 'INVALID LINE NUMBER';

  const nights = parseInt(nightsStr, 10);
  if (nights < 1 || nights > 30) return 'FORMAT';

  const hotel = hotelsShown[lineNum - 1];
  const { checkInDate } = lastHotelAvailabilityDisplay;
  const checkOutDate = addNightsToDate(checkInDate, nights);

  const bookedHotel = {
    hotelId: hotel.hotelId,
    chainCode: hotel.chainCode,
    hotelName: hotel.hotelName,
    roomType: hotel.roomType,
    nightlyRate: hotel.nightlyRate,
    nights,
    total: hotel.nightlyRate * nights,
    currency: hotel.currency,
    checkInDate,
    checkOutDate
  };

  const result = addHotelSegment(bookedHotel);
  return result.message;
}

const CA_REGEX = /^CA([A-Z]{3})(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/;

function handleCA(cmd) {
  const match = cmd.match(CA_REGEX);
  if (!match) return 'FORMAT';

  const [, cityCode, dayStr, month] = match;
  const day = parseInt(dayStr, 10);
  if (day < 1 || day > 31) return 'FORMAT';

  if (!airportsData.some((a) => a.iataCode === cityCode)) {
    return `UNKNOWN CITY/AIRPORT ${cityCode}`;
  }

  const pickupDate = dayStr + month;
  const cars = findCarsByCity(cityCode);

  if (cars.length === 0) return 'NO VEHICLES FOUND FOR CITY';

  lastCarAvailabilityDisplay = { cityCode, pickupDate, cars };

  const lines = [];
  lines.push(`** CAR AVAILABILITY - CA **  ${cityCode}  ${pickupDate}`);
  lines.push('');

  cars.forEach((c, idx) => {
    const lineNum = String(idx + 1).padStart(2, ' ');
    lines.push(
      `${lineNum}  ${c.companyCode}  ${c.companyName.padEnd(12, ' ')}  ${c.carType}  ` +
        `${String(c.dailyRate).padStart(5, ' ')} ${c.currency}/DAY`
    );
  });

  return lines.join('\n');
}

const CS_REGEX = /^CS(\d{1,2})D(\d{1,2})$/;

function handleCS(cmd) {
  const match = cmd.match(CS_REGEX);
  if (!match) return 'FORMAT';

  const [, lineNumStr, daysStr] = match;

  if (!lastCarAvailabilityDisplay) return 'NEED CAR AVAILABILITY DISPLAY FIRST';

  const lineNum = parseInt(lineNumStr, 10);
  const carsShown = lastCarAvailabilityDisplay.cars;
  if (lineNum < 1 || lineNum > carsShown.length) return 'INVALID LINE NUMBER';

  const days = parseInt(daysStr, 10);
  if (days < 1 || days > 30) return 'FORMAT';

  const car = carsShown[lineNum - 1];
  const { pickupDate } = lastCarAvailabilityDisplay;
  const dropoffDate = addNightsToDate(pickupDate, days);

  const bookedCar = {
    carId: car.carId,
    companyCode: car.companyCode,
    companyName: car.companyName,
    carType: car.carType,
    dailyRate: car.dailyRate,
    days,
    total: car.dailyRate * days,
    currency: car.currency,
    pickupDate,
    dropoffDate
  };

  const result = addCarSegment(bookedCar);
  return result.message;
}

const SR_REGEX = /^SR([A-Z]{4})$/;

function handleSR(cmd) {
  const match = cmd.match(SR_REGEX);
  if (!match) return 'FORMAT';

  const [, code] = match;

  const ssrInfo = getSSRInfo(code);
  if (!ssrInfo) return 'INVALID SSR CODE';

  if (getCurrentPNR().passengers.length === 0) {
    return 'PNR EMPTY - NEED NAME';
  }

  const result = addSSR(code);
  return result.message;
}

const TI_REGEX = /^TI([A-Z]{3})$/;

function handleTI(cmd) {
  const match = cmd.match(TI_REGEX);
  if (!match) return 'FORMAT';

  const [, destination] = match;

  if (!airportsData.some((a) => a.iataCode === destination)) {
    return `UNKNOWN CITY/AIRPORT ${destination}`;
  }

  const info = getTimaticInfo(destination);
  if (!info) return 'NO TIMATIC DATA FOR DESTINATION';

  const lines = [];
  lines.push(`** TIMATIC - TI **  ${destination}  (جواز سفر مصري)`);
  lines.push('');
  lines.push(`VISA:   ${info.visaAr}`);
  lines.push(`STAY:   ${info.maxStayAr}`);
  lines.push(`HEALTH: ${info.healthNoteAr}`);

  return lines.join('\n');
}

/* ================== المرحلة 8 — إدارة الطوابير ================== */

function handleQT(cmd) {
  if (cmd !== 'QT') return 'FORMAT';
  return getQueueTableDisplay();
}

const QC_REGEX = /^QC(\d{1,2})(?:C(\d{1,2}))?$/;

function handleQC(cmd) {
  const match = cmd.match(QC_REGEX);
  if (!match) return 'FORMAT';

  const [, queueNumStr, categoryStr] = match;
  const queueNumber = parseInt(queueNumStr, 10);
  const category = categoryStr !== undefined ? parseInt(categoryStr, 10) : null;

  return getQueueCountDisplay(queueNumber, category);
}

const QS_REGEX = /^QS(\d{1,2})C(\d{1,2})$/;

function handleQS(cmd) {
  const match = cmd.match(QS_REGEX);
  if (!match) return 'FORMAT';

  const [, queueNumStr, categoryStr] = match;
  const queueNumber = parseInt(queueNumStr, 10);
  const category = parseInt(categoryStr, 10);

  return startQueueBrowse(queueNumber, category);
}

function handleQN(cmd) {
  if (cmd !== 'QN') return 'FORMAT';
  return 'NOT IN QUEUE MODE';
}

function handleQI(cmd) {
  if (cmd !== 'QI') return 'FORMAT';
  return 'NOT IN QUEUE MODE';
}

const QD_REGEX = /^QD(\d{1,2})\/([A-Z]{6})$/;

function handleQD(cmd) {
  const match = cmd.match(QD_REGEX);
  if (!match) return 'FORMAT';

  const [, queueNumStr, recordLocator] = match;
  const queueNumber = parseInt(queueNumStr, 10);

  return deletePnrFromQueue(queueNumber, recordLocator);
}

function handleSM(cmd) {
  if (cmd !== 'SM') return 'FORMAT';

  const currentPnr = getCurrentPNR();
  if (currentPnr.segments.length === 0) return 'NO ITINERARY SEGMENTS';

  const seg = currentPnr.segments[0];
  const map = getSeatMapDisplay(seg.aircraftType);
  if (!map) return 'NO SEATMAP DATA FOR THIS AIRCRAFT TYPE';

  const lines = [];
  lines.push(`** SEATMAP - SM **  ${seg.airlineCode} ${seg.flightNumber}  ${map.aircraftType}`);
  lines.push('');
  map.rows.forEach((row) => {
    const seatsText = Object.entries(row.seats)
      .map(([letter, status]) => `${letter}${status === 'OCCUPIED' ? 'X' : '_'}`)
      .join(' ');
    lines.push(`ROW ${String(row.row).padStart(2, ' ')} (${row.class})  ${seatsText}`);
  });
  lines.push('');
  lines.push('LEGEND: _ = AVAILABLE, X = OCCUPIED');

  return lines.join('\n');
}

const ST_REGEX = /^ST(\d{1,2})([A-Z])$/;

function handleST(cmd) {
  const match = cmd.match(ST_REGEX);
  if (!match) return 'FORMAT';

  const [, rowStr, seatLetter] = match;
  const rowNumber = parseInt(rowStr, 10);

  const currentPnr = getCurrentPNR();
  if (currentPnr.segments.length === 0) return 'NO ITINERARY SEGMENTS';

  const seg = currentPnr.segments[0];
  const seatResult = selectSeat(seg.aircraftType, rowNumber, seatLetter);
  if (!seatResult.success) return seatResult.message;

  const result = setSelectedSeat(seatResult.seatLabel);
  return result.message;
}

const QE_REGEX = /^QE(\d{1,2})$/;

function handleQE(cmd) {
  const match = cmd.match(QE_REGEX);
  if (!match) return 'FORMAT';

  const [, queueNumStr] = match;
  const queueNumber = parseInt(queueNumStr, 10);

  if (!lastCompletedPnr) {
    const currentPnr = getCurrentPNR();
    if (currentPnr.segments.length === 0) return 'NO ITINERARY SEGMENTS';
    if (currentPnr.passengers.length === 0) return 'PNR EMPTY - NEED NAME';
    if (currentPnr.contact === null) return 'NEED CONTACT ELEMENT AP';
    if (currentPnr.ticketingArrangement === null) return 'NEED TICKETING ARRANGEMENT TK';
    if (currentPnr.receivedFrom === null) return 'NEED RECEIVED FROM RF';
    return 'PNR NOT ENDED YET - USE ER FIRST';
  }

  addPnrToQueue(queueNumber, lastCompletedPnr);
  return `QUEUED TO Q${queueNumber}`;
}

