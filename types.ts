export type Region = 'Americas' | 'Europe' | 'Asia';
export type ProductId =
  | 'bumpers'
  | 'tailgates'
  | 'fuel_tanks'
  | 'headlamps'
  | 'modules'
  | 'cockpits';
export type CountryCode =
  | 'US'
  | 'MX'
  | 'MA'
  | 'FR'
  | 'UK'
  | 'ES'
  | 'DE'
  | 'PL'
  | 'CN'
  | 'TH'
  | 'TR';

export interface Product {
  id: ProductId;
  name: string;
  /** Mock selling price per unit, EUR. Also used to value inventory. */
  unitValue: number;
  /** Default safety stock, in working days of cover. */
  ssDays: number;
  /** Opening finished-goods stock, in working days of cover. */
  openDays: number;
  color: string;
}

export interface Country {
  code: CountryCode;
  name: string;
  region: Region;
  lon: number;
  lat: number;
}

export interface Site {
  id: string; // e.g. "FR-BMP"
  name: string; // e.g. "France · Bumpers"
  country: CountryCode;
  region: Region;
  product: ProductId;
  lines: number;
  shifts: number;
  hoursPerShift: number;
  daysPerWeek: number;
  unitsPerLineHour: number;
  oee: number;
}

export interface DemandNode {
  id: string; // e.g. "bumpers@FR"
  product: ProductId;
  country: CountryCode;
  region: Region;
  /** Weekly customer demand (units), index 0 = first horizon week. Includes look-ahead weeks. */
  weekly: number[];
}

export interface WeekInfo {
  index: number; // 0..11
  label: string; // "W42"
  start: string; // ISO date of Monday
  /** First four weeks are firm customer call-offs, the rest are forecast. */
  firm: boolean;
}

export interface Model {
  horizon: number;
  weeks: WeekInfo[];
  products: Product[];
  countries: Country[];
  sites: Site[];
  demand: DemandNode[];
  /** Calendar capacity factor per region per week (shutdowns, holidays). Length = horizon + lookahead. */
  capFactor: Record<Region, number[]>;
  /** Opening finished-goods stock per site (units). */
  openingStock: Record<string, number>;
}

export interface SourceShift {
  product: ProductId;
  fromSite: string;
  toSite: string;
  pct: number; // 0..100 of the volume currently served by fromSite
}

export interface Outage {
  siteId: string;
  startWeek: number; // 0-based week index
  weeks: number;
  lossPct: number; // 0..100
}

export interface Scenario {
  name: string;
  demandPct: number;
  demandRegion: Region | 'All';
  demandProduct: ProductId | 'All';
  addShift: boolean;
  overtimePct: number;
  capacityRegion: Region | 'All';
  outage: Outage | null;
  extraSeaWeeks: number;
  extraRegionalWeeks: number;
  ssExtraDays: number;
  sourcing: SourceShift[];
  /** Manual planned-production overrides, key = `${siteId}:${weekIndex}`. */
  overrides: Record<string, number>;
}

export type SiteStatus = 'ok' | 'watch' | 'risk';

export interface Flow {
  nodeId: string;
  nodeCountry: CountryCode;
  share: number;
  /** Transit time in weeks (base + scenario extra). */
  lt: number;
  baseLt: number;
  /** Average weekly units on this lane over the horizon. */
  avgWeekly: number;
}

export interface SiteResult {
  site: Site;
  flows: Flow[];
  /** Requirement at the plant (customer demand shifted by transit time). Length horizon + 1. */
  req: number[];
  ss: number[];
  /** Available capacity per week after calendar, levers and outages. */
  cap: number[];
  /** Lot-for-lot production required, ignoring capacity (RCCP "required load"). */
  need: number[];
  prod: number[];
  overridden: boolean[];
  poh: number[];
  stockout: number[];
  gapShort: number[];
  shortage: number[];
  opening: number;
  status: SiteStatus;
}

export interface Result {
  sites: SiteResult[];
  byId: Record<string, SiteResult>;
  pipelineUnits: Record<string, number>;
}

export interface Kpis {
  revenue: number;
  demandUnits: number;
  shortageUnits: number;
  revenueAtRisk: number;
  serviceLevel: number;
  avgUtil: number;
  peakUtil: number;
  overloadSiteWeeks: number;
  inventoryValue: number;
  onHandValue: number;
  pipelineValue: number;
  coverWeeks: number;
  actionCost: number;
}
