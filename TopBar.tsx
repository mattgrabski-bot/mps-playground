import { useState } from 'react';
import { Segmented } from './ui';

export type Mode = 'exec' | 'planner';

export function TopBar({
  mode,
  onMode,
  onLearn,
  onReset,
  onShare,
  dark,
  onTheme,
  onLevers,
  dirty,
}: {
  mode: Mode;
  onMode: (m: Mode) => void;
  onLearn: () => void;
  onReset: () => void;
  onShare: () => Promise<boolean>;
  dark: boolean;
  onTheme: () => void;
  onLevers: () => void;
  dirty: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const ok = await onShare();
    setCopied(ok);
    setTimeout(() => setCopied(false), 1800);
  };
  const btn =
    'rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-surface-2';
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <img src="./favicon.svg" alt="" className="h-8 w-8 rounded-lg" />
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">MPS Playground</div>
            <div className="text-[11px] text-muted">Master Production Schedule · 12 weeks · W42 to W53</div>
          </div>
        </div>
        <div className="mx-auto">
          <Segmented
            label="Mode"
            value={mode}
            onChange={onMode}
            options={[
              { value: 'exec', label: '◧ Executive', title: 'KPIs, heat map and one-click scenarios' },
              { value: 'planner', label: '▦ Planner', title: 'Weekly MPS grids and editable cells' },
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <button className={`${btn} lg:hidden`} onClick={onLevers}>
            ⚙ Levers
          </button>
          <button className={btn} onClick={onLearn}>
            ? Learn
          </button>
          <button className={btn} onClick={share} title="Copy a link to this exact scenario">
            {copied ? '✓ Link copied' : '⧉ Share'}
          </button>
          <button className={`${btn} ${dirty ? '' : 'opacity-50'}`} onClick={onReset} disabled={!dirty}>
            ↺ Reset
          </button>
          <button className={btn} onClick={onTheme} aria-label="Toggle dark mode">
            {dark ? '☀' : '☾'}
          </button>
        </div>
      </div>
    </header>
  );
}
