import { useEffect, type ReactNode } from 'react';
import type { Row } from '../engine/aggregate';
import { heatColor } from '../lib/heat';
import { num } from '../lib/format';
import type { Model } from '../types';
import { StatusDot } from './ui';

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="fade-in absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg px-2 py-1 text-lg text-muted hover:bg-surface-2">
            ×
          </button>
        </header>
        <div className="scrollbar-thin flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
}

export function DrillContent({
  model,
  row,
  week,
  onOpenSite,
}: {
  model: Model;
  row: Row;
  week: number | null;
  onOpenSite: (id: string) => void;
}) {
  const T = model.horizon;
  const items = row.sites
    .map((s) => {
      const t = week;
      const cap = t === null ? s.cap.reduce((a, b) => a + b, 0) : s.cap[t];
      const prod = t === null ? s.prod.reduce((a, b) => a + b, 0) : s.prod[t];
      const need = t === null ? s.need.reduce((a, b) => a + b, 0) : s.need[t];
      const short = t === null ? s.shortage.reduce((a, b) => a + b, 0) : s.shortage[t];
      const poh = t === null ? s.poh.reduce((a, b) => a + Math.max(0, b), 0) / T : s.poh[t];
      return { s, util: cap > 0 ? prod / cap : 0, load: cap > 0 ? need / cap : 0, short, poh };
    })
    .sort((a, b) => b.short - a.short || b.load - a.load);

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        {week === null ? 'Average over the 12 weeks' : `Week ${model.weeks[week].label} (from ${model.weeks[week].start})`} · {items.length} plant{items.length === 1 ? '' : 's'}. Sorted by shortage, then required load.
      </p>
      <ul className="space-y-2">
        {items.map(({ s, util, load, short, poh }) => (
          <li key={s.site.id}>
            <button
              onClick={() => onOpenSite(s.site.id)}
              className="w-full rounded-xl border border-line p-3 text-left transition-colors hover:border-brand/60 hover:bg-surface-2"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <StatusDot status={s.status} />
                  {s.site.id}
                  <span className="text-xs font-normal text-muted">{s.site.name}</span>
                </span>
                <span className="text-xs text-brand">Open grid →</span>
              </div>
              <div className="tabular mt-2 grid grid-cols-4 gap-2 text-center text-[11px]">
                <Chip label="Util" value={`${Math.round(util * 100)}%`} bg={heatColor('util', util)} />
                <Chip label="Load" value={`${Math.round(load * 100)}%`} bg={heatColor('load', load)} />
                <Chip label="Stock" value={num(poh)} bg="var(--color-surface-2)" />
                <Chip label="Short" value={short > 0.5 ? num(short) : '·'} bg={heatColor('short', short)} />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Chip({ label, value, bg }: { label: string; value: string; bg: string }) {
  return (
    <div className="rounded-lg px-1 py-1.5" style={{ background: bg }}>
      <div className="text-[9px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
