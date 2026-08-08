/*
  ancillary.js — الخدمات الإضافية (المرحلة 7): بيانات ومنطق الفنادق،
  السيارات، كتالوج SSR، وTimatic المبسّط.

  نفس فلسفة الفصل بين المسؤوليات المستخدمة في pricing.js بالظبط
  (مذكورة في تعليق pricing.js نفسه): parser.js هو المسؤول عن التحقق
  من صياغة الأمر وكود المطارات (بيستخدم airportsData الموجودة عنده
  بالفعل من initParser، من غير ما نعيد تحميلها هنا)، والدوال هنا
  بترجع بيانات جاهزة (كائنات JS) مش نصوص معروضة على الشاشة.

  ⚠ ملحوظتين مهمّتين عن سبك المرحلة 7 (phase7-ancillary-services-prompt.md)
  لازم Malik ياخد باله منهم قبل أي حاجة تانية:

  1) السبك افترض أمرين للسيارات اسمهم VC (توفر) وVS (بيع)، وقال صراحة
     في قسم 0 إنه مش متأكد 100% من الحروف دي وطلب تصحيحها لو فيه مصدر
     أوثق. أنا دورت في مصادر Amadeus الرسمية (Service Hub) قبل ما
     أوصل للسبك، ولقيت الكود الحقيقي لتوفير السيارات هو CA مش VC،
     ولبيع السيارة هو CS مش VS (نفس الحروف اللي Malik نفسه دوّر عليها
     في الشات وأكدها بشكل منفصل تمامًا). عشان كده الكود هنا وفي
     parser.js بيستخدم CA/CS، مش VC/VS. لو حابب تتأكد بنفسك: ابحث عن
     "Amadeus car availability CA cryptic entry" و"Amadeus car sell
     CS entry".
     ملحوظة توضيح إضافية: الكود التاني اللي Malik ذكره في الشات
     "/VC-" (الناقل المعتمد للإصدار / Validating Carrier) حقيقي فعلًا
     بس **مالوش أي علاقة بالسيارات خالص** — ده تشابه حروف بالصدفة بس
     (VC بمعنى Vehicle/Car في تخمين السبك، مقابل VC بمعنى Validating
     Carrier في بحث Malik). /VC- في الواقع مش أمر مستقل، هو خيار
     بينضاف لأوامر تسعير/تذاكر تانية (زي TFU/VC- أو FXG/VC-) ومعناه
     مش له داعي إلا لما يبقى فيه أكتر من ناقل جوي على نفس الرحلة
     (Interline) — وده سيناريو مش موجود في المحاكي لسه لأن pnr.js
     بيدعم Segment واحد بس. تم تأجيله عن قصد لمرحلة لاحقة بعد ما ندعم
     أكتر من Segment/ناقل، بدل ما يتحط في مكان غلط.

  2) صياغة HA/CA في السبك افترضت ترتيب "تاريخ ثم كود مدينة" لصيقين
     (زي HA15JULCAI). الأمثلة الحقيقية اللي لقيتها من Amadeus Service
     Hub وأدلة التدريب (زي HAXXNYC1MAY-2 وHALON02JUL/NR-3 وCAAMS24APR-
     27APR) كلها بترتيب "كود مدينة ثم تاريخ" العكس بالظبط. عشان كده
     الكود هنا اعتمد ترتيب "مدينة ثم تاريخ" (زي HACAI15JUL بدل
     HA15JULCAI) عشان يبقى أقرب للواقع، وده تصحيح موضعي بسيط (نفس
     الفلسفة اللي Malik نفسه قالها في السبك: "استبدال أسماء/ترتيب
     الأوامر سهل وموضعي من غير ما يأثر على باقي المعمارية"). باقي
     تفاصيل السبك (نظام الليالي/الأيام المؤجل لحد أمر البيع HS/CS،
     والتبسيط الخاص بجواز السفر المصري الثابت في TI) اتنفذت زي ما هي
     بالظبط من غير تغيير، لأنها قرارات تبسيط تعليمي مقصودة مش أخطاء
     في كود حقيقي.
*/

let hotelsData = [];
let carsData = [];
let ssrData = [];
let timaticData = [];

export function initAncillary(data) {
  hotelsData = Array.isArray(data.hotels) ? data.hotels : [];
  carsData = Array.isArray(data.cars) ? data.cars : [];
  ssrData = Array.isArray(data.ssr) ? data.ssr : [];
  timaticData = Array.isArray(data.timatic) ? data.timatic : [];
}

export function findHotelsByCity(cityCode) {
  return hotelsData.filter((h) => h.cityCode === cityCode);
}

export function findCarsByCity(cityCode) {
  return carsData.filter((c) => c.cityCode === cityCode);
}

export function getSSRInfo(code) {
  return ssrData.find((s) => s.code === code) || null;
}

export function getTimaticInfo(destinationCode) {
  return timaticData.find((t) => t.destinationCode === destinationCode) || null;
}

// عدد أيام كل شهر (سنة غير كبيسة — كافي لأغراض التدريب الحالية، كل
// بيانات flights.json حاليًا في 15JUL على أي حال). مستخدمة لحساب
// تاريخ المغادرة/التسليم من تاريخ الوصول + عدد الليالي/الأيام
// (المحدد وقت أمر البيع HS/CS، زي ما هو منصوص في السبك).
const DAYS_IN_MONTH = {
  JAN: 31, FEB: 28, MAR: 31, APR: 30, MAY: 31, JUN: 30,
  JUL: 31, AUG: 31, SEP: 30, OCT: 31, NOV: 30, DEC: 31
};
const MONTH_ORDER = Object.keys(DAYS_IN_MONTH);

// بتحسب تاريخ الخروج/التسليم بإضافة عدد ليالي/أيام لتاريخ الدخول
// (صيغة ddMON، زي 15JUL). بترجع null لو الشهر مش معروف.
export function addNightsToDate(dateStr, count) {
  const day = parseInt(dateStr.slice(0, 2), 10);
  const month = dateStr.slice(2);
  let monthIndex = MONTH_ORDER.indexOf(month);
  if (monthIndex === -1 || Number.isNaN(day)) return null;

  let newDay = day + count;
  while (newDay > DAYS_IN_MONTH[MONTH_ORDER[monthIndex]]) {
    newDay -= DAYS_IN_MONTH[MONTH_ORDER[monthIndex]];
    monthIndex = (monthIndex + 1) % 12;
  }

  return String(newDay).padStart(2, '0') + MONTH_ORDER[monthIndex];
  }
