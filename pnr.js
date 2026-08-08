/*
  === إضافة المرحلة 13 (أكتر من راكب + رحلة ذهاب وعودة) ===
  name (كائن واحد) بقى passengers (array). segments فضل array زي ما هو
  بس الحد الأقصى بقى 2 بدل 1 (ذهاب + عودة). expectedPaxCount بيتسجل
  أول ما أول Segment يتباع، وبيستخدم كحد أقصى لعدد أسماء NM المسموحة.
  ticketNumber (نص واحد) بقى ticketNumbers (array — تذكرة لكل راكب).
*/
const MAX_PASSENGERS = 9;
const MAX_SEGMENTS = 2;

function emptyPNR() {
  return {
    passengers: [],        // === المرحلة 13: كان name (كائن واحد) ===
    expectedPaxCount: 0,   // === المرحلة 13: بيتحدد من عدد مقاعد أول Segment ===
    segments: [],
    contact: null,
    ticketingArrangement: null,
    receivedFrom: null,
    recordLocator: null,
    hotels: [],
    cars: [],
    ssrs: [],
    mobileContact: null,   // APM
    emailContact: null,    // APE
    remarks: [],           // RM (نص حر)
    osi: [],               // OS (نص حر، Other Service Information)
    ticketNumbers: [],    // === المرحلة 13: كان ticketNumber (نص واحد) ===
    selectedSeat: null    // === إضافة المرحلة 11 (دفعة 6) — ST — لسه مقعد واحد بس للـPNR كله، تفصيل لكل راكب مؤجل للمرحلة 14 ===
  };
}

let pnr = emptyPNR();

const pnrStore = new Map();

// === إضافة المرحلة 13: بدل القفل على Segment واحد، بقى مسموح لحد 2
// (ذهاب وعودة). الشرط الجديد: الـSegment التاني لازم يكون بنفس عدد
// المقاعد بتاع الأول (نفس عدد الركاب اللي هيتسموا بعدين بـNM)، عشان
// الحجز يفضل متسق. أول ما أول Segment يتباع، expectedPaxCount بيتسجل
// من seats بتاعه — ده اللي addName() هيستخدمه كحد أقصى بعد كده. ===
export function sellSegment(lineNumber, flight, bookingClass, seats, status = 'HK') {
  if (pnr.segments.length >= MAX_SEGMENTS) {
    return {
      success: false,
      message: 'MAXIMUM 2 SEGMENTS SUPPORTED (ROUND-TRIP ONLY)'
    };
  }

  if (pnr.segments.length === 1 && seats !== pnr.segments[0].seats) {
    return {
      success: false,
      message: 'SEAT COUNT MUST MATCH FIRST SEGMENT'
    };
  }

  const segment = {
    flightId: flight.flightId,
    airlineCode: flight.airlineCode,
    flightNumber: flight.flightNumber,
    bookingClass,
    origin: flight.origin,
    destination: flight.destination,
    departureDate: flight.departureDate,
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
    aircraftType: flight.aircraftType,
    seats,
    status
  };

  pnr.segments.push(segment);

  // === إضافة المرحلة 13: أول Segment بس هو اللي بيحدد عدد الركاب
  // المتوقع؛ الـSegment التاني (لو اتباع) لازم يطابقه (اتشيّك فوق) ===
  if (pnr.segments.length === 1) {
    pnr.expectedPaxCount = seats;
  }

  const message =
    `${lineNumber}  ${flight.airlineCode} ${flight.flightNumber} ${bookingClass}  ` +
    `${flight.departureDate}  ${flight.origin} ${flight.destination}  ${status}${seats}  ` +
    `${flight.departureTime} ${flight.arrivalTime}`;

  return { success: true, message };
}

// === إضافة المرحلة 13: بدل راكب واحد بس، array لحد 9 ركاب (ADT بس
// في المرحلة دي — CHD/INF مؤجلة للمرحلة 14). الحد الفعلي هو
// expectedPaxCount (عدد المقاعد المباعة) لو اتحدد بالفعل؛ لو لسه
// مفيش Segment اتباع، بيسمح لحد MAX_PASSENGERS كسقف مؤقت. ===
export function addName(lastName, firstName, title) {
  const cap = pnr.expectedPaxCount > 0 ? pnr.expectedPaxCount : MAX_PASSENGERS;

  if (pnr.passengers.length >= cap) {
    return {
      success: false,
      message: pnr.expectedPaxCount > 0 ? 'ALL PASSENGERS ALREADY NAMED' : 'MAXIMUM 9 PASSENGERS PER PNR'
    };
  }

  const passenger = { lastName, firstName, title: title || '' };
  pnr.passengers.push(passenger);

  const num = pnr.passengers.length;
  const titlePart = passenger.title ? ` ${passenger.title}` : '';
  return { success: true, message: `${num}. ${lastName}/${firstName}${titlePart}` };
}

