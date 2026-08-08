/*
  errors.js — محرك تصحيح الأخطاء الذكي (المرحلة 5)

  ⚠ فروقات مهمة عن سبك المرحلة 5 الأصلي، لازم Malik ياخد باله منها
  (موثّقة هنا زي ما parser.js وpnr.js عملوا مع فروقاتهم عن السبك بتاعهم):

  1) data/errors.json الفعلي شكله مختلف عن الشكل الافتراضي في السبك
     (مفيش id/trigger/correct_command/wrong_example — بس errorMessage/
     category/causeAr/correctionAr). اتعامل معاه بالإضافة فقط:
     ضفت categoryCode + matchKeys لكل entry، من غير حذف أو تعديل أي
     قيمة موجودة أصلًا.

  2) "خطأ توفر" (Availability) في البيانات الفعلية مش من ضمن الـ 5
     فئات الرسمية في السبك. اعتبرته فئة سادسة حقيقية (AVAILABILITY)
     بدل ما أحشرها غلط جوه DATA_REFERENCE — غلطة "سولد آوت" مختلفة
     جوهريًا عن غلطة "كود مطار غلط"، وتصنيفها غلط هيربك المتدرب مش
     يعلّمه. نفس المنطق على LOGICAL وGENERAL (تاريخ فات، أكتر من 9
     ركاب، أمر مش معروف خالص). لو عايز الالتزام الحرفي بالـ 5 بس،
     سهل نرجّعها.

  3) الأهم: مثال AN15JULCAIDXB في قسم 4 من السبك مبني على افتراض إن
     الأمر محتاج مسافة بين التاريخ وأكواد المدن. ده مش صحيح في
     parser.js الفعلي — الـ AN_REGEX بتاعه مصمم يستقبل الأمر من غير
     أي مسافة خالص (يوم+شهر+مطار+مطار لصيق). يعني AN15JULCAIDXB أمر
     **صحيح 100%** في النظام الحالي مش غلط. عشان كده مفيش دالة
     "تصحيح تلقائي بتحط مسافة" هنا — كانت هتعلّم حاجة عكس الصح تمامًا.
     بدالها: بنعرض إرشاد نصي (correctionAr) بس، مبني على الرسالة
     الحقيقية اللي parser.js رجعها فعلًا، من غير أي أمر "مصحح" ملفّق.

  4) حالات اختبار قسم 7 من السبك افترضت أخطاء مش موجودة فعليًا:
       - "SS بكود مطار مش موجود": SS مالوش كود مطار خالص في صياغته.
         الخطأ ده بيحصل في AN مش SS.
       - "TK قبل SS": addTicketingArrangement() بينفّذ من غير أي
         تحقق من ترتيب سابق — الخطأ ده مش موجود في الكود، وإضافته
         هتتطلب تعديل pnr.js الممنوع نلمسه في المرحلة دي.
     الخطأ الحقيقي الوحيد من نوع SEQUENCE الموجود بالكود فعلًا هو
     محاولة SS قبل عمل AN ("NEED AVAILABILITY DISPLAY FIRST").

  القيود اللي اتوقفت عندها بالظبط زي ما اتقال:
  - متلمستش parser.js ولا pnr.js أبدًا.
  - متلمستش LEVELTEST خالص (main.js بيستبعد مسارها بالكامل من نداء
    handleErrorFlow — راجع تعليق التكامل في main.js).
  - مفيش localStorage — mistakeLog مصفوفة في الذاكرة بس (session-only)،
    بترجع فاضية لو الصفحة اتعمل لها Refresh، زي ما قسم 2 مطلوب بالظبط.
*/

let catalog = [];
let mistakeLog = []; // session-only فقط

// رسايل داخلية بتوصف حدود المرحلة الحالية (مش أخطاء نظام حقيقية) —
// بتتطبع زي ما هي من غير ما تدخل في محرك التصنيف خالص، لأنها مش
// حاجة المتدرب هيشوفها في النظام الحقيقي.
const EXCLUDED_MESSAGES = new Set([
  'MULTIPLE SEGMENTS NOT SUPPORTED YET (PHASE 2 LIMIT)',
  'MULTIPLE PASSENGERS NOT SUPPORTED YET (PHASE 2 LIMIT)'
]);

