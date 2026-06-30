# Praxis Cockpit · Terminauslastung

An appointment-utilization dashboard for a fictional medical practice, built with
**Angular 20** (standalone, signals, zoneless-ready OnPush) and **classic NgRx**.
It ingests the raw `termindaten_beispiel.json` export, cleans it, and renders a
dense clinical cockpit: headline KPIs, an interactive
intraday timeline, an hour×weekday heatmap, a daily-capacity trend, per-doctor
and per-treatment breakdowns, an auto-generated "Auffälligkeiten" feed, and a
per-week data-quality card.

---

## Quick start

> Requires **Node 20+** and npm.

```bash
npm install
npm start          # ng serve → http://localhost:4200
npm run build      # production build → dist/praxis-dashboard/browser
npm test           # 45 unit specs via Karma + Jasmine (ChromeHeadless)
```

To run the tests headless in CI:

```bash
ng test --watch=false --browsers=ChromeHeadless
```

The dataset is served as a static asset from `public/data/termindaten_beispiel.json`.
Drop in a new file with the same shape and the dashboard re-derives everything.

---

## What it shows

| Panel | Question it answers |
| --- | --- |
| **KPI strip** | Effective vs. booked utilization, no-show rate, weekly volume, Ø treatment duration — each with a real signed delta vs. the previous week. |
| **Wochen-Timeline** | Intraday utilization per time-slot across Mon–Fri, filterable by doctor / treatment / bucket size, with smoothing, target line, no-show overlay and peak markers. |
| **Heatmap** | Which hour-of-day × weekday cells run hot or cold. Hover a cell to open a popover listing the appointments in that hour (time, doctor, treatment, status). |
| **Tagestrend** | Daily capacity split into attended / no-show / free minutes with the utilization line on a second axis. |
| **Ärzte & Auslastung** | Per-doctor load against per-doctor capacity. |
| **Behandlungsarten** | Treatment-type mix and no-shows per type. |
| **Auffälligkeiten** | Data-driven findings (bottlenecks, no-show clusters, low-utilization days …). |
| **Datenqualität** | For the selected week: how many rows were usable, how many excluded, and *why* — with the exact flagged appointments (timestamp, doctor, original label, reason) always listed below the summary. |

Use the week navigator in the top bar to step through the three working weeks in
the dataset.

---

## Architecture

```
src/app
├─ core/                     # framework-free domain layer (pure, unit-tested)
│  ├─ config/                #   opening-hours / capacity config + DI token
│  └─ domain/
│     ├─ models/             #   raw DTOs + normalized + view-model shapes
│     ├─ util/               #   time helpers (local parsing, ISO week, labels)
│     ├─ normalize/          #   raw JSON → clean Appointment[] + quality report
│     └─ analytics/          #   kpis, daily-trend, heatmap, timeline, by-doctor,
│                            #   by-behandlung, insights (all pure functions)
├─ data-access/              # HttpClient loader for the static dataset
├─ state/appointments/       # NgRx feature: actions, reducer, effects, selectors
├─ shared/                   # chart-token bridge (CSS vars → hex for ECharts)
└─ features/
   ├─ layout/                # sidebar + topbar (presentational)
   └─ dashboard/
      ├─ components/          # 8 OnPush, input-only presentational components
      └─ containers/          # DashboardPage: the only store-aware component
```

**Data flow** is a clean one-way pipeline:

```
JSON ──HttpClient──▶ Effect ──normalizeAppointments()──▶ store (entity map)
                                                          │
                       selectors (memoized analytics) ◀───┘
                                                          │
                       DashboardPage (selectSignal) ──────┘
                                                          │
                       presentational components ◀── inputs
```

Design rules I followed:

- **One container, many dumb components.** Only `DashboardPage` touches the
  `Store`; every chart/panel is a pure component driven by `input.required<T>()`
  and `ChangeDetectionStrategy.OnPush`. This keeps them trivial to test and reuse.
- **Domain logic lives outside Angular.** All metrics are pure functions in
  `core/domain/analytics/*` and are unit-tested without `TestBed`. Selectors are
  thin adapters that call them, so memoization is free and the maths is portable.
- **The store holds only serializable data** — no `Date` objects. Date math is
  pre-computed during normalization (`minuteOfDay`, `weekStart`, `dayOfWeek`).
- **The store keeps *all* normalized rows** (valid and flagged); selectors narrow
  to `.valid` for metrics. This is what lets the data-quality card stay honest.

---

## Data quality & normalization

The sample data is deliberately dirty. `normalizeAppointments()` classifies each
row and records a `DataQualityReport`:

- **Hard exclusions** (dropped from all metrics): invalid/zero/negative duration,
  starts outside opening hours, days outside Mon–Fri, unknown/garbage status.
- **Soft handling** (still counted): unmapped treatment labels are folded into
  `Sonstiges`; cancelled appointments stay in the dataset but are excluded from
  *utilization* (they never occupied a slot) while still being reported.

The report is computed by a single pure function, `buildDataQualityReport()`,
which runs over *any* slice of normalized rows — once over the whole file during
normalization, and again **per selected week** in `selectCurrentWeekQuality`
(over all rows of the week, including the excluded ones). The card surfaces that
week's counts and always lists `listQualityIssues()` — the exact flagged
appointments (timestamp, doctor, original label, reason) — so every aggregate
number is auditable down to the row.