export function addContact(cityCode, phone) {
  pnr.contact = { cityCode, phone };
  return { success: true, message: `2. AP ${cityCode} ${phone}` };
}

export function addTicketingArrangement() {
  pnr.ticketingArrangement = 'OK';
  return { success: true, message: '3. TK OK' };
}

export function addTicketingTimeLimit(date) {
  pnr.ticketingArrangement = `TL${date}`;
  return { success: true, message: `3. TK TL${date}` };
}

export function addMobileContact(phone) {
  pnr.mobileContact = phone;
  return { success: true, message: `APM ${phone}` };
}

export function addEmailContact(email) {
  pnr.emailContact = email;
  return { success: true, message: `APE ${email}` };
}

export function addRemark(text) {
  pnr.remarks.push(text);
  return { success: true, message: `RM ${text}` };
}

export function addOsi(text) {
  pnr.osi.push(text);
  return { success: true, message: `OSI ${text}` };
}

export function addReceivedFrom(name) {
  pnr.receivedFrom = name;
  return { success: true, message: `4. RF ${name}` };
}

export function addHotelSegment(hotel) {
  pnr.hotels.push(hotel);

  const message =
    `HTL ${hotel.chainCode} ${hotel.hotelName}  ${hotel.roomType}  ` +
    `${hotel.checkInDate}-${hotel.checkOutDate}  HK1  ` +
    `TTL ${hotel.total} ${hotel.currency}`;

  return { success: true, message };
}

export function addCarSegment(car) {
  pnr.cars.push(car);

  const message =
    `CAR ${car.companyCode} ${car.companyName}  ${car.carType}  ` +
    `${car.pickupDate}-${car.dropoffDate}  HK1  ` +
    `TTL ${car.total} ${car.currency}`;

  return { success: true, message };
}

export function addSSR(code) {
  pnr.ssrs.push({ code, status: 'HK' });
  return { success: true, message: `SSR ${code} HK1` };
}

function generateRecordLocator() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += letters[Math.floor(Math.random() * letters.length)];
  }
  if (pnrStore.has(code)) return generateRecordLocator();
  return code;
}

// === إضافة المرحلة 13: بدل ترقيم ثابت (1=اسم، 2=رحلة...)، الترقيم
// بقى ديناميكي بالكامل بعداد واحد (nextNum) بيزيد مع كل عنصر — نفس
// فلسفة hotelLines/carLines القديمة، بس معمّمة على الركاب والـSegments
// كمان بدل ما تكون أرقامهم ثابتة. ===
function formatPnrLines(pnrData, recordLocator, headerLabel) {
  let nextNum = 1;

  const passengerLines = pnrData.passengers.map((p) => {
    const titlePart = p.title ? ` ${p.title}` : '';
    return `${nextNum++}. ${p.lastName}/${p.firstName}${titlePart}`;
  });

  const segmentLines = pnrData.segments.map(
    (seg) =>
      `${nextNum++}. ${seg.airlineCode} ${seg.flightNumber} ${seg.bookingClass} ${seg.departureDate} ` +
      `${seg.origin}${seg.destination} ${seg.status || 'HK'}${seg.seats} ${seg.departureTime} ${seg.arrivalTime}`
  );

  const apLine = `${nextNum++}. AP ${pnrData.contact.cityCode} ${pnrData.contact.phone}`;
  const tkLine = `${nextNum++}. TK ${pnrData.ticketingArrangement}`;
  const rfLine = `${nextNum++}. RF ${pnrData.receivedFrom}`;

  const hotelLines = pnrData.hotels.map(
    (h) =>
      `${nextNum++}. HTL ${h.chainCode} ${h.hotelName}  ${h.roomType}  ` +
      `${h.checkInDate}-${h.checkOutDate}  HK1  TTL ${h.total} ${h.currency}`
  );
  const carLines = pnrData.cars.map(
    (c) =>
      `${nextNum++}. CAR ${c.companyCode} ${c.companyName}  ${c.carType}  ` +
      `${c.pickupDate}-${c.dropoffDate}  HK1  TTL ${c.total} ${c.currency}`
  );
  const ssrLines = pnrData.ssrs.map((s) => `SSR ${s.code} HK1`);

  const mobileLine = pnrData.mobileContact ? [`APM ${pnrData.mobileContact}`] : [];
  const emailLine = pnrData.emailContact ? [`APE ${pnrData.emailContact}`] : [];
  const remarkLines = pnrData.remarks.map((r) => `RM ${r}`);
  const osiLines = pnrData.osi.map((o) => `OSI ${o}`);
  // === المرحلة 13: ticketNumber (نص واحد) بقى ticketNumbers (array) ===
  const ticketLine = pnrData.ticketNumbers.length ? [`TKT ${pnrData.ticketNumbers.join(', ')}`] : [];
  const seatLine = pnrData.selectedSeat ? [`ST ${pnrData.selectedSeat}`] : [];

  return [
    `----------- ${headerLabel} -----------`,
    `RECORD LOCATOR: ${recordLocator}`,
    ...passengerLines,
    ...segmentLines,
    apLine,
    tkLine,
    rfLine,
    ...hotelLines,
    ...carLines,
    ...ssrLines,
    ...mobileLine,
    ...emailLine,
    ...remarkLines,
    ...osiLines,
    ...ticketLine,
    ...seatLine,
    '-'.repeat(headerLabel.length + 24)
  ].join('\n');
}

