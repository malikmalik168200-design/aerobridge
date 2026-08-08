let queuesData = [];
let browseState = null;

export function initQueues(data) {
  queuesData = Array.isArray(data && data.queues) ? data.queues : [];
}

export function isQueueModeActive() {
  return browseState !== null;
}

function findQueue(queueNumber, category) {
  return queuesData.find(
    (q) => q.queueNumber === queueNumber && q.category === category
  );
}

function formatPnrDisplay(pnr) {
  return [
    '----------- PNR RETRIEVED FROM QUEUE -----------',
    `RECORD LOCATOR: ${pnr.recordLocator}`,
    `1. ${pnr.passengerName}`,
    `2. ${pnr.segmentSummary}`,
    `NOTE: ${pnr.note}`,
    '--------------------------------------------------'
  ].join('\n');
}

export function getQueueTableDisplay() {
  if (queuesData.length === 0) return 'NO ACTIVE QUEUES';

  const lines = [];
  lines.push('** QUEUE COUNT - QT **');
  lines.push('');
  lines.push('Q   CAT  DESCRIPTION                COUNT');

  queuesData.forEach((q) => {
    const qCol = String(q.queueNumber).padEnd(3, ' ');
    const catCol = String(q.category).padEnd(4, ' ');
    const descCol = String(q.nameEn).padEnd(26, ' ');
    lines.push(`${qCol} ${catCol} ${descCol} ${q.pnrs.length}`);
  });

  return lines.join('\n');
}

export function getQueueCountDisplay(queueNumber, category) {
  const matches =
    category === null
      ? queuesData.filter((q) => q.queueNumber === queueNumber)
      : queuesData.filter(
          (q) => q.queueNumber === queueNumber && q.category === category
        );

  if (matches.length === 0) return 'QUEUE NOT FOUND';

  const total = matches.reduce((sum, q) => sum + q.pnrs.length, 0);
  const label = category === null ? `Q${queueNumber}` : `Q${queueNumber} C${category}`;

  return `${label}  ${total} PNR${total === 1 ? '' : 'S'}`;
}

export function startQueueBrowse(queueNumber, category) {
  const queue = findQueue(queueNumber, category);
  if (!queue) return 'QUEUE NOT FOUND';
  if (queue.pnrs.length === 0) return 'QUEUE EMPTY';

  browseState = { queueNumber, category, position: 0 };
  return formatPnrDisplay(queue.pnrs[0]);
}

export function handleQueueModeInput(normalized) {
  if (normalized === 'QN') return advanceQueue();
  if (normalized === 'QI') return ignoreQueue();
  return 'QUEUE MODE ACTIVE - USE QN OR QI';
}

function advanceQueue() {
  const queue = findQueue(browseState.queueNumber, browseState.category);
  if (!queue) {
    browseState = null;
    return 'END OF QUEUE';
  }

  queue.pnrs.splice(browseState.position, 1);

  if (browseState.position >= queue.pnrs.length) {
    browseState = null;
    return 'END OF QUEUE';
  }

  return formatPnrDisplay(queue.pnrs[browseState.position]);
}

function ignoreQueue() {
  browseState = null;
  return 'QUEUE IGNORED';
}

// === إضافة المرحلة 11 (دفعة 3 — سد فجوة ❌ QD): حذف PNR من طابور
// معين بكود الحجز مباشرة، من غير الحاجة نعمل QS ونتصفح لحد ما نوصله
// (بعكس QN اللي بيشتغل بس جوه وضع تصفح نشط). ===
export function deletePnrFromQueue(queueNumber, recordLocator) {
  const queue = queuesData.find((q) => q.queueNumber === queueNumber);
  if (!queue) return 'QUEUE NOT FOUND';

  const index = queue.pnrs.findIndex((p) => p.recordLocator === recordLocator);
  if (index === -1) return 'RECORD LOCATOR NOT FOUND ON THIS QUEUE';

  queue.pnrs.splice(index, 1);
  return `${recordLocator} REMOVED FROM Q${queueNumber}`;
}

export function addPnrToQueue(queueNumber, pnrInfo) {
  let queue = queuesData.find((q) => q.queueNumber === queueNumber);

  if (!queue) {
    queue = {
      queueNumber,
      category: 0,
      nameAr: 'طابور مُنشأ يدويًا',
      nameEn: 'MANUAL QUEUE',
      pnrs: []
    };
    queuesData.push(queue);
  }

  queue.pnrs.push({
    recordLocator: pnrInfo.recordLocator,
    passengerName: pnrInfo.passengerName,
    segmentSummary: 'N/A',
    note: 'PLACED BY AGENT (QE)'
  });
}
