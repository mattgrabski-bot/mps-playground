import { describe, expect, it } from 'vitest';
import { MODEL } from '../src/data/mock';
import { computeMps } from '../src/engine/mps';
import { computeKpis } from '../src/engine/kpis';
import { DEFAULT_SCENARIO, PRESETS, decodeScenario, encodeScenario } from '../src/engine/scenarios';
import type { Scenario } from '../src/types';

const run = (patch: Partial<Scenario> = {}) => {
  const sc = { ...DEFAULT_SCENARIO, ...patch };
  const r = computeMps(MODEL, sc);
  return { sc, r, k: computeKpis(MODEL, sc, r) };
};

describe('mock model', () => {
  it('covers the requested scope', () => {
    expect(MODEL.horizon).toBe(12);
    expect(MODEL.weeks[0].label).toBe('W42');
    expect(MODEL.weeks[11].label).toBe('W53');
    expect(new Set(MODEL.countries.map((c) => c.code)).size).toBe(11);
    expect(new Set(MODEL.products.map((p) => p.id)).size).toBe(6);
    expect(new Set(MODEL.countries.map((c) => c.region))).toEqual(new Set(['Americas', 'Europe', 'Asia']));
    for (const p of MODEL.products) expect(MODEL.sites.some((s) => s.product === p.id)).toBe(true);
  });
});

describe('MPS engine invariants', () => {
  it('never plans above capacity and never produces negative quantities', () => {
    for (const preset of PRESETS) {
      const { r } = run(preset.scenario);
      for (const s of r.sites) {
        for (let t = 0; t < 12; t++) {
          expect(s.prod[t]).toBeGreaterThanOrEqual(0);
          expect(s.prod[t]).toBeLessThanOrEqual(s.cap[t] + 1e-6);
        }
      }
    }
  });

  it('conserves stock: poh = opening + cumulative production - cumulative requirement', () => {
    const { r } = run({ demandPct: 15, demandRegion: 'Europe' });
    for (const s of r.sites) {
      let cum = s.opening;
      for (let t = 0; t < 12; t++) {
        cum += s.prod[t] - s.req[t];
        expect(s.poh[t]).toBeCloseTo(cum, 4);
      }
    }
  });

  it('baseline is healthy with a few hot spots', () => {
    const { k, r } = run();
    expect(k.serviceLevel).toBeGreaterThan(0.985);
    expect(k.avgUtil).toBeGreaterThan(0.6);
    expect(k.avgUtil).toBeLessThan(0.95);
    expect(r.sites.filter((s) => s.status === 'watch' || s.status === 'risk').length).toBeLessThanOrEqual(12);
  });

  it('more demand hurts service, more capacity helps it', () => {
    const base = run().k;
    const surge = run({ demandPct: 25 }).k;
    const fixed = run({ demandPct: 25, addShift: true, overtimePct: 10 }).k;
    expect(surge.serviceLevel).toBeLessThan(base.serviceLevel);
    expect(fixed.serviceLevel).toBeGreaterThan(surge.serviceLevel);
    expect(fixed.actionCost).toBeGreaterThan(0);
  });

  it('safety stock raises inventory', () => {
    expect(run({ ssExtraDays: 5 }).k.onHandValue).toBeGreaterThan(run().k.onHandValue);
  });

  it('a plant outage creates shortage at that plant', () => {
    const { r } = run({ outage: { siteId: 'TR-BMP', startWeek: 4, weeks: 3, lossPct: 100 } });
    expect(r.byId['TR-BMP'].shortage.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });

  it('shifting volume away from an outage plant reduces its shortage', () => {
    const outage = { siteId: 'TR-BMP', startWeek: 4, weeks: 3, lossPct: 100 };
    const a = run({ outage }).r.byId['TR-BMP'].shortage.reduce((x, y) => x + y, 0);
    const b = run({
      outage,
      sourcing: [{ product: 'bumpers', fromSite: 'TR-BMP', toSite: 'PL-BMP', pct: 100 }],
    }).r.byId['TR-BMP'].shortage.reduce((x, y) => x + y, 0);
    expect(b).toBeLessThan(a);
  });

  it('longer sea lanes add in-transit inventory and a transit gap when sourcing across regions', () => {
    const sourcing = [{ product: 'bumpers' as const, fromSite: 'FR-BMP', toSite: 'CN-BMP', pct: 30 }];
    const calm = run({ sourcing }).k;
    const jam = run({ sourcing, extraSeaWeeks: 3 }).k;
    expect(jam.pipelineValue).toBeGreaterThan(calm.pipelineValue);
    expect(jam.shortageUnits).toBeGreaterThan(calm.shortageUnits);
    // safety stock bridges the gap
    const buffered = run({ sourcing, extraSeaWeeks: 3, ssExtraDays: 8 }).k;
    expect(buffered.shortageUnits).toBeLessThan(jam.shortageUnits);
  });

  it('manual overrides are respected and clamped to capacity', () => {
    const base = run().r.byId['FR-BMP'];
    const { r } = run({ overrides: { 'FR-BMP:2': 1, 'FR-BMP:3': 10 ** 9 } });
    const s = r.byId['FR-BMP'];
    expect(s.prod[2]).toBe(1);
    expect(s.prod[3]).toBeCloseTo(s.cap[3], 4);
    expect(s.overridden[2]).toBe(true);
    expect(base.overridden[2]).toBe(false);
  });

  it('sourcing shares always sum to the original demand', () => {
    const { r } = run({
      sourcing: [
        { product: 'bumpers', fromSite: 'FR-BMP', toSite: 'ES-BMP', pct: 40 },
        { product: 'bumpers', fromSite: 'ES-BMP', toSite: 'DE-BMP', pct: 20 },
      ],
    });
    const nodeShare: Record<string, number> = {};
    for (const s of r.sites) for (const f of s.flows) nodeShare[f.nodeId] = (nodeShare[f.nodeId] ?? 0) + f.share;
    for (const v of Object.values(nodeShare)) expect(v).toBeCloseTo(1, 6);
  });
});

describe('scenario sharing', () => {
  it('round-trips through the URL encoding', () => {
    const sc = { ...DEFAULT_SCENARIO, demandPct: 12, overrides: { 'FR-BMP:1': 500 } };
    expect(decodeScenario(encodeScenario(sc))).toEqual(sc);
    expect(decodeScenario('not-valid')).toBeNull();
  });
});