// تسميات الفئات بالعربي للعرض. الفئات الثلاثة الأخيرة إضافة عن
// الـ 5 الرسمية في السبك — راجع ملحوظة (2) فوق.
const CATEGORY_LABELS_AR = {
  FORMAT: 'صياغة',
  DATA_REFERENCE: 'بيانات مرجعية',
  SEQUENCE: 'ترتيب/تسلسل',
  MANDATORY_MISSING: 'نقص عنصر إلزامي',
  DUPLICATE_CONFLICT: 'تكرار/تعارض',
  AVAILABILITY: 'توفر',
  LOGICAL: 'منطقي',
  GENERAL: 'عام'
};

export function initErrors(errorsData) {
  catalog = Array.isArray(errorsData) ? errorsData : [];
}

// دعم مطابقة بادئة (prefix) للرسايل الديناميكية زي
// "UNKNOWN CITY/AIRPORT CAI" عن طريق تخزين المفتاح كـ
// "UNKNOWN CITY/AIRPORT *" في matchKeys.
function keyMatches(key, rawResponseCode) {
  if (key.endsWith('*')) {
    return rawResponseCode.startsWith(key.slice(0, -1));
  }
  return rawResponseCode === key;
}

export function getErrorEntry(rawResponseCode) {
  for (const entry of catalog) {
    const keys = entry.matchKeys && entry.matchKeys.length ? entry.matchKeys : [entry.errorMessage];
    if (keys.some((k) => keyMatches(k, rawResponseCode))) {
      return entry;
    }
  }
  return null;
}

export function classifyError(rawResponseCode) {
  const entry = getErrorEntry(rawResponseCode);
  return entry ? (entry.categoryCode || 'GENERAL') : null;
}

function isExcluded(rawResponseCode) {
  return EXCLUDED_MESSAGES.has(rawResponseCode);
}

// الخطوات 2-4 (الخطوة 1 بتتطبع زي ما هي بره الملف ده، في main.js،
// من غير أي تدخل — راجع ملحوظة القيود فوق وقسم 2 من السبك).
export function renderErrorFlow(errorEntry, userCommand) {
  const catCode = errorEntry.categoryCode || 'GENERAL';
  const catLabelAr = CATEGORY_LABELS_AR[catCode] || 'عام';
  const lines = [];

  // الخطوة 2 — تصنيف وتشخيص
  lines.push(`⚠ نوع الخطأ: ${catLabelAr}${errorEntry.category ? ` (${errorEntry.category})` : ''}`);
  lines.push(`السبب: ${errorEntry.causeAr}`);
  lines.push('');

  // الخطوة 3 — تصحيح موجّه (إرشاد نصي، مش أمر "مصحح" ملفّق — ملحوظة 3 فوق)
  lines.push(`غلط:  ${userCommand}`);
  lines.push(`الإرشاد: ${errorEntry.correctionAr}`);
  lines.push('');

  // الخطوة 4 — تعزيز النمط المتكرر (لو موجود)
  if (checkRecurringPattern(catCode)) {
    lines.push('🔁 ملاحظة: ده مش أول مرة النهارده تتكرر فيها نفس نوع الغلطة دي — يستاهل تركيز أكتر عليها.');
  }

  lines.push('جرب اكتب الأمر الصح دلوقتي 👇');

  return lines;
}

export function logMistake(category) {
  if (category) mistakeLog.push(category);
}

export function checkRecurringPattern(category) {
  if (!category) return false;
  const count = mistakeLog.filter((c) => c === category).length;
  return count >= 2; // يعني الاستدعاء الحالي هو التالت (أو أكتر) في نفس الجلسة
}

// نقطة الاستدعاء الوحيدة من main.js. بتلف classifyError/getErrorEntry/
// renderErrorFlow/logMistake كلهم في نداء واحد بسيط، وبترجع null لو
// الرد مش خطأ معروف (يبقى main.js يسيبه يتطبع عادي زي ما هو، من غير
// أي تدخل — بيحافظ على حالة الاختبار 7: الأوامر الصحيحة تفضل تشتغل
// عادي).
export function handleErrorFlow(rawResponse, userCommand) {
  if (!rawResponse || isExcluded(rawResponse)) return null;

  const entry = getErrorEntry(rawResponse);
  if (!entry) return null;

  const lines = renderErrorFlow(entry, userCommand);
  logMistake(classifyError(rawResponse));

  return lines;
}
