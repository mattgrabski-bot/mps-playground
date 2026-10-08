export type Metric = 'util' | 'load' | 'cover' | 'short';

export const METRICS: { id: Metric; label: string; hint: string }[] = [
  { id: 'util', label: 'Utilisation', hint: 'Planned production ÷ available capacity' },
  { id: 'load', label: 'Required load', hint: 'Production needed just-in-time ÷ capacity. Above 100% = overload before pre-build' },
  { id: 'cover', label: 'Stock cover', hint: 'Projected stock in weeks of forward demand' },
  { id: 'short', label: 'Shortage', hint: 'Units that cannot be delivered' },
];

const mix = (color: string, p: number) =>
  `color-mix(in srgb, var(--color-${color}) ${Math.round(p)}%, var(--color-surface))`;

/** Returns a theme-aware CSS colour for a heat-map cell. */
export function heatColor(metric: Metric, v: number): string {
  if (metric === 'util' || metric === 'load') {
    if (v <= 0.001) return 'var(--color-surface-2)';
    if (v < 0.6) return mix('cool', 14 + (v / 0.6) * 8);
    if (v < 0.85) return mix('good', 20 + ((v - 0.6) / 0.25) * 22);
    if (v < 0.95) return mix('warn', 35 + ((v - 0.85) / 0.1) * 20);
    if (v < 1.0005) return mix('warn', 60 + ((v - 0.95) / 0.05) * 15);
    return mix('bad', Math.min(92, 62 + (v - 1) * 120));
  }
  if (metric === 'cover') {
    if (v < 0.15) return mix('bad', 70);
    if (v < 0.4) return mix('warn', 55);
    if (v < 0.8) return mix('good', 32);
    if (v < 1.5) return mix('good', 20);
    return mix('cool', 24);
  }
  if (v <= 0.5) return 'var(--color-surface-2)';
  return mix('bad', Math.min(92, 40 + Math.log10(v) * 12));
}

export function metricText(metric: Metric, v: number): string {
  if (metric === 'util' || metric === 'load') return v <= 0.001 ? '–' : `${Math.round(v * 100)}`;
  if (metric === 'cover') return v.toFixed(1);
  if (v <= 0.5) return '·';
  return v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `${Math.round(v)}`;
}

export function metricUnit(metric: Metric): string {
  return metric === 'util' || metric === 'load' ? '%' : metric === 'cover' ? ' wks' : ' units';
}
