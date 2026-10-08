import { PRODUCT_BY_ID } from '../data/config';
import type { Kpis, Model, Result, Scenario } from '../types';
import { nominalWeeklyCapacity, shiftFactor } from './mps';

export function computeKpis(model: Model, sc: Scenario, r: Result): Kpis {
  const T = model.horizon;
  let revenue = 0;
  let demandUnits = 0;
  let shortageUnits = 0;
  let revenueAtRisk = 0;
  let prodSum = 0;
  let capSum = 0;
  let peakUtil = 0;
  let overload = 0;
  let onHandValue = 0;
  let onHandUnits = 0;
  let reqUnits = 0;
  let pipelineValue = 0;
  let actionCost = 0;

  for (const s of r.sites) {
    const v = PRODUCT_BY_ID[s.site.product].unitValue;
    const nominal = nominalWeeklyCapacity(s.site);
    const regionOk = sc.capacityRegion === 'All' || sc.capacityRegion === s.site.region;
    for (let t = 0; t < T; t++) {
      revenue += s.req[t] * v;
      demandUnits += s.req[t];
      reqUnits += s.req[t];
      shortageUnits += s.shortage[t];
      revenueAtRisk += s.shortage[t] * v;
      prodSum += s.prod[t];
      capSum += s.cap[t];
      if (s.cap[t] > 0) peakUtil = Math.max(peakUtil, s.prod[t] / s.cap[t]);
      if (s.need[t] > s.cap[t] * 1.0001 + 0.5) overload++;
      const oh = Math.max(0, s.poh[t]);
      onHandValue += oh * v;
      onHandUnits += oh;
      if (regionOk) {
        const open = model.capFactor[s.site.region][t];
        // Illustrative cost model: extra shift = EUR 4.5k per line per week;
        // overtime = 6% of the unit value on the extra units produced.
        if (sc.addShift) actionCost += s.site.lines * 4500 * open;
        if (sc.overtimePct > 0) {
          const base = nominal * open * (sc.addShift ? shiftFactor(s.site) : 1);
          actionCost += (sc.overtimePct / 100) * base * 0.06 * v;
        }
      }
    }
    pipelineValue += (r.pipelineUnits[s.site.id] ?? 0) * v;
  }

  onHandValue /= T;
  onHandUnits /= T;
  const avgReq = reqUnits / T;

  return {
    revenue,
    demandUnits,
    shortageUnits,
    revenueAtRisk,
    serviceLevel: revenue > 0 ? Math.max(0, 1 - revenueAtRisk / revenue) : 1,
    avgUtil: capSum > 0 ? prodSum / capSum : 0,
    peakUtil,
    overloadSiteWeeks: overload,
    inventoryValue: onHandValue + pipelineValue,
    onHandValue,
    pipelineValue,
    coverWeeks: avgReq > 0 ? onHandUnits / avgReq : 0,
    actionCost,
  };
}
