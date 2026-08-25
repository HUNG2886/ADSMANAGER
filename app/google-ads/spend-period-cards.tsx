'use client';

import { CalendarDays, MousePointerClick, Target, Wallet, X } from 'lucide-react';
import { useState } from 'react';
import { formatMoney, formatNumber } from '@/lib/google-ads-format';
import type { SpendPeriodKey } from '@/lib/metric-periods';

type Period = { key: SpendPeriodKey; label: string; start: string; end: string; total: number };
type DailySpend = { date: string; cost: number; clicks: number; impressions: number; conversions: number };

export function SpendPeriodCards({ periods, days, currency, timezone }: { periods: Period[]; days: DailySpend[]; currency: string; timezone: string }) {
  const [active, setActive] = useState<Period | null>(null);
  const rows = active ? days.filter(day => day.date >= active.start && day.date <= active.end).sort((a, b) => b.date.localeCompare(a.date)) : [];
  return <><section className="spend-period-section"><div className="spend-period-head"><div><p>CHI TIÊU THEO KỲ</p><h2>Spend snapshot</h2></div><span><CalendarDays size={14}/> {timezone}</span></div><div className="spend-period-grid">{periods.map((period, index) => <button key={period.key} onClick={() => setActive(period)}><span className={`spend-period-icon tone-${index}`}><Wallet size={17}/></span><small>{period.label}</small><strong>{formatMoney(period.total, currency)}</strong><em>{period.start === period.end ? period.start : `${period.start} → ${period.end}`}</em></button>)}</div></section>{active && <div className="modal-backdrop"><div className="confirm-modal spend-modal"><button className="modal-close" onClick={() => setActive(null)}><X size={17}/></button><span className="modal-icon"><Wallet size={20}/></span><h2>{active.label}</h2><p>{active.start === active.end ? active.start : `${active.start} → ${active.end}`} · {timezone}</p><div className="spend-modal-total"><span>Tổng chi tiêu</span><strong>{formatMoney(active.total, currency)}</strong></div><div className="spend-day-list">{rows.map(day => <article key={day.date}><div><strong>{new Date(`${day.date}T00:00:00`).toLocaleDateString('vi-VN')}</strong><small><MousePointerClick size={11}/> {formatNumber(day.clicks)} clicks · <Target size={11}/> {formatNumber(day.conversions)} conversions</small></div><b>{formatMoney(day.cost, currency)}</b></article>)}{rows.length === 0 && <p>Chưa có metric đã đồng bộ trong khoảng này.</p>}</div><button className="ga-secondary spend-close" onClick={() => setActive(null)}>Đóng</button></div></div>}</>;
}
