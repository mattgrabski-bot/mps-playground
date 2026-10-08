import type { Kpis } from '../types';
import { eur, num, pct } from '../lib/format';

interface Tile {
  label: string;
  value: string;
  sub: string;
  delta: number | null;
  deltaText: string;
  /** +1 = higher is better, -1 = lower is better, 0 = neutral */
  goodDir: 1 | -1 | 0;
  hint: string;
}

function tiles(k: Kpis, b: Kpis): Tile[] {
  return [
    {
      label: 'Service level',
      value: pct(k.serviceLevel, 2),
      sub: `${num(k.shortageUnits)} units short`,
      delta: k.serviceLevel - b.serviceLevel,
      deltaText: `${((k.serviceLevel - b.serviceLevel) * 100).toFixed(2)} pts`,
      goodDir: 1,
      hint: 'Share of customer requirements (by value) delivered on time',
    },
    {
      label: 'Revenue at risk',
      value: eur(k.revenueAtRisk),
      sub: `of ${eur(k.revenue)} over 12 weeks`,
      delta: k.revenueAtRisk - b.revenueAtRisk,
      deltaText: eur(k.revenueAtRisk - b.revenueAtRisk),
      goodDir: -1,
      hint: 'Value of units that cannot be delivered',
    },
    {
      label: 'Capacity utilisation',
      value: pct(k.avgUtil, 1),
      sub: `${k.overloadSiteWeeks} plant-weeks overloaded`,
      delta: k.avgUtil - b.avgUtil,
      deltaText: `${((k.avgUtil - b.avgUtil) * 100).toFixed(1)} pts`,
      goodDir: 0,
      hint: 'Planned production ÷ available capacity. Overload = required load above 100% before pre-build',
    },
    {
      label: 'Inventory',
      value: eur(k.inventoryValue),
      sub: `${k.coverWeeks.toFixed(2)} wks on hand + ${eur(k.pipelineValue)} in transit`,
      delta: k.inventoryValue - b.inventoryValue,
      deltaText: eur(k.inventoryValue - b.inventoryValue),
      goodDir: -1,
      hint: 'Average finished goods at plants plus goods in transit, valued at unit value',
    },
    {
      label: 'Capacity actions',
      value: eur(k.actionCost),
      sub: 'extra shifts + overtime (illustrative)',
      delta: k.actionCost - b.actionCost,
      deltaText: eur(k.actionCost - b.actionCost),
      goodDir: -1,
      hint: 'Illustrative cost: EUR 4.5k per line per week for an added shift, 6% of unit value for overtime units',
    },
  ];
}

export function KpiTiles({ k, base, compact = false }: { k: Kpis; base: Kpis; compact?: boolean }) {
  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 ${compact ? "gap-2" : ""}`}>
      {tiles(k, base).map((t) => {
        const changed = t.delta !== null && Math.abs(t.delta) > 1e-6 && t.deltaText !== '€0' && t.deltaText !== '0.00 pts' && t.deltaText !== '0.0 pts';
        const good = t.delta !== null && t.goodDir !== 0 && (t.delta * t.goodDir > 0);
        const tone = !changed || t.goodDir === 0 ? 'text-muted' : good ? 'text-good' : 'text-bad';
        const arrow = !changed ? '' : (t.delta as number) > 0 ? '▲' : '▼';
        return (
          <div
            key={t.label}
            title={t.hint}
            className={`fade-in rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgb(15_20_40/0.04)] ${compact ? "p-3" : "p-4"}`}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t.label}</div>
            <div className={`tabular mt-1 font-semibold tracking-tight ${compact ? "text-xl" : "text-2xl"}`}>{t.value}</div>
            {!compact && <div className="mt-1 text-[11px] leading-snug text-muted">{t.sub}</div>}
            <div className={`tabular mt-2 text-xs font-medium ${tone}`}>
              {changed ? `${arrow} ${t.deltaText} vs baseline` : 'Same as baseline'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
