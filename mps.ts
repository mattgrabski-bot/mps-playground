import { DAYS_PER_WEEK, LOOKAHEAD, PRODUCT_BY_ID } from '../data/config';
import type { Flow, Model, Result, Scenario, Site, SiteResult, SiteStatus } from '../types';
import { applyShifts, baseAllocation, laneBaseLt, sameRegion } from './allocation';

const EPS = 0.5;

/** Nominal (baseline) weekly capacity of a site before calendar, levers and outages. */
export function nominalWeeklyCapacity(s: Site): number {
  return s.lines * s.shifts * s.hoursPerShift * s.daysPerWeek * s.unitsPerLineHour * s.oee;
}

export function shiftFactor(s: Site): number {
  // 2 -> 3 shifts = +50%; plants already on 3 shifts add a Saturday = +20%.
  return s.shifts < 3 ? (s.shifts + 1) / s.shifts : 6 / 5;
}

function demandMultiplier(sc: Scenario, region: string, product: string): number {
  const regionOk = sc.demandRegion === 'All' || sc.demandRegion === region;
  const productOk = sc.demandProduct === 'All' || sc.demandProduct === product;
  return regionOk && productOk ? 1 + sc.demandPct / 100 : 1;
}

export function computeSiteCapacity(model: Model, sc: Scenario, s: Site): number[] {
  const nominal = nominalWeeklyCapacity(s);
  const levers =
    sc.capacityRegion === 'All' || sc.capacityRegion === s.region
      ? (sc.addShift ? shiftFactor(s) : 1) * (1 + sc.overtimePct / 100)
      : 1;
  return Array.from({ length: model.horizon }, (_, t) => {
    let cap = nominal * model.capFactor[s.region][t] * levers;
    const o = sc.outage;
    if (o && o.siteId === s.id && t >= o.startWeek && t < o.startWeek + o.weeks) {
      cap *= 1 - o.lossPct / 100;
    }
    return cap;
  });
}

/**
 * The MPS engine. For every plant:
 *   1. Requirement = customer demand on each lane, shifted back by transit time.
 *   2. Safety stock target = N days of the next two weeks' requirement.
 *   3. Plan production just-in-time (lot-for-lot) to hold stock >= safety stock.
 *   4. If a week needs more than capacity, pre-build in earlier weeks with spare capacity.
 *   5. Whatever cannot be built shows up as a shortage.
 */
