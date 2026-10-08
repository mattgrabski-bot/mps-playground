# MPS Playground

An interactive **Master Production Schedule** simulator for training local planning teams and executives.
Everything runs in the browser: no backend, no database, no licences. Move a lever and the whole 12-week plan
recalculates instantly.

- **Scope:** 6 product lines (bumpers, tailgates, fuel tanks, headlamps, modules, cockpits), 3 regions, 11 countries
  (US, MX · FR, UK, ES, DE, PL, TR, MA · CN, TH), 35 plants, 12 weeks (W42 to W53 2026).
- **Two modes:** *Executive* (scenario cards, KPIs, pressure heat map, plain-language findings, network map) and
  *Planner* (weekly MPS grid per plant with editable cells, plant heat map, network, learning guide).
- **Levers:** demand %, add a shift, overtime, plant outage, extra transit weeks, safety stock, sourcing split between plants.
- **Shareable:** the whole scenario is stored in the URL. Copy the link and a colleague sees exactly what you see.
- **Mock data:** deterministic, representative, invented. Nothing here is real company data.

## Publish on GitHub in 5 minutes (no tools needed)

The finished website is already built and sits in the `docs/` folder. You only need a browser.

1. On github.com click **New repository**. Name it `mps-playground`, keep it **Public**, click **Create repository**.
2. Click **uploading an existing file**. Unzip this package on your computer, select **everything inside the folder**
   (including `docs`, `src`, `tests`, `.github`) and drag it into the browser. Wait for the upload, then **Commit changes**.
   The package has fewer than 100 files, which is GitHub's limit for a browser upload.
3. Go to **Settings → Pages**. Under *Build and deployment* set **Source: Deploy from a branch**, **Branch: main**,
   **Folder: /docs**, then **Save**.
4. After about a minute your site is live at `https://<your-user>.github.io/mps-playground/`.
   Send that link to participants. Every scenario they build can be shared with the **Share** button.

> GitHub Pages on a **private** repository needs a paid GitHub plan. On a free plan keep the repo public (it only contains
> mock data), or host the `docs/` folder on any internal web server: it is plain static files.

If drag-and-drop skips the hidden `.github` folder, nothing breaks. It only holds an optional automatic test run.

### Prefer the command line?

```bash
gh auth login
./scripts/setup-github.sh      # or .\scripts\setup-github.ps1 on Windows
```
Then do step 3 above (Pages: branch `main`, folder `/docs`).

## Change something and republish

You need Node 20 or newer, once, on your computer.

```bash
npm install
npm run dev          # live preview at http://localhost:5173
npm test             # engine + UI tests
npm run build:docs   # rebuilds the website into docs/
```
Then upload the changed files (at least `docs/`) to GitHub the same way as before, or `git add -A && git commit && git push`.
Pages updates within a minute.

## Make it yours

| I want to change | Edit |
| --- | --- |
| Start date of the 12 weeks | `HORIZON_START` in `src/data/config.ts` (use a Monday) |
| Volumes, prices, safety stock days | `BASE_DEMAND`, `PRODUCTS` in `src/data/config.ts` |
| Which region a country belongs to (MA, TR) | `COUNTRIES` in `src/data/config.ts` |
| Shutdown weeks and holidays | `DEMAND_FACTOR`, `CAPACITY_FACTOR` in `src/data/config.ts` |
| Plants, lines, shifts, how hot each runs | `SITE_SPECS` in `src/data/mock.ts` (`targetUtil` sets the baseline utilisation) |
| Default sourcing rules | `SOURCING_PREFERENCE` in `src/data/config.ts` |
| Transit times | `baseLeadTimeWeeks` in `src/data/config.ts` |
| Training scenarios and their "missions" | `PRESETS` in `src/engine/scenarios.ts` |

Real data later: replace `buildModel()` in `src/data/mock.ts` with a loader that returns the same `Model` shape
(see `src/types.ts`). The engine and UI do not change.

## How the engine works (`src/engine/mps.ts`)

For every plant, every time a lever moves:

1. **Requirement.** Customer demand on each lane is shifted back by transit time. Sourcing shifts change the lanes.
2. **Safety stock** = policy days of the next two weeks' requirement (+ the lever).
3. **Required load** (RCCP view): production needed just-in-time, ignoring capacity, compared with available capacity
   (calendar × shifts × overtime × outage).
4. **Plan.** Produce just-in-time to keep stock at or above safety stock. If a week needs more than capacity, build in the
   nearest earlier weeks with spare capacity (pre-build). Manual edits are fixed points the plan works around.
5. **Shortage.** Whatever still cannot be built is a stock-out. A longer lane also creates a *transit gap*: customer weeks that
   can no longer be shipped in time, partly bridged by safety stock.

It is a teaching heuristic, not an optimiser. See `tests/engine.test.ts` for the invariants it must hold.

## Project layout

```
src/
  data/config.ts       products, countries, volumes, seasonality, lead times
  data/mock.ts         35 plants + deterministic demand generator
  engine/mps.ts        the planning logic
  engine/kpis.ts       service level, utilisation, inventory, cost
  engine/insights.ts   plain-language findings for executives
  engine/scenarios.ts  presets and URL sharing
  components/          Levers, Heatmap, SupplyChart, NetworkMap, MpsGrid, ...
tests/                 engine invariants + UI smoke tests
FACILITATOR-GUIDE.md   agenda for a 60-minute exec session and a 90-minute planner workshop
```

## Tech

React 19, TypeScript, Vite, Tailwind CSS 4, Vitest. No chart library: the charts are hand-built SVG, so the bundle is about
90 KB gzipped and works offline.
