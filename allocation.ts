import { COUNTRY_BY_CODE, SOURCING_PREFERENCE, baseLeadTimeWeeks } from '../data/config';
import type { DemandNode, Site, SourceShift } from '../types';

export interface Share {
  siteId: string;
  share: number;
}

/** Default allocation: each demand node is served 100% by its preferred plant. */
export function baseAllocation(sites: Site[], nodes: DemandNode[]): Record<string, Share[]> {
  const out: Record<string, Share[]> = {};
  for (const n of nodes) {
    const candidates = sites.filter((s) => s.product === n.product);
    let chosen: Site | undefined;
    for (const c of SOURCING_PREFERENCE[n.country]) {
      chosen = candidates.find((s) => s.country === c);
      if (chosen) break;
    }
    if (!chosen) chosen = candidates[0];
    out[n.id] = chosen ? [{ siteId: chosen.id, share: 1 }] : [];
  }
  return out;
}

/** Apply sourcing shifts ("move X% of what plant A serves to plant B"). */
export function applyShifts(
  alloc: Record<string, Share[]>,
  nodes: DemandNode[],
  shifts: SourceShift[],
): Record<string, Share[]> {
  const out: Record<string, Share[]> = {};
  for (const k of Object.keys(alloc)) out[k] = alloc[k].map((s) => ({ ...s }));
  for (const sh of shifts) {
    if (!sh.fromSite || !sh.toSite || sh.fromSite === sh.toSite || sh.pct <= 0) continue;
    for (const n of nodes) {
      if (n.product !== sh.product) continue;
      const list = out[n.id];
      const from = list.find((s) => s.siteId === sh.fromSite);
      if (!from || from.share <= 0) continue;
      const moved = from.share * Math.min(100, sh.pct) / 100;
      from.share -= moved;
      const to = list.find((s) => s.siteId === sh.toSite);
      if (to) to.share += moved;
      else list.push({ siteId: sh.toSite, share: moved });
    }
    for (const n of nodes) out[n.id] = out[n.id].filter((s) => s.share > 1e-9);
  }
  return out;
}

export function laneBaseLt(nodeCountry: Site['country'], siteCountry: Site['country']): number {
  return baseLeadTimeWeeks(siteCountry, nodeCountry);
}

export function sameRegion(a: Site['country'], b: Site['country']): boolean {
  return COUNTRY_BY_CODE[a].region === COUNTRY_BY_CODE[b].region;
}
