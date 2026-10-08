import {
  BASE_DEMAND,
  CAPACITY_FACTOR,
  COUNTRIES,
  COUNTRY_BY_CODE,
  DAYS_PER_WEEK,
  DEMAND_FACTOR,
  FIRM_WEEKS,
  HORIZON,
  HORIZON_START,
  LOOKAHEAD,
  PRODUCTS,
  PRODUCT_BY_ID,
  US_THANKSGIVING_FACTOR,
  US_THANKSGIVING_WEEK,
} from './config';
import { baseAllocation } from '../engine/allocation';
import type { CountryCode, DemandNode, Model, ProductId, Site, WeekInfo } from '../types';

interface SiteSpec {
  country: CountryCode;
  product: ProductId;
  lines: number;
  shifts: number;
  oee: number;
  /** Baseline average utilisation we want this site to run at (drives the mock line rate). */
  targetUtil: number;
}

/**
 * 35 representative plants. Hot spots (target >= 0.93) are deliberate so that the
 * baseline already has something to discuss: MX tailgates, MX headlamps, TR bumpers,
 * CN bumpers, FR fuel tanks.
 */
const SITE_SPECS: SiteSpec[] = [
  // Bumpers
  { country: 'US', product: 'bumpers', lines: 3, shifts: 2, oee: 0.8, targetUtil: 0.87 },
  { country: 'MX', product: 'bumpers', lines: 5, shifts: 3, oee: 0.82, targetUtil: 0.93 },
  { country: 'FR', product: 'bumpers', lines: 4, shifts: 2, oee: 0.8, targetUtil: 0.89 },
  { country: 'DE', product: 'bumpers', lines: 4, shifts: 2, oee: 0.83, targetUtil: 0.91 },
  { country: 'ES', product: 'bumpers', lines: 3, shifts: 2, oee: 0.8, targetUtil: 0.85 },
  { country: 'PL', product: 'bumpers', lines: 3, shifts: 2, oee: 0.81, targetUtil: 0.92 },
  { country: 'TR', product: 'bumpers', lines: 3, shifts: 3, oee: 0.78, targetUtil: 0.97 },
  { country: 'CN', product: 'bumpers', lines: 6, shifts: 3, oee: 0.84, targetUtil: 0.97 },
  { country: 'TH', product: 'bumpers', lines: 2, shifts: 2, oee: 0.8, targetUtil: 0.81 },
  // Tailgates
  { country: 'MX', product: 'tailgates', lines: 3, shifts: 3, oee: 0.8, targetUtil: 0.97 },
  { country: 'FR', product: 'tailgates', lines: 3, shifts: 2, oee: 0.82, targetUtil: 0.89 },
  { country: 'DE', product: 'tailgates', lines: 2, shifts: 2, oee: 0.82, targetUtil: 0.87 },
  { country: 'CN', product: 'tailgates', lines: 3, shifts: 2, oee: 0.8, targetUtil: 0.93 },
  // Fuel tanks
  { country: 'US', product: 'fuel_tanks', lines: 4, shifts: 2, oee: 0.84, targetUtil: 0.88 },
  { country: 'MX', product: 'fuel_tanks', lines: 4, shifts: 3, oee: 0.83, targetUtil: 0.91 },
  { country: 'FR', product: 'fuel_tanks', lines: 5, shifts: 2, oee: 0.83, targetUtil: 0.97 },
  { country: 'DE', product: 'fuel_tanks', lines: 4, shifts: 2, oee: 0.85, targetUtil: 0.86 },
  { country: 'PL', product: 'fuel_tanks', lines: 4, shifts: 2, oee: 0.82, targetUtil: 0.93 },
  { country: 'CN', product: 'fuel_tanks', lines: 5, shifts: 3, oee: 0.84, targetUtil: 0.9 },
  { country: 'TH', product: 'fuel_tanks', lines: 2, shifts: 2, oee: 0.82, targetUtil: 0.77 },
  // Headlamps
  { country: 'MX', product: 'headlamps', lines: 4, shifts: 3, oee: 0.78, targetUtil: 0.97 },
  { country: 'FR', product: 'headlamps', lines: 4, shifts: 2, oee: 0.8, targetUtil: 0.9 },
  { country: 'DE', product: 'headlamps', lines: 4, shifts: 2, oee: 0.8, targetUtil: 0.88 },
  { country: 'PL', product: 'headlamps', lines: 3, shifts: 2, oee: 0.79, targetUtil: 0.83 },
  { country: 'CN', product: 'headlamps', lines: 5, shifts: 3, oee: 0.8, targetUtil: 0.95 },
  // Modules (sequenced, low stock)
  { country: 'MX', product: 'modules', lines: 3, shifts: 3, oee: 0.85, targetUtil: 0.91 },
  { country: 'FR', product: 'modules', lines: 4, shifts: 2, oee: 0.85, targetUtil: 0.89 },
  { country: 'ES', product: 'modules', lines: 2, shifts: 2, oee: 0.85, targetUtil: 0.85 },
  { country: 'UK', product: 'modules', lines: 2, shifts: 2, oee: 0.85, targetUtil: 0.79 },
  { country: 'MA', product: 'modules', lines: 2, shifts: 2, oee: 0.84, targetUtil: 0.84 },
  { country: 'TR', product: 'modules', lines: 2, shifts: 2, oee: 0.84, targetUtil: 0.93 },
  // Cockpits (JIS, very low stock)
  { country: 'MX', product: 'cockpits', lines: 3, shifts: 3, oee: 0.86, targetUtil: 0.9 },
  { country: 'FR', product: 'cockpits', lines: 2, shifts: 2, oee: 0.86, targetUtil: 0.87 },
  { country: 'UK', product: 'cockpits', lines: 1, shifts: 2, oee: 0.86, targetUtil: 0.82 },
  { country: 'MA', product: 'cockpits', lines: 1, shifts: 2, oee: 0.85, targetUtil: 0.8 },
];

