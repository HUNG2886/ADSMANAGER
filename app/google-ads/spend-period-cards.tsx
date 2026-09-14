'use client';

import { CalendarDays, MousePointerClick, Target, Wallet, X } from 'lucide-react';
import { useState } from 'react';
import { formatMoney, formatNumber } from '@/lib/google-ads-format';
import { dateLocale, tr } from '@/lib/i18n';
import type { SpendPeriodKey } from '@/lib/metric-periods';
import { useAppLocale } from '@/app/locale-provider';

type Period = { key: SpendPeriodKey; label: string; start: string; end: string; total: number };
type DailySpend = { date: string; cost: number; clicks: number; impressions: number; conversions: number };

export function SpendPeriodCards({ periods, days, currency, timezone }: { periods: Period[]; days: DailySpend[]; currency: string; timezone: string }) {
  const locale = useAppLocale();
  const [active, setActive] = useState<Period | null>(null);
  const rows = active ? days.filter(day => day.date >= active.start && day.date <= active.end).sort((a, b) => b.date.localeCompare(a.date)) : [];
  return <><section className="spend-period-section"><div className="spend-period-head"><div><p>{tr(locale,'CHI TIÊU THEO KỲ','SPEND BY PERIOD')}</p><h2>{tr(locale,'Tổng quan chi tiêu','Spend snapshot')}</h2></div><span><CalendarDays size={14}/> {timezone}</span></div><div className="spend-period-grid">{periods.map((period, index) => <button key={period.key} onClick={() => setActive(period)}><span className={`spend-period-icon tone-${index}`}><Wallet size={17}/></span><small>{period.label}</small><strong>{formatMoney(period.total, currency, dateLocale(locale))}</strong><em>{period.start === period.end ? period.start : `${period.start} → ${period.end}`}</em></button>)}</div></section>{active && <div className="modal-backdrop"><div className="confirm-modal spend-modal"><button className="modal-close" onClick={() => setActive(null)} aria-label={tr(locale,'Đóng','Close')}><X size={17}/></button><span className="modal-icon"><Wallet size={20}/></span><h2>{active.label}</h2><p>{active.start === active.end ? active.start : `${active.start} → ${active.end}`} · {timezone}</p><div className="spend-modal-total"><span>{tr(locale,'Tổng chi tiêu','Total spend')}</span><strong>{formatMoney(active.total, currency, dateLocale(locale))}</strong></div><div className="spend-day-list">{rows.map(day => <article key={day.date}><div><strong>{new Date(`${day.date}T00:00:00`).toLocaleDateString(dateLocale(locale))}</strong><small><MousePointerClick size={11}/> {formatNumber(day.clicks, dateLocale(locale))} {tr(locale,'lượt nhấp','clicks')} · <Target size={11}/> {formatNumber(day.conversions, dateLocale(locale))} {tr(locale,'chuyển đổi','conversions')}</small></div><b>{formatMoney(day.cost, currency, dateLocale(locale))}</b></article>)}{rows.length === 0 && <p>{tr(locale,'Chưa có dữ liệu đã đồng bộ trong khoảng này.','No synchronized metrics in this period.')}</p>}</div><button className="ga-secondary spend-close" onClick={() => setActive(null)}>{tr(locale,'Đóng','Close')}</button></div></div>}</>;
}
