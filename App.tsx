import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MODEL } from './data/mock';
import { computeKpis } from './engine/kpis';
import { buildInsights } from './engine/insights';
import { computeMps } from './engine/mps';
import { DEFAULT_SCENARIO, PRESETS, decodeScenario, encodeScenario, isDefault } from './engine/scenarios';
import type { Scenario } from './types';
import { Drawer, DrillContent } from './components/Drawer';
import { Heatmap, type DrillTarget } from './components/Heatmap';
import { Insights } from './components/Insights';
import { KpiTiles } from './components/KpiTiles';
import { Learn } from './components/Learn';
import { Levers } from './components/Levers';
import { MpsGrid } from './components/MpsGrid';
import { NetworkMap } from './components/NetworkMap';
import { ScenarioCards } from './components/ScenarioCards';
import { SupplyChart } from './components/SupplyChart';
import { TopBar, type Mode } from './components/TopBar';
import { Segmented } from './components/ui';

const BASE_RESULT = computeMps(MODEL, DEFAULT_SCENARIO);
const BASE_KPIS = computeKpis(MODEL, DEFAULT_SCENARIO, BASE_RESULT);

type PlannerTab = 'grid' | 'heatmap' | 'network' | 'learn';

function readHash(): { sc: Scenario; mode: Mode } {
  try {
    const q = new URLSearchParams(window.location.hash.slice(1));
    const sc = q.get('s') ? decodeScenario(q.get('s') as string) : null;
    const mode = q.get('m') === 'planner' ? 'planner' : 'exec';
    return { sc: sc ?? DEFAULT_SCENARIO, mode };
  } catch {
    return { sc: DEFAULT_SCENARIO, mode: 'exec' };
  }
}

