import { useMemo, useState } from 'react';
import { COUNTRIES, COUNTRY_BY_CODE, REGION_COLORS, baseLeadTimeWeeks } from '../data/config';
import { heatColor } from '../lib/heat';
import { compact } from '../lib/format';
import type { CountryCode, Model, Region, Result } from '../types';
import { Card } from './ui';

const VW = 1000;
const VH = 430;
const px = (lon: number) => 50 + ((lon + 125) / 250) * 900;
const py = (lat: number) => 28 + ((62 - lat) / 62) * 370;

const REGION_BOX: Record<Region, { x: number; y: number; w: number; h: number }> = {
  Americas: { x: 70, y: 120, w: 190, h: 190 },
  Europe: { x: 450, y: 80, w: 330, h: 180 },
  Asia: { x: 740, y: 150, w: 210, h: 190 },
};

interface Lane {
  from: CountryCode;
  to: CountryCode;
  units: number;
  lt: number;
}

export function NetworkMap({ model, result }: { model: Model; result: Result }) {
  const [sel, setSel] = useState<CountryCode | null>(null);
  const T = model.horizon;

  const { nodes, lanes } = useMemo(() => {
    const nodes = COUNTRIES.map((c) => {
      const sites = result.sites.filter((s) => s.site.country === c.code);
      const prod = sites.reduce((a, s) => a + s.prod.reduce((x, y) => x + y, 0), 0) / T;
      const cap = sites.reduce((a, s) => a + s.cap.reduce((x, y) => x + y, 0), 0);
      const used = sites.reduce((a, s) => a + s.prod.reduce((x, y) => x + y, 0), 0);
      const short = sites.reduce((a, s) => a + s.shortage.reduce((x, y) => x + y, 0), 0);
      return { c, sites, prod, util: cap > 0 ? used / cap : 0, short };
    });
    const map = new Map<string, Lane>();
    for (const s of result.sites) {
      for (const f of s.flows) {
        if (f.nodeCountry === s.site.country) continue;
        const key = `${s.site.country}>${f.nodeCountry}`;
        const cur = map.get(key) ?? { from: s.site.country, to: f.nodeCountry, units: 0, lt: f.lt };
        cur.units += f.avgWeekly;
        cur.lt = Math.max(cur.lt, f.lt);
        map.set(key, cur);
      }
    }
    return { nodes, lanes: [...map.values()].sort((a, b) => b.units - a.units) };
  }, [result, T]);

  const radius = (prod: number) => 9 + Math.sqrt(prod) / 9;
  const maxUnits = Math.max(1, ...lanes.map((l) => l.units));
  const shown = sel ? lanes.filter((l) => l.from === sel || l.to === sel) : lanes;

  const arc = (a: CountryCode, b: CountryCode) => {
    const A = COUNTRY_BY_CODE[a];
    const B = COUNTRY_BY_CODE[b];
    const x1 = px(A.lon);
    const y1 = py(A.lat);
    const x2 = px(B.lon);
    const y2 = py(B.lat);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const bend = Math.min(90, dist * 0.28);
    return `M${x1},${y1} Q${mx},${my - bend} ${x2},${y2}`;
  };

  const selNode = nodes.find((n) => n.c.code === sel);

  return (
    <Card
      title="Supply network"
      subtitle="Dot size = weekly output, colour = utilisation. Arrows = cross-border supply to customers. Click a country."
    >
      <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" role="img" aria-label="Supply network map">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--color-muted)" />
          </marker>
        </defs>
        {(Object.keys(REGION_BOX) as Region[]).map((r) => {
          const b = REGION_BOX[r];
          return (
            <g key={r}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={28} fill={REGION_COLORS[r]} opacity={0.08} />
              <text x={b.x + 16} y={b.y + 22} fontSize={12} fontWeight={700} letterSpacing={1.5} fill={REGION_COLORS[r]}>
                {r.toUpperCase()}
              </text>
            </g>
          );
        })}
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={50} x2={950} y1={28 + i * 92.5} y2={28 + i * 92.5} stroke="var(--color-line)" strokeDasharray="2 6" />
        ))}

        {lanes.map((l) => {
          const interRegion = COUNTRY_BY_CODE[l.from].region !== COUNTRY_BY_CODE[l.to].region;
          const active = !sel || l.from === sel || l.to === sel;
          return (
            <path
              key={`${l.from}-${l.to}`}
              d={arc(l.from, l.to)}
              fill="none"
              stroke={interRegion ? 'var(--color-warn)' : 'var(--color-brand)'}
              strokeWidth={1.2 + (Math.sqrt(l.units / maxUnits)) * 7}
              strokeLinecap="round"
              opacity={active ? 0.55 : 0.1}
              markerEnd="url(#arrow)"
            >
              <title>{`${l.from} → ${l.to}: ${Math.round(l.units).toLocaleString('en-GB')} units/week, ${l.lt} wk transit`}</title>
            </path>
          );
        })}

        {nodes.map((n) => {
          const x = px(n.c.lon);
          const y = py(n.c.lat);
          const r = radius(n.prod);
          const active = sel === n.c.code;
          return (
            <g key={n.c.code} onClick={() => setSel(active ? null : n.c.code)} style={{ cursor: 'pointer' }} role="button" aria-label={`${n.c.name}`}>
              {n.short > 0.5 && <circle cx={x} cy={y} r={r + 6} fill="none" stroke="var(--color-bad)" strokeWidth={2} strokeDasharray="3 3" />}
              <circle cx={x} cy={y} r={r} fill={heatColor('util', n.util)} stroke={active ? 'var(--color-ink)' : 'var(--color-surface)'} strokeWidth={active ? 3 : 2.5} />
              <text x={x} y={y + 3.5} textAnchor="middle" fontSize={r > 14 ? 11 : 9.5} fontWeight={700} fill="var(--color-ink)">
                {n.c.code}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-surface-2 p-3 text-xs">
          {selNode ? (
            <>
              <div className="text-sm font-semibold">{selNode.c.name}</div>
              <div className="tabular mt-1 text-muted">
                {selNode.sites.length} plants · {compact(selNode.prod)} units/week · utilisation {Math.round(selNode.util * 100)}%
                {selNode.short > 0.5 && <span className="font-semibold text-bad"> · {compact(selNode.short)} short</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selNode.sites.map((s) => (
                  <span key={s.site.id} className="rounded-md bg-surface px-1.5 py-0.5 font-medium ring-1 ring-line">
                    {s.site.id}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted">Select a country to see its plants and the lanes in and out of it. Try a Sourcing shift between regions to watch long, amber lanes appear.</p>
          )}
        </div>
        <div className="rounded-xl bg-surface-2 p-3 text-xs">
          <div className="mb-1 font-semibold">Cross-border lanes {sel ? `touching ${sel}` : '(top 6)'}</div>
          {shown.length === 0 && <p className="text-muted">No cross-border supply in this selection.</p>}
          <ul className="tabular space-y-0.5">
            {shown.slice(0, 6).map((l) => (
              <li key={`${l.from}-${l.to}`} className="flex justify-between gap-3">
                <span>
                  {l.from} → {l.to}
                  {COUNTRY_BY_CODE[l.from].region !== COUNTRY_BY_CODE[l.to].region && <span className="ml-1 text-warn">sea</span>}
                </span>
                <span className="text-muted">
                  {compact(l.units)}/wk · {l.lt} wk
                  {l.lt !== baseLeadTimeWeeks(l.from, l.to) && <span className="text-warn"> (+{l.lt - baseLeadTimeWeeks(l.from, l.to)})</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
