import { PRODUCTS, REGIONS } from '../data/config';
import { MODEL } from '../data/mock';
import { DEFAULT_SCENARIO } from '../engine/scenarios';
import type { ProductId, Region, Scenario, SourceShift } from '../types';
import { Group, Select, Slider, Toggle } from './ui';

const regionOpts = [{ value: 'All' as const, label: 'All regions' }, ...REGIONS.map((r) => ({ value: r, label: r }))];
const productOpts = [
  { value: 'All' as const, label: 'All products' },
  ...PRODUCTS.map((p) => ({ value: p.id, label: p.name })),
];

export function Levers({
  sc,
  set,
  mode,
  overrideCount,
}: {
  sc: Scenario;
  set: (patch: Partial<Scenario>) => void;
  mode: 'exec' | 'planner';
  overrideCount: number;
}) {
  const d = DEFAULT_SCENARIO;
  const sitesFor = (p: ProductId) => MODEL.sites.filter((s) => s.product === p);

  const updateShift = (i: number, patch: Partial<SourceShift>) => {
    const next = sc.sourcing.map((x, j) => (j === i ? { ...x, ...patch } : x));
    // keep from/to valid when the product changes
    const sh = next[i];
    const list = sitesFor(sh.product);
    if (!list.some((s) => s.id === sh.fromSite)) sh.fromSite = list[0]?.id ?? '';
    if (!list.some((s) => s.id === sh.toSite) || sh.toSite === sh.fromSite)
      sh.toSite = list.find((s) => s.id !== sh.fromSite)?.id ?? '';
    set({ sourcing: next });
  };

  const addShift = () => {
    const list = sitesFor('bumpers');
    set({
      sourcing: [
        ...sc.sourcing,
        { product: 'bumpers', fromSite: 'FR-BMP', toSite: list.find((s) => s.id === 'ES-BMP') ? 'ES-BMP' : list[1].id, pct: 30 },
      ],
    });
  };

  const o = sc.outage;
  const siteOpts = MODEL.sites.map((s) => ({ value: s.id, label: `${s.id} · ${s.name}` }));

  return (
    <div className="text-ink">
      <Group
        title="Demand"
        icon="📈"
        changed={sc.demandPct !== d.demandPct}
      >
        <Slider
          label="Customer demand change"
          value={sc.demandPct}
          min={-30}
          max={40}
          unit="%"
          onChange={(v) => set({ demandPct: v })}
          hint="Applied to every week of the horizon, on top of the forecast."
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Demand region"
            value={sc.demandRegion}
            options={regionOpts}
            onChange={(v) => set({ demandRegion: v as Region | 'All' })}
          />
          <Select
            label="Demand product"
            value={sc.demandProduct}
            options={productOpts}
            onChange={(v) => set({ demandProduct: v as ProductId | 'All' })}
          />
        </div>
      </Group>

      <Group
        title="Capacity"
        icon="🏭"
        changed={sc.addShift || sc.overtimePct > 0 || !!sc.outage}
      >
        <Toggle
          checked={sc.addShift}
          onChange={(v) => set({ addShift: v })}
          label="Add a shift"
          hint="2-shift plants go to 3 shifts (+50%). Plants already on 3 shifts add Saturday (+20%)."
        />
        <Slider
          label="Overtime"
          value={sc.overtimePct}
          min={0}
          max={30}
          unit="%"
          format={(v) => `${v}%`}
          onChange={(v) => set({ overtimePct: v })}
          hint="Extra hours on existing shifts."
        />
        <Select
          label="Capacity lever region"
          value={sc.capacityRegion}
          options={regionOpts}
          onChange={(v) => set({ capacityRegion: v as Region | 'All' })}
        />
        <div className="rounded-xl bg-surface-2 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-medium">Plant outage</span>
            {o && (
              <button className="text-[11px] font-medium text-bad" onClick={() => set({ outage: null })}>
                Remove
              </button>
            )}
          </div>
          <Select
            label="Outage plant"
            value={o?.siteId ?? ''}
            options={[{ value: '', label: 'No outage' }, ...siteOpts]}
            onChange={(v) =>
              set({ outage: v ? { siteId: v, startWeek: o?.startWeek ?? 3, weeks: o?.weeks ?? 2, lossPct: o?.lossPct ?? 100 } : null })
            }
          />
          {o && (
            <div className="mt-3 space-y-3">
              <Slider
                label="Starts in"
                value={o.startWeek}
                min={0}
                max={11}
                format={(v) => MODEL.weeks[v].label}
                onChange={(v) => set({ outage: { ...o, startWeek: v } })}
              />
              <Slider
                label="Duration"
                value={o.weeks}
                min={1}
                max={8}
                format={(v) => `${v} wk${v > 1 ? 's' : ''}`}
                onChange={(v) => set({ outage: { ...o, weeks: v } })}
              />
              <Slider
                label="Output lost"
                value={o.lossPct}
                min={10}
                max={100}
                step={10}
                format={(v) => `${v}%`}
                onChange={(v) => set({ outage: { ...o, lossPct: v } })}
              />
            </div>
          )}
        </div>
      </Group>

      <Group
        title="Lead time & safety stock"
        icon="🚢"
        changed={sc.extraSeaWeeks > 0 || sc.extraRegionalWeeks > 0 || sc.ssExtraDays !== 0}
      >
        <Slider
          label="Extra transit, inter-region sea lanes"
          value={sc.extraSeaWeeks}
          min={0}
          max={4}
          format={(v) => `+${v} wk`}
          onChange={(v) => set({ extraSeaWeeks: v })}
          hint="Baseline is 4 weeks Americas↔Europe, 5 weeks to/from Asia. Only matters if volume flows across regions."
        />
        <Slider
          label="Extra transit, within a region"
          value={sc.extraRegionalWeeks}
          min={0}
          max={2}
          format={(v) => `+${v} wk`}
          onChange={(v) => set({ extraRegionalWeeks: v })}
          hint="Border delays, rail or truck disruption. Baseline is 1 week."
        />
        <Slider
          label="Safety stock"
          value={sc.ssExtraDays}
          min={-3}
          max={10}
          format={(v) => `${v >= 0 ? '+' : ''}${v} days`}
          onChange={(v) => set({ ssExtraDays: v })}
          hint="Added to each product's policy (bumpers 3 d, tailgates 4 d, fuel tanks 4 d, headlamps 6 d, modules 1.5 d, cockpits 1 d). Also bridges transit gaps."
        />
      </Group>

      <Group title="Sourcing split" icon="🔀" changed={sc.sourcing.length > 0}>
        <p className="-mt-1 text-[11px] leading-snug text-muted">
          Move a share of the volume one plant serves to another plant of the same product. Cross-region moves take
          4-5 weeks of transit.
        </p>
        {sc.sourcing.map((sh, i) => (
          <div key={i} className="space-y-2 rounded-xl bg-surface-2 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Shift {i + 1}</span>
              <button
                className="text-[11px] font-medium text-bad"
                onClick={() => set({ sourcing: sc.sourcing.filter((_, j) => j !== i) })}
              >
                Remove
              </button>
            </div>
            <Select
              label="Product"
              value={sh.product}
              options={PRODUCTS.map((p) => ({ value: p.id, label: p.name }))}
              onChange={(v) => updateShift(i, { product: v as ProductId })}
            />
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
              <Select
                label="From plant"
                value={sh.fromSite}
                options={sitesFor(sh.product).map((s) => ({ value: s.id, label: s.id }))}
                onChange={(v) => updateShift(i, { fromSite: v })}
              />
              <span className="text-muted">→</span>
              <Select
                label="To plant"
                value={sh.toSite}
                options={sitesFor(sh.product).map((s) => ({ value: s.id, label: s.id }))}
                onChange={(v) => updateShift(i, { toSite: v })}
              />
            </div>
            <Slider
              label="Share moved"
              value={sh.pct}
              min={0}
              max={100}
              step={5}
              format={(v) => `${v}%`}
              onChange={(v) => updateShift(i, { pct: v })}
            />
          </div>
        ))}
        {sc.sourcing.length < 3 && (
          <button
            onClick={addShift}
            className="w-full rounded-xl border border-dashed border-line py-2 text-xs font-semibold text-brand hover:bg-brand-soft"
          >
            + Add a sourcing shift
          </button>
        )}
      </Group>

      {mode === 'planner' && (
        <Group title="Manual edits" icon="✏️" changed={overrideCount > 0} defaultOpen>
          <p className="-mt-1 text-[11px] leading-snug text-muted">
            In the MPS grid, type a new planned-production quantity in any cell. The plan around it re-balances.
          </p>
          <button
            disabled={overrideCount === 0}
            onClick={() => set({ overrides: {} })}
            className="w-full rounded-xl border border-line py-2 text-xs font-semibold disabled:opacity-40"
          >
            Clear {overrideCount} manual edit{overrideCount === 1 ? '' : 's'}
          </button>
        </Group>
      )}
    </div>
  );
}