export default function App() {
  const initial = useMemo(readHash, []);
  const [sc, setSc] = useState<Scenario>(initial.sc);
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [tab, setTab] = useState<PlannerTab>('grid');
  const [siteId, setSiteId] = useState<string>('MX-TGT');
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [leversOpen, setLeversOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const [drill, setDrill] = useState<DrillTarget | null>(null);

  const result = useMemo(() => computeMps(MODEL, sc), [sc]);
  const kpis = useMemo(() => computeKpis(MODEL, sc, result), [sc, result]);
  const insights = useMemo(() => buildInsights(MODEL, result, kpis, BASE_KPIS), [result, kpis]);
  const overrideCount = Object.keys(sc.overrides).length;
  const dirty = !isDefault(sc);

  // Keep the URL in sync so any scenario can be shared by copying the link.
  const timer = useRef<number | undefined>(undefined);
  const link = useCallback(() => {
    const q = new URLSearchParams();
    q.set('m', mode);
    if (!isDefault(sc)) q.set('s', encodeScenario(sc));
    return `${window.location.origin}${window.location.pathname}#${q.toString()}`;
  }, [sc, mode]);
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        window.history.replaceState(null, '', link());
      } catch {
        /* sandboxed iframes may block this; sharing still works through the button */
      }
    }, 250);
    return () => window.clearTimeout(timer.current);
  }, [link]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('mps-theme', dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [dark]);

  const patch = useCallback((p: Partial<Scenario>) => setSc((cur) => ({ ...cur, ...p, name: 'Custom' })), []);
  const pick = (id: string) => {
    const preset = PRESETS.find((x) => x.id === id);
    if (preset) setSc({ ...preset.scenario, overrides: {} });
  };
  const reset = () => setSc({ ...DEFAULT_SCENARIO, overrides: {} });
  const share = async () => {
    try {
      await navigator.clipboard.writeText(link());
      return true;
    } catch {
      window.prompt('Copy this link:', link());
      return false;
    }
  };
  const setOverride = (id: string, week: number, value: number | null) =>
    setSc((cur) => {
      const overrides = { ...cur.overrides };
      const key = `${id}:${week}`;
      if (value === null) delete overrides[key];
      else overrides[key] = value;
      return { ...cur, overrides, name: 'Custom' };
    });

  const openSite = (id: string) => {
    setSiteId(id);
    setMode('planner');
    setTab('grid');
    setDrill(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const leverPanel = <Levers sc={sc} set={patch} mode={mode} overrideCount={overrideCount} />;

  return (
    <div className="min-h-screen">
      <TopBar
        mode={mode}
        onMode={setMode}
        onLearn={() => setLearnOpen(true)}
        onReset={reset}
        onShare={share}
        dark={dark}
        onTheme={() => setDark((d) => !d)}
        onLevers={() => setLeversOpen(true)}
        dirty={dirty}
      />

      <div className="mx-auto grid max-w-[1600px] gap-5 px-4 py-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Levers (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-[72px] max-h-[calc(100vh-90px)] overflow-y-auto rounded-2xl border border-line bg-surface shadow-[0_8px_24px_-12px_rgb(15_20_40/0.15)] scrollbar-thin">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold">Levers</h2>
              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">{sc.name}</span>
            </div>
            {leverPanel}
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          {mode === 'exec' ? (
            <>
              <ScenarioCards current={sc} onPick={pick} />
              <KpiTiles k={kpis} base={BASE_KPIS} />
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                <Heatmap model={MODEL} result={result} onDrill={setDrill} />
                <Insights items={insights} onOpen={openSite} />
              </div>
              <div className="grid gap-5 xl:grid-cols-2">
                <SupplyChart model={MODEL} result={result} />
                <NetworkMap model={MODEL} result={result} />
              </div>
            </>
          ) : (
            <>
              <ScenarioCards current={sc} onPick={pick} />
              <KpiTiles k={kpis} base={BASE_KPIS} compact />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Segmented
                  label="Planner view"
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: 'grid', label: '▦ MPS grid' },
                    { value: 'heatmap', label: '▤ Plant heat map' },
                    { value: 'network', label: '◍ Network' },
                    { value: 'learn', label: '? Learn' },
                  ]}
                />
                {overrideCount > 0 && (
                  <span className="rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
                    {overrideCount} manual edit{overrideCount === 1 ? '' : 's'} active
                  </span>
                )}
              </div>
              {tab === 'grid' && (
                <MpsGrid model={MODEL} result={result} siteId={siteId} onSelectSite={setSiteId} onOverride={setOverride} />
              )}
              {tab === 'heatmap' && (
                <div className="space-y-5">
                  <Heatmap model={MODEL} result={result} defaultGroup="site" allowSite onDrill={setDrill} />
                  <div className="grid gap-5 xl:grid-cols-2">
                    <SupplyChart model={MODEL} result={result} />
                    <Insights items={insights} onOpen={openSite} />
                  </div>
                </div>
              )}
              {tab === 'network' && <NetworkMap model={MODEL} result={result} />}
              {tab === 'learn' && <Learn />}
            </>
          )}

          <footer className="pb-6 pt-2 text-center text-[11px] text-muted">
            Mock data for training only. Numbers are representative, not real. Settings live in the page link, so you can share any scenario.
          </footer>
        </main>
      </div>

      {/* Levers (mobile sheet) */}
      <Drawer open={leversOpen} onClose={() => setLeversOpen(false)} title="Levers">
        <div className="-mx-5 -my-5">{leverPanel}</div>
      </Drawer>

      <Drawer open={learnOpen} onClose={() => setLearnOpen(false)} title="How this works">
        <Learn />
      </Drawer>

      <Drawer
        open={drill !== null}
        onClose={() => setDrill(null)}
        title={drill ? `${drill.row.label}${drill.week !== null ? ` · ${MODEL.weeks[drill.week].label}` : ''}` : ''}
      >
        {drill && <DrillContent model={MODEL} row={drill.row} week={drill.week} onOpenSite={openSite} />}
      </Drawer>
    </div>
  );
}
