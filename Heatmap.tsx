import { useMemo, useState } from 'react';
import { aggregate, type GroupBy, type Row } from '../engine/aggregate';
import { METRICS, heatColor, metricText, metricUnit, type Metric } from '../lib/heat';
import type { Model, Result } from '../types';
import { Card, Segmented } from './ui';

export interface DrillTarget {
  row: Row;
  week: number | null;
}

export function Heatmap({
  model,
  result,
  defaultGroup = 'region',
  allowSite = false,
  onDrill,
}: {
  model: Model;
  result: Result;
  defaultGroup?: GroupBy;
  allowSite?: boolean;
  onDrill: (t: DrillTarget) => void;
}) {
  const [by, setBy] = useState<GroupBy>(defaultGroup);
  const [metric, setMetric] = useState<Metric>('util');
  const [hover, setHover] = useState<{ row: Row; t: number } | null>(null);

  const rows = useMemo(() => aggregate(model, result, by), [model, result, by]);

  const cols = `minmax(108px,160px) repeat(${model.horizon}, minmax(34px,1fr)) 54px`;
  const summary = (r: Row) =>
    metric === 'util' ? r.avgUtil : metric === 'load' ? r.peakLoad : metric === 'cover' ? Math.min(...r.cover) : r.shortTotal;
  const summaryLabel = metric === 'util' ? 'avg' : metric === 'load' ? 'peak' : metric === 'cover' ? 'min' : 'total';
  const meta = METRICS.find((m) => m.id === metric)!;

  const value = (r: Row, t: number) =>
    metric === 'util' ? r.util[t] : metric === 'load' ? r.load[t] : metric === 'cover' ? r.cover[t] : r.short[t];

  return (
    <Card
      title="Where is the pressure?"
      subtitle={meta.hint}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            size="sm"
            label="Metric"
            value={metric}
            onChange={setMetric}
            options={METRICS.map((m) => ({ value: m.id, label: m.label, title: m.hint }))}
          />
          <Segmented
            size="sm"
            label="Group by"
            value={by}
            onChange={setBy}
            options={[
              { value: 'region', label: 'Region' },
              { value: 'country', label: 'Country' },
              { value: 'product', label: 'Product' },
              ...(allowSite ? [{ value: 'site' as GroupBy, label: 'Plant' }] : []),
            ]}
          />
        </div>
      }
    >
      <div className="overflow-x-auto scrollbar-thin">
        <div className="min-w-[640px]">
          <div className="grid items-end gap-1 pb-1" style={{ gridTemplateColumns: cols }}>
            <div />
            {model.weeks.map((w) => (
              <div key={w.index} className="text-center text-[10px] font-medium text-muted">
                <div className="tabular">{w.label}</div>
                <div className={`mx-auto mt-0.5 h-0.5 w-4 rounded-full ${w.firm ? 'bg-ink/50' : 'bg-line'}`} title={w.firm ? 'Firm call-offs' : 'Forecast'} />
              </div>
            ))}
            <div className="text-center text-[10px] font-medium uppercase text-muted">{summaryLabel}</div>
          </div>

          <div className="space-y-1">
            {rows.map((r) => (
              <div key={r.key} className="grid items-center gap-1" style={{ gridTemplateColumns: cols }}>
                <button
                  onClick={() => onDrill({ row: r, week: null })}
                  className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-surface-2"
                  title="Open details"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium leading-tight">{r.label}</span>
                    {r.sublabel && <span className="block truncate text-[10px] text-muted">{r.sublabel}</span>}
                  </span>
                </button>
                {model.weeks.map((w) => {
                  const v = value(r, w.index);
                  const active = hover?.row.key === r.key && hover.t === w.index;
                  return (
                    <button
                      key={w.index}
                      onMouseEnter={() => setHover({ row: r, t: w.index })}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover({ row: r, t: w.index })}
                      onBlur={() => setHover(null)}
                      onClick={() => onDrill({ row: r, week: w.index })}
                      aria-label={`${r.label} ${w.label} ${metricText(metric, v)}${metricUnit(metric)}`}
                      className={`heat-cell tabular h-8 rounded-md text-[11px] font-semibold ${active ? 'ring-2 ring-ink/70' : ''}`}
                      style={{ background: heatColor(metric, v) }}
                    >
                      {metricText(metric, v)}
                    </button>
                  );
                })}
                <div
                  className="heat-cell tabular grid h-8 place-items-center rounded-md border border-line text-[11px] font-bold"
                  style={{ background: heatColor(metric, summary(r)) }}
                >
                  {metricText(metric, summary(r))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex min-h-9 flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2 text-xs">
        {hover ? (
          <div className="tabular flex flex-wrap gap-x-5 gap-y-1">
            <span className="font-semibold">
              {hover.row.label} · {model.weeks[hover.t].label}
            </span>
            <span>Utilisation {Math.round(hover.row.util[hover.t] * 100)}%</span>
            <span>Required load {Math.round(hover.row.load[hover.t] * 100)}%</span>
            <span>Cover {hover.row.cover[hover.t].toFixed(1)} wks</span>
            <span className={hover.row.short[hover.t] > 0.5 ? 'font-semibold text-bad' : ''}>
              Short {Math.round(hover.row.short[hover.t]).toLocaleString('en-GB')}
            </span>
          </div>
        ) : (
          <span className="text-muted">Hover a cell for detail, click it to see the plants behind it. Bars under week labels: dark = firm call-offs, light = forecast.</span>
        )}
        <Legend metric={metric} />
      </div>
    </Card>
  );
}

function Legend({ metric }: { metric: Metric }) {
  const stops =
    metric === 'util' || metric === 'load'
      ? [0.4, 0.7, 0.9, 0.98, 1.1]
      : metric === 'cover'
        ? [0.1, 0.3, 0.6, 1.0, 2]
        : [0, 100, 1000, 10000, 50000];
  return (
    <div className="flex items-center gap-1 text-[10px] text-muted">
      <span>low</span>
      {stops.map((s) => (
        <span key={s} className="h-3 w-5 rounded-sm" style={{ background: heatColor(metric, s) }} />
      ))}
      <span>{metric === 'cover' ? 'high stock' : 'high'}</span>
    </div>
  );
}
