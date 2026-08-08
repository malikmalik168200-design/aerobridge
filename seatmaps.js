/*
  seatmaps.js — خرائط المقاعد واختيار مقعد (المرحلة 11 — دفعة 6، سد
  فجوة ❌ SM/ST). نفس فلسفة الفصل المستخدمة في pricing.js/ancillary.js
  بالظبط: parser.js بيتحقق من الصياغة ويستدعي، والدوال هنا بترجع
  بيانات/نتيجة جاهزة.

  ⚠ ملحوظة مهمة: data/seatmaps.json ملف جديد كامل اتعمل في المرحلة
  دي (مفيش بيانات مقاعد في المشروع قبل كده خالص) — شكل مبسّط لأقرب
  نوعين طائرة موجودين فعليًا في flights.json الحالي (738, 320)، صف
  درجة أعمال وصف اقتصادية واحد بس لكل نوع كمثال توضيحي. Malik لو حابب
  تغطية أشمل لكل صفوف الطائرة الحقيقية، ده امتداد بيانات بسيط على
  نفس الشكل (إضافة صفوف في seatmaps.json)، مش تغيير في المنطق.
*/

let seatmapsData = [];

export function initSeatmaps(data) {
  seatmapsData = Array.isArray(data) ? data : [];
}

function findSeatmap(aircraftType) {
  return seatmapsData.find((s) => s.aircraftType === aircraftType) || null;
}

export function getSeatMapDisplay(aircraftType) {
  const map = findSeatmap(aircraftType);
  if (!map) return null;
  return map;
}

// بتدور على صف معين ومقعد معين وتتأكد إنه فاضي قبل ما تحجزه.
// بترجع { success, message } زي أي دالة تانية في pnr.js.
export function selectSeat(aircraftType, rowNumber, seatLetter) {
  const map = findSeatmap(aircraftType);
  if (!map) return { success: false, message: 'NO SEATMAP DATA FOR THIS AIRCRAFT TYPE' };

  const row = map.rows.find((r) => r.row === rowNumber);
  if (!row) return { success: false, message: 'SEAT ROW NOT FOUND' };

  const status = row.seats[seatLetter];
  if (status === undefined) return { success: false, message: 'SEAT LETTER NOT FOUND' };
  if (status === 'OCCUPIED') return { success: false, message: 'SEAT ALREADY OCCUPIED' };

  row.seats[seatLetter] = 'OCCUPIED';
  return { success: true, message: `SEAT ${rowNumber}${seatLetter} CONFIRMED`, seatLabel: `${rowNumber}${seatLetter}` };
}