export function computeMps(model: Model, sc: Scenario): Result {
  const T = model.horizon;
  const nodesById = Object.fromEntries(model.demand.map((n) => [n.id, n]));
  const alloc = applyShifts(baseAllocation(model.sites, model.demand), model.demand, sc.sourcing);

  const sites: SiteResult[] = [];
  const pipelineUnits: Record<string, number> = {};

  for (const site of model.sites) {
    const product = PRODUCT_BY_ID[site.product];
    const ssDays = Math.max(0, product.ssDays + sc.ssExtraDays);

    // ---- 1. lanes and requirement ---------------------------------------------------------
    const flows: Flow[] = [];
    const req = new Array<number>(T + 1).fill(0);
    const gapShort = new Array<number>(T).fill(0);
    let pipeline = 0;

    for (const n of model.demand) {
      if (n.product !== site.product) continue;
      const share = alloc[n.id].find((x) => x.siteId === site.id)?.share ?? 0;
      if (share <= 0) continue;
      const baseLt = laneBaseLt(n.country, site.country);
      const extra =
        site.country === n.country ? 0 : sameRegion(site.country, n.country) ? sc.extraRegionalWeeks : sc.extraSeaWeeks;
      const lt = baseLt + extra;
      const mult = demandMultiplier(sc, n.region, n.product);
      const d = (w: number) => (n.weekly[w] ?? 0) * mult * share;

      for (let t = 0; t <= T; t++) {
        const w = t + lt;
        if (w < n.weekly.length) req[t] += d(w);
      }

      // Transit gap: customer weeks [baseLt, lt) can no longer be shipped in time.
      if (extra > 0) {
        let gap = 0;
        for (let w = baseLt; w < lt && w < T; w++) gap += d(w);
        const coverUnits = (ssDays / DAYS_PER_WEEK) * d(baseLt);
        const uncovered = Math.max(0, gap - coverUnits);
        const span = Math.max(1, Math.min(lt, T) - baseLt);
        for (let w = baseLt; w < lt && w < T; w++) gapShort[w] += uncovered / span;
      }

      let avg = 0;
      for (let w = 0; w < T; w++) avg += d(w);
      avg /= T;
      pipeline += avg * lt;
      flows.push({ nodeId: n.id, nodeCountry: n.country, share, lt, baseLt, avgWeekly: avg });
    }
    pipelineUnits[site.id] = pipeline;
    void nodesById;

    // ---- 2. safety stock and capacity ------------------------------------------------------
    const ss = Array.from({ length: T }, (_, t) => (ssDays / DAYS_PER_WEEK) * ((req[t] + req[t + 1]) / 2));
    const cap = computeSiteCapacity(model, sc, site);
    const opening = model.openingStock[site.id] ?? 0;

    // ---- 3. unconstrained (lot-for-lot) load for the RCCP view -----------------------------
    const need = new Array<number>(T).fill(0);
    let lfl = opening;
    for (let t = 0; t < T; t++) {
      need[t] = Math.max(0, req[t] + ss[t] - lfl);
      lfl = lfl + need[t] - req[t];
    }

    // ---- 4. constrained plan with pre-build -------------------------------------------------
    const prod = new Array<number>(T).fill(0);
    const fixed = new Array<boolean>(T).fill(false);
    for (let t = 0; t < T; t++) {
      const key = `${site.id}:${t}`;
      if (sc.overrides[key] !== undefined) {
        prod[t] = Math.max(0, Math.min(sc.overrides[key], cap[t]));
        fixed[t] = true;
      }
    }
    const poh = new Array<number>(T).fill(0);
    for (let t = 0; t < T; t++) {
      const prev = t === 0 ? opening : poh[t - 1];
      let cur = prev + prod[t] - req[t];
      let deficit = ss[t] - cur;
      if (deficit > EPS && !fixed[t]) {
        const add = Math.min(deficit, cap[t] - prod[t]);
        if (add > 0) {
          prod[t] += add;
          cur += add;
          deficit -= add;
        }
      }
      for (let k = t - 1; k >= 0 && deficit > EPS; k--) {
        if (fixed[k]) continue;
        const add = Math.min(cap[k] - prod[k], deficit);
        if (add <= 0) continue;
        prod[k] += add;
        deficit -= add;
        cur += add;
        for (let j = k; j < t; j++) poh[j] += add;
      }
      poh[t] = cur;
    }

    // ---- 5. shortages ----------------------------------------------------------------------
    const stockout = new Array<number>(T).fill(0);
    let prevBacklog = 0;
    for (let t = 0; t < T; t++) {
      const backlog = Math.max(0, -poh[t]);
      stockout[t] = Math.max(0, backlog - prevBacklog);
      prevBacklog = backlog;
    }
    const shortage = stockout.map((x, t) => x + gapShort[t]);

    let status: SiteStatus = 'ok';
    if (shortage.some((x) => x > EPS)) status = 'risk';
    else if (poh.some((x, t) => x < ss[t] - EPS) || need.some((x, t) => x > cap[t] * 1.0001 + EPS)) status = 'watch';

    sites.push({
      site,
      flows,
      req,
      ss,
      cap,
      need,
      prod,
      overridden: fixed,
      poh,
      stockout,
      gapShort,
      shortage,
      opening,
      status,
    });
  }

  return { sites, byId: Object.fromEntries(sites.map((s) => [s.site.id, s])), pipelineUnits };
}

export const MAX_LOOKAHEAD = LOOKAHEAD;
