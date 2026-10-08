import { Card } from './ui';

const STEPS = [
  {
    n: 1,
    title: 'Demand',
    text: 'Customers tell us what they need each week. The first four weeks are firm call-offs, the rest is forecast.',
  },
  {
    n: 2,
    title: 'Requirement at the plant',
    text: 'Goods in transit take time to arrive, so a plant must ship earlier than the customer needs them. Longer lanes mean looking further ahead.',
  },
  {
    n: 3,
    title: 'Capacity check',
    text: 'Compare what is needed with what the lines can make after shutdowns, shifts, overtime and outages. Above 100% means overload.',
  },
  {
    n: 4,
    title: 'Plan and stock',
    text: 'Plan production to keep stock above safety stock. If a week is overloaded, build in earlier weeks. What cannot be built is a shortage.',
  },
];

const GLOSSARY: [string, string][] = [
  ['MPS', 'Master Production Schedule: the weekly plan of how much each plant will make of each product.'],
  ['Requirement', 'Units a plant must ship in a week to serve its customers, after allowing for transit time.'],
  ['Safety stock', 'A buffer in days of cover that protects against variation. It also bridges transit disruptions here.'],
  ['Required load', 'Production needed just-in-time divided by capacity. Above 100% the plant cannot do it in that week.'],
  ['Pre-build', 'Making product earlier than needed in weeks with spare capacity, to cover a later overload such as the year-end shutdown.'],
  ['Projected stock', 'Opening stock plus production minus requirement, week by week.'],
  ['Service level', 'Share of customer requirements, by value, delivered on time.'],
  ['Transit gap', 'When a lane gets longer, demand in the first weeks can no longer be shipped in time. Safety stock can bridge it.'],
];

const EXERCISES = [
  ['Find the bottleneck', 'Open Baseline. Switch the heat map to Required load and group by Plant (Planner mode). Which plants exceed 100%, and when?'],
  ['Fix it three ways', 'Pick Europe demand +20%. Compare overtime 15%, adding a shift, and a sourcing shift to a plant with spare capacity. Compare service level, inventory and action cost.'],
  ['Pre-build for Christmas', 'Pick Year-end crunch. How many days of extra safety stock remove the shortage? What does it cost in inventory?'],
  ['Disaster recovery', 'Pick Turkey bumper line fire and move 100% of TR-BMP volume to PL-BMP. What happens to Poland, and when does it break?'],
  ['The hidden cost of cheap sourcing', 'Pick Port congestion. Remove the sea delay, then add it back. Which is bigger: the pipeline inventory or the shortage?'],
  ['Be the planner', 'In Planner mode, open MX-TGT and type a different number in a planned-production cell. Watch projected stock and the neighbouring weeks react.'],
];

export function Learn() {
  return (
    <div className="space-y-4">
      <Card title="MPS in four steps" subtitle="The logic this tool runs for every plant, every time you touch a lever.">
        <ol className="grid gap-3 md:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="relative rounded-xl bg-surface-2 p-4">
              <span className="mb-2 grid h-7 w-7 place-items-center rounded-full bg-brand text-xs font-bold text-white">{s.n}</span>
              <h3 className="text-sm font-semibold">{s.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Workshop exercises" subtitle="Run these live with a team. Each takes 5 to 10 minutes.">
          <ol className="space-y-3">
            {EXERCISES.map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-bold text-brand">{i + 1}</span>
                <div>
                  <div className="text-[13px] font-semibold">{t}</div>
                  <p className="text-xs leading-relaxed text-muted">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card title="Glossary">
          <dl className="space-y-2.5">
            {GLOSSARY.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[13px] font-semibold">{k}</dt>
                <dd className="text-xs leading-relaxed text-muted">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card title="About the data and the model">
        <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-muted">
          <li>All data is mock but representative: 6 product lines, 11 countries, 35 plants, a 12-week horizon starting Monday 12 October 2026 (W42 to W53).</li>
          <li>Morocco and Turkey are grouped under Europe. Americas = US and Mexico. Asia = China and Thailand.</li>
          <li>Demand carries seasonality: a year-end shutdown in W52 and W53 (Americas and Europe), US Thanksgiving in W48, and small week-to-week noise.</li>
          <li>Transit time is 0 weeks inside a country, 1 week inside a region, 4 weeks Americas↔Europe and 5 weeks to or from Asia.</li>
          <li>The plan is a simple finite-capacity heuristic (just-in-time with backward pre-build). It teaches the concept; it is not an APS optimiser.</li>
          <li>Costs for shifts and overtime are illustrative. Prices and unit values are invented.</li>
          <li>Every setting is stored in the page link, so you can share a scenario by copying the URL.</li>
        </ul>
      </Card>
    </div>
  );
}
