// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from '../src/App';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLElement;

beforeAll(() => {
  // jsdom has no matchMedia / clipboard
  Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
});

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  window.location.hash = '';
});

const mount = async () => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => root!.render(<App />));
};

const click = async (el: Element) => act(async () => (el as HTMLElement).click());
const byText = (sel: string, text: string) =>
  [...document.querySelectorAll(sel)].find((e) => e.textContent?.includes(text)) as HTMLElement;

describe('App smoke test', () => {
  it('renders the executive view with KPIs, heat map, insights and network', async () => {
    await mount();
    const t = document.body.textContent ?? '';
    for (const s of ['MPS Playground', 'Service level', 'Where is the pressure?', 'What the numbers say', 'Supply network', 'Your mission']) {
      expect(t).toContain(s);
    }
    // 3 regions x 12 weeks of heat cells
    expect(document.querySelectorAll('button.heat-cell').length).toBe(36);
  });

  it('a preset changes the KPIs, and reset brings them back', async () => {
    await mount();
    const before = document.body.textContent;
    await click(byText('button', 'Americas tariff pull-forward'));
    expect(document.body.textContent).toContain('vs baseline');
    expect(document.body.textContent).not.toBe(before);
    await click(byText('button', 'Reset'));
    expect(document.body.textContent).toContain('Same as baseline');
  });

  it('planner mode shows the MPS grid and a manual edit creates an override', async () => {
    await mount();
    await click(byText('button', 'Planner'));
    expect(document.body.textContent).toContain('Planned production');
    const inputs = document.querySelectorAll<HTMLInputElement>('input[aria-label="Planned production"]');
    expect(inputs.length).toBe(12);
    const input = inputs[3];
    await act(async () => input.focus());
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => {
      setter.call(input, '1234');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => input.blur());
    expect(document.body.textContent).toContain('1 manual edit active');
  });

  it('clicking a heat-map cell opens the plant drill-down', async () => {
    await mount();
    await click(document.querySelector('button.heat-cell') as Element);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Open grid');
  });

  it('restores a shared scenario from the URL', async () => {
    const { encodeScenario, DEFAULT_SCENARIO } = await import('../src/engine/scenarios');
    window.location.hash = `m=planner&s=${encodeURIComponent(encodeScenario({ ...DEFAULT_SCENARIO, name: 'Custom', demandPct: 22 }))}`;
    await mount();
    expect(document.body.textContent).toContain('+22%');
    expect(document.body.textContent).toContain('Planned production');
  });
});
