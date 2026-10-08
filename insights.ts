import type { Kpis, Model, Result } from '../types';

export interface Insight {
  level: 'risk' | 'watch' | 'good' | 'info';
  title: string;
  detail: string;
  siteId?: string;
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');
const eur = (n: number) => (Math.abs(n) >= 1e6 ? `€${(n / 1e6).toFixed(1)}m` : `€${Math.round(n / 1e3)}k`);

/** Plain-language findings for executives, generated from the numbers. */
export function buildInsights(model: Model, r: Result, k: Kpis, base: Kpis): Insight[] {
  const out: Insight[] = [];
  const wk = (t: number) => model.weeks[t].label;

  // 1. Stock-outs
  const risky = r.sites
    .map((s) => ({ s, total: s.shortage.reduce((a, b) => a + b, 0) }))
    .filter((x) => x.total > 50)
    .sort((a, b) => b.total - a.total);
  for (const { s, total } of risky.slice(0, 3)) {
    const first = s.shortage.findIndex((x) => x > 0.5);
    const gap = s.gapShort.reduce((a, b) => a + b, 0);
    const why =
      gap > total * 0.5
        ? 'Goods in transit cannot arrive in time; extra safety stock would bridge the gap.'
        : s.cap[first] < 1
          ? 'The plant is down in that week, so volume has to come from elsewhere.'
          : 'Capacity is exhausted and there is no earlier week left to pre-build in.';
    out.push({
      level: 'risk',
      title: `${s.site.name}: ${fmt(total)} units short from ${wk(first)}`,
      detail: why,
      siteId: s.site.id,
    });
  }

  // 2. Overloaded but absorbed by pre-build
  const absorbed = r.sites
    .filter((s) => s.status === 'watch')
    .map((s) => {
      let worst = 0;
      let at = 0;
      s.need.forEach((n, t) => {
        const u = s.cap[t] > 0 ? n / s.cap[t] : 0;
        if (u > worst) {
          worst = u;
          at = t;
        }
      });
      return { s, worst, at };
    })
    .filter((x) => x.worst > 1.0)
    .sort((a, b) => b.worst - a.worst);
  for (const { s, worst, at } of absorbed.slice(0, 2)) {
    out.push({
      level: 'watch',
      title: `${s.site.name} needs ${Math.round(worst * 100)}% of capacity in ${wk(at)}`,
      detail: 'No stock-out yet because the plan pre-builds in earlier weeks. It is fragile: one bad week breaks it.',
      siteId: s.site.id,
    });
  }

  // 3. Spare capacity to exploit
  const idle = r.sites
    .map((s) => ({
      s,
      util: s.cap.reduce((a, b) => a + b, 0) > 0 ? s.prod.reduce((a, b) => a + b, 0) / s.cap.reduce((a, b) => a + b, 0) : 0,
    }))
    .filter((x) => x.util < 0.7)
    .sort((a, b) => a.util - b.util);
  if (idle.length > 0 && (risky.length > 0 || absorbed.length > 0)) {
    out.push({
      level: 'info',
      title: `Spare capacity: ${idle
        .slice(0, 3)
        .map((x) => `${x.s.site.id} ${Math.round(x.util * 100)}%`)
        .join(', ')}`,
      detail: 'Moving some volume to these plants (Sourcing lever) can relieve the hot spots, at the price of longer lanes.',
    });
  }

  // 4. Money
  const dInv = k.inventoryValue - base.inventoryValue;
  if (Math.abs(dInv) > 0.05 * base.inventoryValue) {
    out.push({
      level: dInv > 0 ? 'watch' : 'info',
      title: `Inventory ${dInv > 0 ? 'up' : 'down'} ${eur(Math.abs(dInv))} vs baseline`,
      detail: `${Math.round((dInv / base.inventoryValue) * 100)}% change including goods in transit. Safety stock, longer lanes and pre-build all show up here.`,
    });
  }

  if (out.length === 0 || (risky.length === 0 && absorbed.length === 0)) {
    out.unshift({
      level: 'good',
      title: 'Plan is feasible',
      detail: `No stock-outs across ${r.sites.length} plants. Service level ${(k.serviceLevel * 100).toFixed(1)}%.`,
    });
  }
  return out.slice(0, 6);
}
