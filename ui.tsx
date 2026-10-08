import { useState, type ReactNode } from 'react';

export function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgb(15_20_40/0.04),0_8px_24px_-12px_rgb(15_20_40/0.12)] ${className}`}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
          <div>
            {title && <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-5 pt-4">{children}</div>
    </section>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  label?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex rounded-xl border border-line bg-surface-2 p-0.5"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`rounded-[10px] font-medium transition-colors ${
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'
            } ${
              active
                ? 'bg-surface text-ink shadow-sm ring-1 ring-line'
                : 'text-muted hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  hint,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  hint?: string;
  format?: (v: number) => string;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  const text = format ? format(value) : `${value > 0 && min < 0 ? '+' : ''}${value}${unit}`;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-[13px] font-medium">{label}</label>
        <span className="tabular rounded-md bg-surface-2 px-1.5 py-0.5 text-xs font-semibold">{text}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        style={{ ['--fill' as string]: `${fill}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="mt-1 text-[11px] leading-snug text-muted">{hint}</p>}
    </div>
  );
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  className = '',
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={`w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-medium text-ink outline-none focus:ring-2 focus:ring-brand/40 ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 text-left"
    >
      <span
        className={`mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          checked ? 'bg-brand' : 'bg-line'
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`}
        />
      </span>
      <span>
        <span className="block text-[13px] font-medium">{label}</span>
        {hint && <span className="block text-[11px] leading-snug text-muted">{hint}</span>}
      </span>
    </button>
  );
}

export function Group({
  title,
  icon,
  changed,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: string;
  changed?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line last:border-0">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-soft text-xs">{icon}</span>
          {title}
          {changed && <span className="h-1.5 w-1.5 rounded-full bg-brand" title="Changed from baseline" />}
        </span>
        <span className={`text-muted transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
      </button>
      {open && <div className="space-y-4 px-4 pb-4">{children}</div>}
    </div>
  );
}

export function StatusDot({ status }: { status: 'ok' | 'watch' | 'risk' }) {
  const c = status === 'ok' ? 'bg-good' : status === 'watch' ? 'bg-warn' : 'bg-bad';
  return <span className={`inline-block h-2 w-2 rounded-full ${c}`} aria-label={status} />;
}
