import { useMemo, useState, type MouseEvent } from 'react';
import { PRODUCTS, REGIONS } from '../data/config';
import { makeRow, type Row } from '../engine/aggregate';
import { compact } from '../lib/format';
import type { Model, ProductId, Region, Result } from '../types';
import { Card, Select } from './ui';

const W = 760;
const PL = 46;
const PR = 10;

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return m * p;
}

export function SupplyChart({
  model,
  result,
  title = 'Demand, production and capacity',
  fixedRow,
  compactMode = false,
}: {
  model: Model;
  result: Result;
  title?: string;
  /** If provided, the chart shows this row and hides the filters. */
  fixedRow?: Row;
  compactMode?: boolean;
}) {
  const [region, setRegion] = useState<Region | 'All'>('All');
  const [product, setProduct] = useState<ProductId | 'All'>('All');
  const [hover, setHover] = useState<number | null>(null);
  const T = model.horizon;

  const row = useMemo(() => {
    if (fixedRow) return fixedRow;
    const sites = result.sites.filter(
      (s) => (region === 'All' || s.site.region === region) && (product === 'All' || s.site.product === product),
    );
    return makeRow('sel', 'Selection', '#6366f1', sites, T);
  }, [fixedRow, result, region, product, T]);

  const H1 = compactMode ? 190 : 240;
  const H2 = 110;
  const PT = 12;
  const PB = 24;
  const bw = (W - PL - PR) / T;
  const max1 = niceMax(Math.max(...row.req.slice(0, T), ...row.cap, ...row.prod) * 1.04);
  const max2 = niceMax(Math.max(...row.poh, ...row.ss, 1) * 1.1);
  const y1 = (v: number) => PT + (H1 - PT - PB) * (1 - v / max1);
  const y2 = (v: number) => 8 + (H2 - 8 - 18) * (1 - v / max2);
  const cx = (i: number) => PL + i * bw + bw / 2;

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const i = Math.floor((x - PL) / bw);
    setHover(i >= 0 && i < T ? i : null);
  };

  const path = (vals: number[], y: (v: number) => number) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  const ticks1 = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max1);
  const ticks2 = [0, 0.5, 1].map((f) => f * max2);
  const h = hover;

  return (
    <Card
      title={title}
      subtitle="Bars = what plants must ship. Solid line = planned production. Dashed = available capacity."
      action={
        !fixedRow && (
          <div className="flex gap-2">
            <div className="w-32">
              <Select
                label="Region filter"
                value={region}
                options={[{ value: 'All', label: 'All regions' }, ...REGIONS.map((r) => ({ value: r, label: r }))]}
                onChange={(v) => setRegion(v as Region | 'All')}
              />
            </div>
            <div className="w-32">
              <Select
                label="Product filter"
                value={product}
                options={[{ value: 'All', label: 'All products' }, ...PRODUCTS.map((p) => ({ value: p.id, label: p.name }))]}
                onChange={(v) => setProduct(v as ProductId | 'All')}
              />
            </div>
          </div>
        )
      }
    >
      <svg
        viewBox={`0 0 ${W} ${H1}`}
        className="w-full"
        role="img"
        aria-label="Weekly requirement, production and capacity"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {ticks1.map((t) => (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={y1(t)} y2={y1(t)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={PL - 6} y={y1(t) + 3.5} textAnchor="end" fontSize={10} fill="var(--color-muted)">
              {compact(t)}
            </text>
          </g>
        ))}
        {model.weeks.map((w, i) => (
          <g key={w.index}>
            <rect
              x={PL + i * bw + bw * 0.16}
              width={bw * 0.68}
              y={y1(row.req[i])}
              height={Math.max(0, y1(0) - y1(row.req[i]))}
              rx={3}
              fill="var(--color-brand)"
              opacity={h === i ? 0.7 : w.firm ? 0.5 : 0.28}
            />
            <text x={cx(i)} y={H1 - 8} textAnchor="middle" fontSize={10} fill="var(--color-muted)">
              {w.label}
            </text>
            {row.short[i] > 0.5 && (
              <path d={`M${cx(i) - 6},${PT + 2} L${cx(i) + 6},${PT + 2} L${cx(i)},${PT + 12} Z`} fill="var(--color-bad)">
                <title>{`Shortage ${Math.round(row.short[i])} units`}</title>
              </path>
            )}
          </g>
        ))}
        <path d={path(row.cap, y1)} fill="none" stroke="var(--color-ink)" strokeWidth={1.8} strokeDasharray="5 4" opacity={0.75} />
        <path d={path(row.prod, y1)} fill="none" stroke="var(--color-good)" strokeWidth={2.6} strokeLinejoin="round" />
        {row.prod.map((v, i) => (
          <circle key={i} cx={cx(i)} cy={y1(v)} r={h === i ? 4.5 : 3} fill="var(--color-surface)" stroke="var(--color-good)" strokeWidth={2} />
        ))}
        {h !== null && (
          <rect x={PL + h * bw} width={bw} y={PT} height={H1 - PT - PB} fill="var(--color-ink)" opacity={0.05} pointerEvents="none" />
        )}
      </svg>

      <svg viewBox={`0 0 ${W} ${H2}`} className="mt-1 w-full" role="img" aria-label="Projected stock against safety stock" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {ticks2.map((t) => (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={y2(t)} y2={y2(t)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={PL - 6} y={y2(t) + 3.5} textAnchor="end" fontSize={10} fill="var(--color-muted)">
              {compact(t)}
            </text>
          </g>
        ))}
        <path
          d={`${path(row.poh, y2)} L${cx(T - 1)},${y2(0)} L${cx(0)},${y2(0)} Z`}
          fill="var(--color-cool)"
          opacity={0.18}
        />
        <path d={path(row.poh, y2)} fill="none" stroke="var(--color-cool)" strokeWidth={2.2} />
        <path d={path(row.ss, y2)} fill="none" stroke="var(--color-warn)" strokeWidth={1.8} strokeDasharray="4 3" />
        <text x={PL} y={H2 - 3} fontSize={10} fill="var(--color-muted)">
          Projected stock (blue) vs safety stock (amber, dashed)
        </text>
        {h !== null && (
          <rect x={PL + h * bw} width={bw} y={4} height={H2 - 22} fill="var(--color-ink)" opacity={0.05} pointerEvents="none" />
        )}
      </svg>

      <div className="tabular mt-2 flex min-h-8 flex-wrap items-center gap-x-5 gap-y-1 rounded-xl bg-surface-2 px-3 py-2 text-xs">
        {h !== null ? (
          <>
            <span className="font-semibold">{model.weeks[h].label}</span>
            <span>Requirement {Math.round(row.req[h]).toLocaleString('en-GB')}</span>
            <span>Production {Math.round(row.prod[h]).toLocaleString('en-GB')}</span>
            <span>Capacity {Math.round(row.cap[h]).toLocaleString('en-GB')}</span>
            <span>Stock {Math.round(row.poh[h]).toLocaleString('en-GB')}</span>
            {row.short[h] > 0.5 && <span className="font-semibold text-bad">Short {Math.round(row.short[h]).toLocaleString('en-GB')}</span>}
          </>
        ) : (
          <span className="text-muted">Hover the chart to read a week. Darker bars are firm call-offs, lighter bars are forecast. Red triangles mark shortages.</span>
        )}
      </div>
    </Card>
  );
}
