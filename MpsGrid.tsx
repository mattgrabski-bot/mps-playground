import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { PRODUCTS, PRODUCT_BY_ID } from '../data/config';
import { makeRow } from '../engine/aggregate';
import { heatColor } from '../lib/heat';
import { num } from '../lib/format';
import type { Model, Result, SiteResult } from '../types';
import { Card, StatusDot } from './ui';
import { SupplyChart } from './SupplyChart';

function EditableCell({
  value,
  overridden,
  max,
  onCommit,
  onReset,
}: {
  value: number;
  overridden: boolean;
  max: number;
  onCommit: (v: number) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => setDraft(null), [value]);
  const commit = () => {
    if (draft === null) return;
    const n = Number(draft.replace(/[^0-9.]/g, ''));
    setDraft(null);
    if (Number.isFinite(n) && Math.round(n) !== Math.round(value)) onCommit(Math.round(n));
  };
  return (
    <div className="relative">
      <input
        inputMode="numeric"
        aria-label="Planned production"
        value={draft ?? num(value)}
        onFocus={(e) => {
          setDraft(String(Math.round(value)));
          e.currentTarget.select();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setDraft(null);
            (e.target as HTMLInputElement).blur();
          }
        }}
        title={`Type a quantity (max ${num(max)}). Enter to apply, Esc to cancel.`}
        className={`tabular h-8 w-full rounded-md border px-1.5 text-right text-[12px] font-semibold outline-none focus:ring-2 focus:ring-brand/50 ${
          overridden ? 'border-brand bg-brand-soft' : 'border-line bg-surface'
        }`}
      />
      {overridden && (
        <button
          onClick={onReset}
          title="Remove manual edit"
          aria-label="Remove manual edit"
          className="absolute -right-1 -top-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-brand text-[9px] leading-none text-white"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function MpsGrid({
  model,
  result,
  siteId,
  onSelectSite,
  onOverride,
}: {
  model: Model;
  result: Result;
  siteId: string;
  onSelectSite: (id: string) => void;
  onOverride: (siteId: string, week: number, value: number | null) => void;
}) {
  const s: SiteResult = result.byId[siteId] ?? result.sites[0];
  const T = model.horizon;
  const product = PRODUCT_BY_ID[s.site.product];
  const row = useMemo(() => makeRow(s.site.id, s.site.name, product.color, [s], T), [s, product, T]);

  const grouped = useMemo(
    () => PRODUCTS.map((p) => ({ p, sites: result.sites.filter((x) => x.site.product === p.id) })),
    [result],
  );

  const labelCls = 'sticky left-0 z-10 bg-surface pr-3 text-[12px] font-medium whitespace-nowrap';
  const cell = 'tabular h-8 min-w-[58px] px-1.5 text-right text-[12px] leading-8';
  const rowDefs: { label: string; sub: string; render: (t: number) => ReactNode }[] = [
    {
      label: 'Customer requirement',
      sub: 'at the plant, after transit time',
      render: (t) => <div className={cell}>{num(s.req[t])}</div>,
    },
    {
      label: 'Safety stock target',
      sub: `${Math.max(0, product.ssDays)} d policy + lever`,
      render: (t) => <div className={`${cell} text-muted`}>{num(s.ss[t])}</div>,
    },
    {
      label: 'Required production',
      sub: 'just-in-time, ignoring capacity',
      render: (t) => <div className={cell}>{num(s.need[t])}</div>,
    },
    {
      label: 'Available capacity',
      sub: 'calendar, shifts, overtime, outage',
      render: (t) => <div className={`${cell} text-muted`}>{num(s.cap[t])}</div>,
    },
    {
      label: 'Required load',
      sub: 'required ÷ capacity',
      render: (t) => {
        const v = s.cap[t] > 0 ? s.need[t] / s.cap[t] : s.need[t] > 0 ? 9 : 0;
        return (
          <div className="heat-cell tabular mx-0.5 h-7 rounded-md text-center text-[11px] font-semibold leading-7" style={{ background: heatColor('load', v) }}>
            {s.cap[t] <= 0 && s.need[t] > 0 ? 'n/a' : `${Math.round(v * 100)}%`}
          </div>
        );
      },
    },
    {
      label: 'Planned production',
      sub: 'editable, try it',
      render: (t) => (
        <EditableCell
          value={s.prod[t]}
          overridden={s.overridden[t]}
          max={s.cap[t]}
          onCommit={(v) => onOverride(s.site.id, t, v)}
          onReset={() => onOverride(s.site.id, t, null)}
        />
      ),
    },
    {
      label: 'Utilisation',
      sub: 'planned ÷ capacity',
      render: (t) => {
        const v = s.cap[t] > 0 ? s.prod[t] / s.cap[t] : 0;
        return (
          <div className="heat-cell tabular mx-0.5 h-7 rounded-md text-center text-[11px] font-semibold leading-7" style={{ background: heatColor('util', v) }}>
            {Math.round(v * 100)}%
          </div>
        );
      },
    },
    {
      label: 'Projected stock',
      sub: 'end of week',
      render: (t) => {
        const below = s.poh[t] < s.ss[t] - 0.5;
        const neg = s.poh[t] < -0.5;
        return (
          <div
            className={`tabular mx-0.5 h-7 rounded-md text-center text-[12px] font-semibold leading-7 ${
              neg ? 'bg-bad/25 text-bad' : below ? 'bg-warn/25' : 'bg-surface-2'
            }`}
            title={neg ? 'Stock-out' : below ? 'Below safety stock' : 'Healthy'}
          >
            {num(s.poh[t])}
          </div>
        );
      },
    },
    {
      label: 'Shortage',
      sub: 'cannot be delivered',
      render: (t) => (
        <div className={`${cell} ${s.shortage[t] > 0.5 ? 'font-bold text-bad' : 'text-muted'}`}>
          {s.shortage[t] > 0.5 ? num(s.shortage[t]) : '·'}
        </div>
      ),
    },
  ];

  const peak = Math.max(...s.prod.map((p, t) => (s.cap[t] > 0 ? p / s.cap[t] : 0)));
  const shortTotal = s.shortage.reduce((a, b) => a + b, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
      {/* Plant picker */}
      <Card className="h-fit lg:sticky lg:top-20" title="Plants">
        <label className="sr-only" htmlFor="site-select">
          Choose a plant
        </label>
        <select
          id="site-select"
          value={s.site.id}
          onChange={(e) => onSelectSite(e.target.value)}
          className="w-full rounded-lg border border-line bg-surface px-2 py-2 text-sm font-medium lg:hidden"
        >
          {grouped.map(({ p, sites }) => (
            <optgroup key={p.id} label={p.name}>
              {sites.map((x) => (
                <option key={x.site.id} value={x.site.id}>
                  {x.site.id} · {x.site.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="scrollbar-thin hidden max-h-[calc(100vh-190px)] space-y-3 overflow-y-auto pr-1 lg:block">
          {grouped.map(({ p, sites }) => (
            <div key={p.id}>
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                {p.name}
              </div>
              <div className="space-y-0.5">
                {sites.map((x) => (
                  <button
                    key={x.site.id}
                    onClick={() => onSelectSite(x.site.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                      x.site.id === s.site.id ? 'bg-brand-soft font-semibold' : 'hover:bg-surface-2'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <StatusDot status={x.status} />
                      {x.site.id}
                    </span>
                    <span className="tabular text-[10px] text-muted">{x.site.country}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="min-w-0 space-y-4">
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <StatusDot status={s.status} />
                <h2 className="text-lg font-semibold tracking-tight">
                  {s.site.id} <span className="font-normal text-muted">· {s.site.name}</span>
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted">
                {s.site.lines} lines × {s.site.shifts} shifts × {s.site.hoursPerShift} h × {s.site.daysPerWeek} d · {s.site.unitsPerLineHour} units/line-hour · OEE{' '}
                {Math.round(s.site.oee * 100)}% · opening stock {num(s.opening)}
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="rounded-lg bg-surface-2 px-2.5 py-1.5 font-semibold">Peak utilisation {Math.round(peak * 100)}%</span>
              <span className={`rounded-lg px-2.5 py-1.5 font-semibold ${shortTotal > 0.5 ? 'bg-bad/15 text-bad' : 'bg-good/15 text-good'}`}>
                {shortTotal > 0.5 ? `${num(shortTotal)} units short` : 'No shortage'}
              </span>
            </div>
          </div>

          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-1">
              <thead>
                <tr>
                  <th className={`${labelCls} text-left text-[10px] uppercase tracking-wider text-muted`}>units / week</th>
                  <th className="min-w-[58px] px-1.5 text-right text-[10px] font-medium uppercase text-muted">Open</th>
                  {model.weeks.map((w) => (
                    <th key={w.index} className="min-w-[58px] px-1 text-center text-[11px] font-semibold">
                      {w.label}
                      <div className="text-[9px] font-normal text-muted">{w.start.slice(5)}</div>
                      <div className={`mx-auto mt-0.5 h-0.5 w-5 rounded-full ${w.firm ? 'bg-ink/50' : 'bg-line'}`} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowDefs.map((r, i) => (
                  <tr key={r.label} className={i === 5 ? 'rounded-lg bg-brand-soft/40' : ''}>
                    <td className={labelCls}>
                      <div>{r.label}</div>
                      <div className="text-[10px] font-normal text-muted">{r.sub}</div>
                    </td>
                    <td className="tabular px-1.5 text-right text-[12px] text-muted">
                      {r.label === 'Projected stock' ? num(s.opening) : ''}
                    </td>
                    {model.weeks.map((w) => (
                      <td key={w.index} className="px-0.5 align-middle">
                        {r.render(w.index)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            How to read it: planned production is set so that projected stock never falls below safety stock. When a week needs more than capacity, earlier weeks with spare capacity build ahead. What still cannot be built becomes a shortage. Edit any planned-production cell to override the plan.
          </p>
        </Card>

        <SupplyChart model={model} result={result} fixedRow={row} title={`${s.site.id}: demand, production and capacity`} compactMode />

        <Card title="Supplied customers" subtitle="Which demand each lane carries into this plant">
          {s.flows.length === 0 ? (
            <p className="text-sm text-muted">This plant serves no customer demand in the current sourcing set-up.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="tabular w-full text-left text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-muted">
                  <tr>
                    <th className="py-1 pr-3">Customer location</th>
                    <th className="py-1 pr-3 text-right">Share of its demand</th>
                    <th className="py-1 pr-3 text-right">Avg units/week</th>
                    <th className="py-1 text-right">Transit</th>
                  </tr>
                </thead>
                <tbody>
                  {s.flows
                    .slice()
                    .sort((a, b) => b.avgWeekly - a.avgWeekly)
                    .map((f) => (
                      <tr key={f.nodeId} className="border-t border-line">
                        <td className="py-1.5 pr-3 font-medium">{f.nodeCountry}</td>
                        <td className="py-1.5 pr-3 text-right">{Math.round(f.share * 100)}%</td>
                        <td className="py-1.5 pr-3 text-right">{num(f.avgWeekly)}</td>
                        <td className="py-1.5 text-right">
                          {f.lt === 0 ? 'local' : `${f.lt} wk`}
                          {f.lt > f.baseLt && <span className="text-warn"> (+{f.lt - f.baseLt})</span>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
