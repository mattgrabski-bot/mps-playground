import type { Scenario } from '../types';

export const DEFAULT_SCENARIO: Scenario = {
  name: 'Baseline',
  demandPct: 0,
  demandRegion: 'All',
  demandProduct: 'All',
  addShift: false,
  overtimePct: 0,
  capacityRegion: 'All',
  outage: null,
  extraSeaWeeks: 0,
  extraRegionalWeeks: 0,
  ssExtraDays: 0,
  sourcing: [],
  overrides: {},
};

export interface Preset {
  id: string;
  title: string;
  tagline: string;
  /** What the facilitator wants the audience to try. */
  mission: string;
  icon: string;
  scenario: Scenario;
}

const s = (patch: Partial<Scenario>): Scenario => ({ ...DEFAULT_SCENARIO, ...patch });

export const PRESETS: Preset[] = [
  {
    id: 'baseline',
    title: 'Baseline',
    tagline: 'The plan as it stands',
    icon: '◎',
    mission:
      'Look for the hot spots first: which plants run above 90%? What happens to every region over the year-end shutdown (W52–W53)?',
    scenario: s({ name: 'Baseline' }),
  },
  {
    id: 'eu-surge',
    title: 'Europe demand +20%',
    tagline: 'OEM pulls volume forward',
    icon: '↗',
    mission:
      'European customers call off 20% more. Find the plants that break, then fix them using only one lever at a time: first overtime, then an extra shift, then moving volume to a plant with spare capacity.',
    scenario: s({ name: 'Europe demand +20%', demandPct: 20, demandRegion: 'Europe' }),
  },
  {
    id: 'year-end',
    title: 'Year-end crunch',
    tagline: 'More demand before the shutdown',
    icon: '❄',
    mission:
      'Demand is +8% everywhere and plants close for Christmas. Use pre-build: raise safety stock and overtime so the shutdown weeks are covered. What does it cost in inventory?',
    scenario: s({ name: 'Year-end crunch', demandPct: 8 }),
  },
  {
    id: 'tr-outage',
    title: 'Turkey bumper line fire',
    tagline: '3 weeks of lost output',
    icon: '🔥',
    mission:
      'The Turkish bumper plant loses 100% of output for 3 weeks from W46. Recover service by moving volume to Poland or Germany, and see what the longer lanes do.',
    scenario: s({
      name: 'Turkey bumper line fire',
      outage: { siteId: 'TR-BMP', startWeek: 4, weeks: 3, lossPct: 100 },
    }),
  },
  {
    id: 'port',
    title: 'Port congestion + Asia sourcing',
    tagline: 'Sea lanes +3 weeks',
    icon: '⚓',
    mission:
      'Europe sources 25% of its bumpers from China and ports clog. Compare three fixes: more safety stock, bringing volume back to Europe, or both. Which is cheapest?',
    scenario: s({
      name: 'Port congestion + Asia sourcing',
      extraSeaWeeks: 3,
      sourcing: [
        { product: 'bumpers', fromSite: 'FR-BMP', toSite: 'CN-BMP', pct: 25 },
        { product: 'bumpers', fromSite: 'DE-BMP', toSite: 'CN-BMP', pct: 25 },
      ],
    }),
  },
  {
    id: 'us-pull',
    title: 'Americas tariff pull-forward',
    tagline: 'US & Mexico +20%',
    icon: '⚑',
    mission:
      'Customers pull volume forward ahead of a tariff change: Americas +20%. Mexico is already running hot. Where does capacity run out first, and which lever buys the most service per euro?',
    scenario: s({ name: 'Americas tariff pull-forward', demandPct: 20, demandRegion: 'Americas' }),
  },
];

/** Compact, shareable encoding of a scenario in the URL hash. */
export function encodeScenario(sc: Scenario): string {
  const json = JSON.stringify(sc);
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeScenario(hash: string): Scenario | null {
  try {
    const json = decodeURIComponent(escape(atob(hash)));
    const parsed = JSON.parse(json) as Partial<Scenario>;
    return { ...DEFAULT_SCENARIO, ...parsed, overrides: { ...(parsed.overrides ?? {}) } };
  } catch {
    return null;
  }
}

export function isDefault(sc: Scenario): boolean {
  const { name: _a, ...a } = sc;
  const { name: _b, ...b } = DEFAULT_SCENARIO;
  void _a;
  void _b;
  return JSON.stringify(a) === JSON.stringify(b);
}