// === إضافة المرحلة 13: شيك جديد — عدد الركاب المسمّين لازم يطابق
// عدد المقاعد المباعة (expectedPaxCount) قبل قفل الحجز ===
function validatePnrComplete(pnrData) {
  if (pnrData.segments.length === 0) return 'NO ITINERARY SEGMENTS';
  if (pnrData.passengers.length === 0) return 'PNR EMPTY - NEED NAME';
  if (pnrData.passengers.length < pnrData.expectedPaxCount) return 'PASSENGER COUNT DOES NOT MATCH SEATS SOLD';
  if (pnrData.contact === null) return 'NEED CONTACT ELEMENT AP';
  if (pnrData.ticketingArrangement === null) return 'NEED TICKETING ARRANGEMENT TK';
  if (pnrData.receivedFrom === null) return 'NEED RECEIVED FROM RF';
  return null;
}

export function endAndRetrieve() {
  const validationError = validatePnrComplete(pnr);
  if (validationError) {
    return { success: false, message: validationError };
  }

  const recordLocator = generateRecordLocator();
  const message = formatPnrLines(pnr, recordLocator, 'PNR CREATED');

  pnrStore.set(recordLocator, JSON.parse(JSON.stringify(pnr)));

  resetPNR();

  return { success: true, message, recordLocator };
}

export function endTransact() {
  const validationError = validatePnrComplete(pnr);
  if (validationError) {
    return { success: false, message: validationError };
  }

  const recordLocator = generateRecordLocator();
  pnrStore.set(recordLocator, JSON.parse(JSON.stringify(pnr)));
  resetPNR();

  return {
    success: true,
    message: `END OF TRANSACTION COMPLETE - RECORD LOCATOR: ${recordLocator}`,
    recordLocator
  };
}

export function ignorePnr() {
  const isEmpty =
    pnr.segments.length === 0 &&
    pnr.passengers.length === 0 &&
    pnr.contact === null &&
    pnr.ticketingArrangement === null &&
    pnr.receivedFrom === null;

  if (isEmpty) {
    return { success: false, message: 'NO ACTIVE PNR TO IGNORE' };
  }

  resetPNR();
  return { success: true, message: 'PNR IGNORED - NO DATA SAVED' };
}

export function retrievePnr(recordLocator) {
  const stored = pnrStore.get(recordLocator);
  if (!stored) {
    return { success: false, message: 'RECORD LOCATOR NOT FOUND' };
  }

  pnr = JSON.parse(JSON.stringify(stored));
  pnr.recordLocator = recordLocator;

  const message = formatPnrLines(pnr, recordLocator, 'PNR RETRIEVED');
  return { success: true, message };
}

