let faresData = [];

export function initPricing(data) {
  faresData = Array.isArray(data) ? data : [];
}

function findRoute(origin, destination) {
  return faresData.find((r) => r.origin === origin && r.destination === destination) || null;
}

function sumTaxes(taxes) {
  return taxes.reduce((sum, t) => sum + t.amount, 0);
}

export function getFareQuote(origin, destination) {
  const route = findRoute(origin, destination);
  if (!route) return null;

  const sortedFares = [...route.fares].sort((a, b) => a.baseFare - b.baseFare);
  const totalTaxes = sumTaxes(route.taxes);

  return {
    origin: route.origin,
    destination: route.destination,
    currency: route.currency,
    fares: sortedFares,
    taxes: route.taxes,
    totalTaxes
  };
}

// === إضافة المرحلة 11 (دفعة 5 — سد فجوة ❌ FQN/FQR): عرض قواعد
// وقيود السعر (استرداد/تغيير/إلغاء). ⚠ ملحوظة مهمة: fares.json
// الحالي (حسب ما اتراجع في المرحلة 6) مفيهوش حقل "rules" أصلًا —
// الحقول الموجودة بس bookingClass/fareBasis/baseFare/baggageAllowance.
// عشان كده الدالة هنا مصممة تتعامل بأمانة مع الحالتين: لو fare.rules
// موجود (تمت إضافته لاحقًا في fares.json)، بتعرضه؛ لو مش موجود،
// بترجع null صراحة بدل ما تختلق قواعد وهمية.
export function getFareRules(origin, destination, bookingClass) {
  const route = findRoute(origin, destination);
  if (!route) return null;

  const fare = route.fares.find((f) => f.bookingClass === bookingClass);
  if (!fare) return null;

  if (!fare.rules) return { available: false };

  return {
    available: true,
    fareBasis: fare.fareBasis,
    rules: fare.rules
  };
}

export function getFareForBookingClass(origin, destination, bookingClass) {
  const route = findRoute(origin, destination);
  if (!route) return null;

  const fare = route.fares.find((f) => f.bookingClass === bookingClass);
  if (!fare) return null;

  const totalTaxes = sumTaxes(route.taxes);

  return {
    bookingClass: fare.bookingClass,
    fareBasis: fare.fareBasis,
    baseFare: fare.baseFare,
    baggageAllowance: fare.baggageAllowance,
    currency: route.currency,
    taxes: route.taxes,
    totalTaxes,
    total: fare.baseFare + totalTaxes
  };
}
