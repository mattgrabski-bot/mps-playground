export const num = (n: number) => Math.round(n).toLocaleString('en-GB');
export const pct = (n: number, d = 0) => `${(n * 100).toFixed(d)}%`;
export const eur = (n: number) => {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 1e9) return `${sign}€${(a / 1e9).toFixed(2)}bn`;
  if (a >= 1e6) return `${sign}€${(a / 1e6).toFixed(1)}m`;
  if (a >= 1e3) return `${sign}€${Math.round(a / 1e3)}k`;
  return `${sign}€${Math.round(a)}`;
};
export const compact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}m`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(a >= 1e4 ? 0 : 1)}k`;
  return `${Math.round(n)}`;
};