Capacity is `open hours − lunch` per day, multiplied by the doctor roster
(resolved from the distinct doctors actually present in the data, not hardcoded).
Effective utilization = attended minutes / capacity; booked utilization adds
no-show minutes; the gap between them is the no-show "Lücke".

---

## Tech choices & trade-offs

- **Classic NgRx over SignalStore / a plain service.** The brief asked for a
  clean, scalable architecture; classic NgRx makes the data flow explicit and the
  analytics naturally fit memoized selectors. Cost: more boilerplate than a single
  signal service would need for an app this size.
- **ngx-echarts (Apache ECharts) only where a canvas earns its keep** — the
  timeline and daily-trend. The heatmap, KPI tiles, bars and lists are plain
  CSS/Tailwind, which keeps them crisp, themeable via CSS variables, and cheap.
  ECharts is `import()`-lazy-loaded, so it lands in a separate ~1 MB chunk instead
  of the 98 kB initial bundle.
- **Tailwind v4 + CSS-variable design tokens.** Tokens are declared once and
  exposed both as Tailwind utilities (`@theme`) and raw `:root` variables for
  inline styles / `color-mix()`. ECharts can't read CSS variables off a canvas, so
  `shared/chart-tokens.ts` mirrors the palette as hex — the one intentional
  duplication, kept in one file.
- **Timeline state is component-local.** Doctor/treatment/bucket filters live as
  signals in the timeline component and recompute via the pure `buildTimeline()`,
  rather than polluting the global store with transient view state.

---

## AI-assisted workflow

I used an AI coding agent throughout, but treated it as a fast junior pair, not an
oracle:

1. **Reference first.** I started from a React reference UI (in `React application/`)
   to lock the visual language and information hierarchy, then had the AI help port
   it to idiomatic Angular 20.
2. **Domain before UI.** I drove the AI to build and unit-test the pure
   normalization + analytics layer first (with the dirty-data edge cases as specs),
   so the maths was trustworthy before any pixel was drawn.
3. **Tight, reviewed increments.** Components were generated one at a time against
   fixed input contracts (the view-model interfaces), then read back and corrected.
   I verified third-party API shapes (ngx-echarts `provideEchartsCore`, lucide icon
   exports, ECharts option typing) directly against `node_modules` type defs rather
   than trusting generated imports.
4. **Verification gates.** `tsc`, `ng build` and the Karma suite were the
   non-negotiable gates; the build’s lazy-chunk report confirmed ECharts stayed out
   of the initial bundle.

---

## What I changed / rejected from the AI's output

The AI's first instinct was to port the React reference *literally*. Several of
those choices were wrong for this dataset, so I overrode them:

- **Treatment colours (rejected).** The reference keyed bar colours by hardcoded
  German treatment names (`"Vorsorge"`, `"Akut"`, …) that **don't exist** in this
  dataset — every bar would have fallen back to grey. I replaced it with a
  positional palette cycled by rank, which is stable because rows are sorted by
  count. (`behandlung-breakdown.ts`)
- **Hardcoded KPI deltas (rejected).** The reference showed static "+x %" badges.
  I compute **real signed deltas vs. the previous week** in `computeKpis()` and
  distinguish percentage-point changes (utilization, no-show) from relative changes
  (counts, duration), collapsing to "—" when there is no prior week.
- **Hardcoded insights (rejected).** The reference hardcoded four findings. The
  "Auffälligkeiten" feed is now **fully data-driven** from the analytics layer.
- **Grouped bars → stacked-to-capacity (changed).** For the daily trend I stacked
  attended + no-show + free minutes to the full daily capacity and overlaid the
  utilization line, which makes *lost* capacity visually obvious and reuses the
  precomputed `freiMin`.
- **Added what the reference lacked (added).** A **per-week data-quality card** —
  there is no React equivalent. Given how dirty the input is, surfacing exactly how
  many rows were excluded and why (with the offending rows always listed underneath)
  is what keeps the headline numbers credible.
- **No midday lunch shading (changed).** The reference shaded a lunch band; since
  `buildTimeline()` skips lunch buckets entirely, there are no midday points to
  shade, so I removed it rather than fake a gap.

---

## Assumptions

- Opening hours **08:00–18:00**, lunch **12:00–13:00**, working days **Mon–Fri**,
  target utilization **80 %** (all configurable via `PRAXIS_CONFIG`).
- Capacity scales with the **number of distinct doctors** found in the data.
- Cancelled appointments **did not consume capacity** and are excluded from
  utilization, but are still counted and reported.
- Datetimes are **local wall-clock** and parsed manually to stay timezone-stable.
- The "current" week defaults to the **most recent** week in the dataset.

---

## Known limitations / next steps

- Search, export and notifications in the top bar are presentational placeholders
  (out of scope for a single-view challenge).
- No e2e tests; unit coverage focuses on the domain layer where the risk lives.
- A real deployment would load the dataset from an API and add an HTTP error/retry
  UX beyond the current inline error state.

---

## Testing

38 specs run under Karma + Jasmine, covering time helpers, normalization (incl.
the dirty-row edge cases), KPI maths, heatmap, timeline, insights, and the app
shell. Run `npm test`.
