import type { Country, CountryCode, ProductId, Product, Region } from '../types';

/** Start of the 12-week horizon (a Monday). Change this to roll the calendar. */
export const HORIZON_START = '2026-10-12';
export const HORIZON = 12;
/** Extra demand weeks generated beyond the horizon so transit lead times can look ahead. */
export const LOOKAHEAD = 12;
export const FIRM_WEEKS = 4;

export const REGIONS: Region[] = ['Americas', 'Europe', 'Asia'];

export const REGION_COLORS: Record<Region, string> = {
  Americas: '#f59e0b',
  Europe: '#6366f1',
  Asia: '#14b8a6',
};

// MA (Morocco) and TR (Turkey) are mapped to Europe, as is common for
// "Europe & Africa" supply networks. Change here if your org defines it differently.
export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', region: 'Americas', lon: -98, lat: 39 },
  { code: 'MX', name: 'Mexico', region: 'Americas', lon: -102, lat: 23 },
  { code: 'MA', name: 'Morocco', region: 'Europe', lon: -7, lat: 32 },
  { code: 'FR', name: 'France', region: 'Europe', lon: 2, lat: 46 },
  { code: 'UK', name: 'United Kingdom', region: 'Europe', lon: -2, lat: 54 },
  { code: 'ES', name: 'Spain', region: 'Europe', lon: -4, lat: 40 },
  { code: 'DE', name: 'Germany', region: 'Europe', lon: 10, lat: 51 },
  { code: 'PL', name: 'Poland', region: 'Europe', lon: 19, lat: 52 },
  { code: 'TR', name: 'Turkey', region: 'Europe', lon: 35, lat: 39 },
  { code: 'CN', name: 'China', region: 'Asia', lon: 104, lat: 35 },
  { code: 'TH', name: 'Thailand', region: 'Asia', lon: 101, lat: 15 },
];

export const COUNTRY_BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c])) as Record<
  CountryCode,
  Country
>;

export const PRODUCTS: Product[] = [
  { id: 'bumpers', name: 'Bumpers', unitValue: 95, ssDays: 3, openDays: 4, color: '#6366f1' },
  { id: 'tailgates', name: 'Tailgates', unitValue: 285, ssDays: 4, openDays: 5, color: '#8b5cf6' },
  { id: 'fuel_tanks', name: 'Fuel tanks', unitValue: 140, ssDays: 4, openDays: 5, color: '#f59e0b' },
  { id: 'headlamps', name: 'Headlamps', unitValue: 215, ssDays: 6, openDays: 8, color: '#06b6d4' },
  { id: 'modules', name: 'Modules', unitValue: 340, ssDays: 1.5, openDays: 2, color: '#14b8a6' },
  { id: 'cockpits', name: 'Cockpits', unitValue: 470, ssDays: 1, openDays: 1.5, color: '#ec4899' },
];

export const PRODUCT_BY_ID = Object.fromEntries(PRODUCTS.map((p) => [p.id, p])) as Record<
  ProductId,
  Product
>;

/**
 * Weekly customer demand (units) by product and demand country.
 * Demand exists where OEM assembly plants are; it is served by plants (see sites.ts).
 */
export const BASE_DEMAND: Record<ProductId, Partial<Record<CountryCode, number>>> = {
  bumpers: { US: 9000, MX: 14000, FR: 8500, UK: 4500, ES: 7000, DE: 9500, PL: 5000, TR: 6000, CN: 16000, TH: 5500, MA: 3000 },
  tailgates: { US: 3500, MX: 6500, FR: 3200, UK: 1800, DE: 3800, ES: 2200, CN: 5000 },
  fuel_tanks: { US: 11000, MX: 12500, FR: 8000, UK: 4200, DE: 9000, ES: 4500, PL: 5000, CN: 15000, TH: 6000, TR: 4500 },
  headlamps: { US: 7000, MX: 10000, FR: 8000, DE: 9500, PL: 6000, ES: 4500, CN: 14000 },
  modules: { MX: 5500, FR: 4500, ES: 3500, UK: 2800, MA: 3000, TR: 3200, DE: 4000 },
  cockpits: { US: 3000, MX: 4800, FR: 3500, ES: 2500, UK: 2200, MA: 2000 },
};

/**
 * Default sourcing rule: a demand country is served by the first country in its
 * preference list that has a plant for the product.
 */
export const SOURCING_PREFERENCE: Record<CountryCode, CountryCode[]> = {
  US: ['US', 'MX'],
  MX: ['MX', 'US'],
  MA: ['MA', 'ES', 'FR'],
  FR: ['FR', 'DE', 'ES'],
  UK: ['UK', 'FR', 'DE'],
  ES: ['ES', 'FR'],
  DE: ['DE', 'FR', 'PL'],
  PL: ['PL', 'DE'],
  TR: ['TR', 'PL', 'DE'],
  CN: ['CN', 'TH'],
  TH: ['TH', 'CN'],
};

/** Seasonality of customer demand by region. Index 0 = first horizon week (W42). */
export const DEMAND_FACTOR: Record<Region, number[]> = {
  // W42..W53 then 2027 W1.. : Christmas shutdown at W52/W53, restart ramp at W1
  Americas: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.55, 0.35, 0.88, 0.97, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  Europe: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.55, 0.35, 0.88, 0.97, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  Asia: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
};

/** US Thanksgiving week (W48) dip, on top of the regional factor. */
export const US_THANKSGIVING_WEEK = 6;
export const US_THANKSGIVING_FACTOR = 0.82;

/** Plant capacity factor (calendar) by region: reduced schedules over the year-end break. */
export const CAPACITY_FACTOR: Record<Region, number[]> = {
  Americas: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.8, 0.55, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  Europe: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.8, 0.55, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  Asia: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
};

/** Transit time (weeks) between countries in the baseline network. */
export function baseLeadTimeWeeks(from: CountryCode, to: CountryCode): number {
  if (from === to) return 0;
  const a = COUNTRY_BY_CODE[from].region;
  const b = COUNTRY_BY_CODE[to].region;
  if (a === b) return 1;
  if ((a === 'Americas' && b === 'Europe') || (a === 'Europe' && b === 'Americas')) return 4;
  return 5;
}

export const DAYS_PER_WEEK = 5;
