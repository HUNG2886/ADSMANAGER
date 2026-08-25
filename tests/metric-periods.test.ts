import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from '../lib/concurrency';
import { metricPeriodBounds } from '../lib/metric-periods';

describe('metric periods', () => {
  it('builds today, yesterday, trailing seven days and current month in account timezone', () => {
    const periods = metricPeriodBounds('Asia/Ho_Chi_Minh', new Date('2026-08-25T18:30:00.000Z'));
    expect(periods).toEqual([
      { key: 'today', label: 'Hôm nay', start: '2026-08-26', end: '2026-08-26' },
      { key: 'yesterday', label: 'Hôm qua', start: '2026-08-25', end: '2026-08-25' },
      { key: 'last7', label: '7 ngày gần nhất', start: '2026-08-20', end: '2026-08-26' },
      { key: 'month', label: 'Tháng này', start: '2026-08-01', end: '2026-08-26' },
    ]);
  });
});

describe('concurrency limiter', () => {
  it('preserves result order and never exceeds the configured concurrency', async () => {
    let active = 0; let maximum = 0;
    const result = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async value => {
      active++; maximum = Math.max(maximum, active);
      await new Promise(resolve => setTimeout(resolve, 3));
      active--; return value * 2;
    });
    expect(result).toEqual([2, 4, 6, 8, 10]);
    expect(maximum).toBe(2);
  });
});
