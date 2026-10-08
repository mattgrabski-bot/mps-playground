import { COUNTRIES, PRODUCTS, REGIONS, REGION_COLORS, PRODUCT_BY_ID } from '../data/config';
import type { Model, Result, SiteResult } from '../types';

export type GroupBy = 'region' | 'country' | 'product' | 'site';

export interface Row {
  key: string;
  label: string;
  sublabel?: string;
  color: string;
  sites: SiteResult[];
  req: number[];
  prod: number[];
  cap: number[];
  need: number[];
  poh: number[];
  ss: number[];
  util: number[];
  load: number[];
  cover: number[];
  short: number[];
  avgUtil: number;
  peakLoad: number;
  shortTotal: number;
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

export function makeRow(
  key: string,
  label: string,
  color: string,
  sites: SiteResult[],
  T: number,
  sublabel?: string,
): Row {
  const col = (f: (s: SiteResult, t: number) => number) =>
    Array.from({ length: T }, (_, t) => sites.reduce((a, s) => a + f(s, t), 0));
  const req = col((s, t) => s.req[t]);
  const prod = col((s, t) => s.prod[t]);
  const cap = col((s, t) => s.cap[t]);
  const need = col((s, t) => s.need[t]);
  const poh = col((s, t) => Math.max(0, s.poh[t]));
  const ss = col((s, t) => s.ss[t]);
  const short = col((s, t) => s.shortage[t]);
  const fwd = col((s, t) => (s.req[t] + s.req[t + 1]) / 2);
  const util = prod.map((p, t) => (cap[t] > 0 ? p / cap[t] : 0));
  const load = need.map((n, t) => (cap[t] > 0 ? n / cap[t] : 0));
  const cover = poh.map((p, t) => (fwd[t] > 0 ? p / fwd[t] : 0));
  return {
    key,
    label,
    sublabel,
    color,
    sites,
    req,
    prod,
    cap,
    need,
    poh,
    ss,
    util,
    load,
    cover,
    short,
    avgUtil: sum(cap) > 0 ? sum(prod) / sum(cap) : 0,
    peakLoad: Math.max(0, ...load),
    shortTotal: sum(short),
  };
}

export function aggregate(
  model: Model,
  result: Result,
  by: GroupBy,
  filter: (s: SiteResult) => boolean = () => true,
): Row[] {
  const T = model.horizon;
  const sites = result.sites.filter(filter);
  const rows: Row[] = [];
  if (by === 'region') {
    for (const r of REGIONS) {
      const ss = sites.filter((s) => s.site.region === r);
      if (ss.length) rows.push(makeRow(r, r, REGION_COLORS[r], ss, T, `${ss.length} plants`));
    }
  } else if (by === 'country') {
    for (const r of REGIONS) {
      for (const c of COUNTRIES.filter((x) => x.region === r)) {
        const ss = sites.filter((s) => s.site.country === c.code);
        if (ss.length) rows.push(makeRow(c.code, c.name, REGION_COLORS[r], ss, T, `${ss.length} plants`));
      }
    }
  } else if (by === 'product') {
    for (const p of PRODUCTS) {
      const ss = sites.filter((s) => s.site.product === p.id);
      if (ss.length) rows.push(makeRow(p.id, p.name, p.color, ss, T, `${ss.length} plants`));
    }
  } else {
    for (const p of PRODUCTS) {
      for (const r of REGIONS) {
        for (const s of sites.filter((x) => x.site.product === p.id && x.site.region === r)) {
          rows.push(makeRow(s.site.id, s.site.id, PRODUCT_BY_ID[s.site.product].color, [s], T, s.site.name));
        }
      }
    }
  }
  return rows;
}
