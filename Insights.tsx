import type { Insight } from '../engine/insights';
import { Card } from './ui';

const STYLE: Record<Insight['level'], { bar: string; icon: string; label: string }> = {
  risk: { bar: 'bg-bad', icon: '⚠', label: 'Risk' },
  watch: { bar: 'bg-warn', icon: '◔', label: 'Watch' },
  good: { bar: 'bg-good', icon: '✓', label: 'Good' },
  info: { bar: 'bg-cool', icon: 'i', label: 'Idea' },
};

export function Insights({ items, onOpen }: { items: Insight[]; onOpen: (siteId: string) => void }) {
  return (
    <Card title="What the numbers say" subtitle="Generated live from the plan. Click a finding to open the plant.">
      <ul className="space-y-2.5">
        {items.map((it, i) => {
          const st = STYLE[it.level];
          const inner = (
            <div className="flex gap-3 text-left">
              <span className={`mt-0.5 w-1 shrink-0 self-stretch rounded-full ${st.bar}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[13px] font-semibold leading-snug">
                  <span className="text-[11px] opacity-70">{st.icon}</span>
                  {it.title}
                </div>
                <p className="mt-0.5 text-xs leading-snug text-muted">{it.detail}</p>
              </div>
            </div>
          );
          return (
            <li key={i} className="fade-in">
              {it.siteId ? (
                <button
                  onClick={() => onOpen(it.siteId as string)}
                  className="w-full rounded-xl p-2 transition-colors hover:bg-surface-2"
                >
                  {inner}
                </button>
              ) : (
                <div className="p-2">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