const PRODUCT_CODE: Record<ProductId, string> = {
  bumpers: 'BMP',
  tailgates: 'TGT',
  fuel_tanks: 'FTK',
  headlamps: 'HLP',
  modules: 'MOD',
  cockpits: 'CPT',
};

const HOURS_PER_SHIFT = 7.5;

/** Small deterministic PRNG so every visitor sees the same "mock" numbers. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function buildWeeks(): WeekInfo[] {
  const start = new Date(`${HORIZON_START}T00:00:00Z`);
  return Array.from({ length: HORIZON }, (_, i) => {
    const d = new Date(start.getTime() + i * 7 * 86400000);
    return {
      index: i,
      label: `W${String(isoWeek(d)).padStart(2, '0')}`,
      start: d.toISOString().slice(0, 10),
      firm: i < FIRM_WEEKS,
    };
  });
}

function buildDemand(): DemandNode[] {
  const nodes: DemandNode[] = [];
  const len = HORIZON + LOOKAHEAD;
  for (const p of PRODUCTS) {
    const byCountry = BASE_DEMAND[p.id];
    for (const code of Object.keys(byCountry) as CountryCode[]) {
      const base = byCountry[code] as number;
      const country = COUNTRY_BY_CODE[code];
      const rand = mulberry32(hashString(`${p.id}@${code}`));
      const trend = (rand() * 2 - 1) * 0.006; // program ramp-up / ramp-down per week
      const weekly: number[] = [];
      for (let w = 0; w < len; w++) {
        let f = DEMAND_FACTOR[country.region][w];
        if (code === 'US' && w === US_THANKSGIVING_WEEK) f *= US_THANKSGIVING_FACTOR;
        const amp = w < FIRM_WEEKS ? 0.015 : 0.045;
        const noise = 1 + (rand() * 2 - 1) * amp;
        weekly.push(Math.round(base * f * (1 + trend * w) * noise));
      }
      nodes.push({ id: `${p.id}@${code}`, product: p.id, country: code, region: country.region, weekly });
    }
  }
  return nodes;
}

export function buildModel(): Model {
  const weeks = buildWeeks();
  const demand = buildDemand();

  // First pass: placeholder sites so we can see how much volume each plant serves.
  const draft: Site[] = SITE_SPECS.map((s) => ({
    id: `${s.country}-${PRODUCT_CODE[s.product]}`,
    name: `${COUNTRY_BY_CODE[s.country].name} · ${PRODUCT_BY_ID[s.product].name}`,
    country: s.country,
    region: COUNTRY_BY_CODE[s.country].region,
    product: s.product,
    lines: s.lines,
    shifts: s.shifts,
    hoursPerShift: HOURS_PER_SHIFT,
    daysPerWeek: DAYS_PER_WEEK,
    unitsPerLineHour: 1,
    oee: s.oee,
  }));

  const alloc = baseAllocation(draft, demand);
  const avgLoad: Record<string, number> = {};
  for (const n of demand) {
    const avg = n.weekly.slice(0, 4).reduce((a, b) => a + b, 0) / 4;
    for (const sh of alloc[n.id]) avgLoad[sh.siteId] = (avgLoad[sh.siteId] ?? 0) + avg * sh.share;
  }

  const sites: Site[] = draft.map((s, i) => {
    const spec = SITE_SPECS[i];
    const hoursPerWeek = s.lines * s.shifts * s.hoursPerShift * s.daysPerWeek * s.oee;
    const rate = (avgLoad[s.id] ?? 0) / (hoursPerWeek * spec.targetUtil);
    return { ...s, unitsPerLineHour: Math.max(0.1, Math.round(rate * 10) / 10) };
  });

  const openingStock: Record<string, number> = {};
  for (const s of sites) {
    const prod = PRODUCT_BY_ID[s.product];
    openingStock[s.id] = Math.round(((avgLoad[s.id] ?? 0) / DAYS_PER_WEEK) * prod.openDays);
  }

  return {
    horizon: HORIZON,
    weeks,
    products: PRODUCTS,
    countries: COUNTRIES,
    sites,
    demand,
    capFactor: CAPACITY_FACTOR,
    openingStock,
  };
}

export const MODEL: Model = buildModel();
