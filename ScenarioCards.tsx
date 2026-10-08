import { PRESETS } from '../engine/scenarios';
import type { Scenario } from '../types';

export function ScenarioCards({ current, onPick }: { current: Scenario; onPick: (id: string) => void }) {
  const active = PRESETS.find((p) => p.scenario.name === current.name);
  return (
    <div className="space-y-3">
      <div className="scrollbar-thin -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
        {PRESETS.map((p) => {
          const on = active?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              aria-pressed={on}
              className={`group min-w-[170px] shrink-0 rounded-2xl border p-3 text-left transition-all ${
                on
                  ? 'border-brand bg-brand-soft shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_20%,transparent)]'
                  : 'border-line bg-surface hover:-translate-y-0.5 hover:border-brand/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-surface-2 text-sm">{p.icon}</span>
                <span className="text-[13px] font-semibold leading-tight">{p.title}</span>
              </div>
              <div className="mt-1.5 text-[11px] text-muted">{p.tagline}</div>
            </button>
          );
        })}
      </div>
      <div className="fade-in rounded-2xl border border-brand/25 bg-brand-soft/60 px-4 py-3 text-sm leading-relaxed" key={active?.id ?? 'custom'}>
        <span className="mr-2 rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {active ? 'Your mission' : 'Custom scenario'}
        </span>
        {active
          ? active.mission
          : 'You are off the script. Watch the KPI tiles and the heat map react as you move the levers. Pick a scenario above to get back to a guided exercise.'}
      </div>
    </div>
  );
}
