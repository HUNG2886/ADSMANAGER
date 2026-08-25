export type SpendPeriodKey = 'today' | 'yesterday' | 'last7' | 'month';
export type SpendPeriod = { key: SpendPeriodKey; label: string; start: string; end: string };

function dateInTimezone(now: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${value.year}-${value.month}-${value.day}`;
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function metricPeriodBounds(timezone = 'UTC', now = new Date()): SpendPeriod[] {
  const today = dateInTimezone(now, timezone);
  const yesterday = shiftDate(today, -1);
  return [
    { key: 'today', label: 'Hôm nay', start: today, end: today },
    { key: 'yesterday', label: 'Hôm qua', start: yesterday, end: yesterday },
    { key: 'last7', label: '7 ngày gần nhất', start: shiftDate(today, -6), end: today },
    { key: 'month', label: 'Tháng này', start: `${today.slice(0, 7)}-01`, end: today },
  ];
}

export function metricDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