// === إضافة المرحلة 13: بدل عنصر 'name' وعنصر 'segment' الثابتين
// (واحد لكل واحد)، بقى فيه عنصر لكل راكب وعنصر لكل Segment — بنفس
// فلسفة الترقيم الديناميكي المستخدمة بالفعل للفنادق/السيارات، معمّمة
// دلوقتي على الركاب والـSegments كمان. إلغاء Segment بيعيد حساب
// expectedPaxCount من الـSegment الأول المتبقي (أو صفر لو مفيش). ===
export function cancelElement(lineNumber) {
  const dynamicItems = [];
  pnr.passengers.forEach((_, idx) => dynamicItems.push({ type: 'passenger', index: idx }));
  pnr.segments.forEach((_, idx) => dynamicItems.push({ type: 'segment', index: idx }));
  if (pnr.contact !== null) dynamicItems.push({ type: 'contact' });
  if (pnr.ticketingArrangement !== null) dynamicItems.push({ type: 'ticketing' });
  if (pnr.receivedFrom !== null) dynamicItems.push({ type: 'receivedFrom' });

  const hotelCount = pnr.hotels.length;
  const carCount = pnr.cars.length;

  const totalNumberedLines = dynamicItems.length + hotelCount + carCount;

  const isCompletelyEmpty =
    pnr.passengers.length === 0 &&
    pnr.segments.length === 0 &&
    pnr.contact === null &&
    pnr.ticketingArrangement === null &&
    pnr.receivedFrom === null;

  if (isCompletelyEmpty) {
    return { success: false, message: 'NO ACTIVE PNR' };
  }

  if (lineNumber < 1 || lineNumber > totalNumberedLines) {
    return { success: false, message: 'INVALID ELEMENT NUMBER' };
  }

  if (lineNumber <= dynamicItems.length) {
    const item = dynamicItems[lineNumber - 1];
    switch (item.type) {
      case 'passenger':
        pnr.passengers.splice(item.index, 1);
        break;
      case 'segment':
        pnr.segments.splice(item.index, 1);
        pnr.expectedPaxCount = pnr.segments.length > 0 ? pnr.segments[0].seats : 0;
        break;
      case 'contact':
        pnr.contact = null;
        break;
      case 'ticketing':
        pnr.ticketingArrangement = null;
        break;
      case 'receivedFrom':
        pnr.receivedFrom = null;
        break;
      default:
        break;
    }
    return { success: true, message: `${lineNumber} CANCELLED` };
  }

  const hotelIndex = lineNumber - dynamicItems.length - 1;
  if (hotelIndex < hotelCount) {
    pnr.hotels.splice(hotelIndex, 1);
    return { success: true, message: `${lineNumber} CANCELLED` };
  }

  const carIndex = lineNumber - dynamicItems.length - hotelCount - 1;
  pnr.cars.splice(carIndex, 1);
  return { success: true, message: `${lineNumber} CANCELLED` };
}

// === إضافة المرحلة 13: بدل تذكرة واحدة، تذكرة لكل راكب (زي
// أماديوس الحقيقي — كل راكب له رقم تذكرة إلكتروني منفصل) ===
export function issueTicket() {
  const validationError = validatePnrComplete(pnr);
  if (validationError) {
    return { success: false, message: validationError };
  }

  if (pnr.ticketingArrangement !== 'OK') {
    return { success: false, message: 'CANNOT ISSUE - TICKETING ARRANGEMENT IS TL (DEFERRED)' };
  }

  if (pnr.ticketNumbers.length > 0) {
    return { success: false, message: `TICKETS ALREADY ISSUED: ${pnr.ticketNumbers.join(', ')}` };
  }

  const numbers = pnr.passengers.map(() => {
    let digits = '';
    for (let i = 0; i < 10; i++) {
      digits += Math.floor(Math.random() * 10);
    }
    return `077-${digits}`;
  });
  pnr.ticketNumbers = numbers;

  return { success: true, message: `TICKETS ISSUED: ${numbers.join(', ')}` };
}

export function setSelectedSeat(seatLabel) {
  pnr.selectedSeat = seatLabel;
  return { success: true, message: `ST ${seatLabel} CONFIRMED` };
}

export function resetPNR() {
  pnr = emptyPNR();
  return { success: true, message: '' };
}

export function getCurrentPNR() {
  return pnr;
}
