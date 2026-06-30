import { PraxisConfig } from '../../config/opening-hours.token';
import {
  BehandlungRow,
  DailyTrendPoint,
  DoctorLoadRow,
  Insight,
  InsightTone,
  KpiSummary,
} from '../models/analytics.model';
import { HeatmapResult } from './heatmap';
import { DAY_LABELS_LONG } from '../util/time';

/**
 * Data-driven "Auffälligkeiten" feed.
 *
 * The React reference (`components/praxis/Insights.tsx`) ships a hardcoded list
 * of four findings. Those numbers never react to the data and even reference
 * treatment types ("Vorsorge") that don't exist in this dataset. Here we instead
 * derive every insight from the already-computed analytics view-models, so the
 * panel stays truthful for any week or filter combination.
 *
 * Each rule is a small pure function returning `Insight | null`; firing rules are
 * collected, ranked by severity, and capped. Thresholds compare against the
 * week's own average rather than the (capacity-dependent) absolute target, which
 * keeps the findings meaningful even when overall utilization is low.
 */
export interface InsightInputs {
  kpis: KpiSummary;
  daily: DailyTrendPoint[];
  heatmap: HeatmapResult;
  doctors: DoctorLoadRow[];
  behandlungen: BehandlungRow[];
  config: PraxisConfig;
}

const MAX_INSIGHTS = 6;

const TONE_ORDER: Record<InsightTone, number> = { danger: 0, warn: 1, ok: 2, info: 3 };

const pct = (v: number): number => Math.round(v * 100);
const dayLong = (i: number): string => DAY_LABELS_LONG[i] ?? `Tag ${i + 1}`;

function dayUtilStats(daily: DailyTrendPoint[]): { withData: DailyTrendPoint[]; avg: number } {
  const withData = daily.filter((d) => d.kapazitaetMin > 0);
  const avg = withData.length
    ? withData.reduce((s, d) => s + d.auslastung, 0) / withData.length
    : 0;
  return { withData, avg };
}

/** Weekday with the most no-shows, naming the peak hour window. */
function noShowHotspot(heatmap: HeatmapResult): Insight | null {
  let worstDay = -1;
  let worstCount = 0;
  heatmap.matrix.forEach((row, dayIdx) => {
    const count = row.reduce((s, c) => s + c.noShow, 0);
    if (count > worstCount) {
      worstCount = count;
      worstDay = dayIdx;
    }
  });
  if (worstDay < 0 || worstCount < 2) return null;

  const hoursWithNoShow = heatmap.matrix[worstDay]
    .filter((c) => c.noShow > 0)
    .map((c) => c.hour);
  const from = Math.min(...hoursWithNoShow);
  const to = Math.max(...hoursWithNoShow) + 1;

  return {
    tone: 'danger',
    icon: 'alert-triangle',
    title: `No-Show-Häufung ${dayLong(worstDay)}`,
    body: `${worstCount} No-Shows am ${dayLong(worstDay)}, Schwerpunkt ${from}–${to} Uhr. Erinnerungs-SMS für diese Slots prüfen.`,
  };
}

/** Direction of the no-show rate vs. the previous week. */
function noShowTrend(k: KpiSummary): Insight | null {
  if (!k.hasPrev || Math.abs(k.deltaNoShow) < 0.02) return null;
  const cur = pct(k.noShowRate);
  const prev = pct(k.noShowRate - k.deltaNoShow);
  if (k.deltaNoShow > 0) {
    return {
      tone: 'warn',
      icon: 'trending-up',
      title: 'No-Show-Quote gestiegen',
      body: `No-Shows von ${prev}% auf ${cur}% gestiegen. Terminerinnerung und Wartelisten-Nachrückung prüfen.`,
    };
  }
  return {
    tone: 'ok',
    icon: 'trending-down',
    title: 'No-Show-Quote gesunken',
    body: `No-Shows von ${prev}% auf ${cur}% gesunken — Maßnahmen wirken, beibehalten.`,
  };
}

/** Effective-utilization swing vs. the previous week (only on meaningful change). */
function utilizationTrend(k: KpiSummary): Insight | null {
  if (!k.hasPrev || Math.abs(k.deltaAuslastung) < 0.02) return null;
  const up = k.deltaAuslastung > 0;
  return {
    tone: up ? 'ok' : 'warn',
    icon: up ? 'trending-up' : 'trending-down',
    title: up ? 'Auslastung gestiegen' : 'Auslastung gesunken',
    body: `Effektive Auslastung ${up ? '+' : ''}${pct(k.deltaAuslastung)} Pp ggü. Vorwoche auf ${pct(k.auslastungEffektiv)}%.`,
  };
}

/** Day clearly above the week's own average utilization. */
function bestDay(daily: DailyTrendPoint[]): Insight | null {
  const { withData, avg } = dayUtilStats(daily);
  if (withData.length < 2 || avg <= 0) return null;
  const top = withData.reduce((a, b) => (b.auslastung > a.auslastung ? b : a));
  if (top.auslastung <= avg * 1.25) return null;
  return {
    tone: 'ok',
    icon: 'trending-up',
    title: `${dayLong(top.dayIdx)} am stärksten ausgelastet`,
    body: `${pct(top.auslastung)}% effektive Auslastung, deutlich über dem Wochenschnitt (${pct(avg)}%).`,
  };
}

/** Day clearly below the week's own average utilization. */
function weakDay(daily: DailyTrendPoint[]): Insight | null {
  const { withData, avg } = dayUtilStats(daily);
  if (withData.length < 2 || avg <= 0) return null;
  const low = withData.reduce((a, b) => (b.auslastung < a.auslastung ? b : a));
  if (low.auslastung >= avg * 0.6) return null;
  return {
    tone: 'warn',
    icon: 'clock',
    title: `${dayLong(low.dayIdx)} schwach ausgelastet`,
    body: `Nur ${pct(low.auslastung)}% belegt (Wochenschnitt ${pct(avg)}%). Planbare Kontroll-/Routinetermine hierher verlagern.`,
  };
}

/** No-show volume and the slots it frees up. */
function noShowImpact(k: KpiSummary): Insight | null {
  if (k.noShow < 2) return null;
  return {
    tone: 'info',
    icon: 'calendar-x',
    title: `${k.noShow} No-Shows diese Woche`,
    body: `No-Show-Quote ${pct(k.noShowRate)}% (${k.noShow} von ${k.termineTotal} Terminen). Wartelisten-Nachrückung kann freie Slots auffangen.`,
  };
}

/** Either a reliably attended popular treatment, or the dominant treatment share. */
function treatmentMix(behandlungen: BehandlungRow[]): Insight | null {
  const total = behandlungen.reduce((s, b) => s + b.count, 0);
  if (total === 0) return null;

  const reliable = behandlungen.find((b) => b.noShow === 0 && b.count >= 3);
  if (reliable) {
    return {
      tone: 'info',
      icon: 'lightbulb',
      title: `${reliable.name} ohne No-Shows`,
      body: `${reliable.name} (${reliable.count} Termine) mit 0 % No-Show — zuverlässig planbar, Anteil ggf. erhöhen.`,
    };
  }

  const top = behandlungen[0];
  return {
    tone: 'info',
    icon: 'lightbulb',
    title: `${top.name} dominiert das Aufkommen`,
    body: `${top.name} macht ${Math.round((top.count / total) * 100)} % der gebuchten Termine aus (${top.count} von ${total}).`,
  };
}

/** Notable load imbalance between the busiest and quietest doctor. */
function doctorBalance(doctors: DoctorLoadRow[]): Insight | null {
  if (doctors.length < 2) return null;
  const top = doctors[0];
  const bottom = doctors[doctors.length - 1];
  if (bottom.load <= 0 || top.load / bottom.load < 1.4) return null;
  return {
    tone: 'info',
    icon: 'users',
    title: 'Ungleiche Arzt-Auslastung',
    body: `${top.name} (${pct(top.load)}%) ist deutlich stärker ausgelastet als ${bottom.name} (${pct(bottom.load)}%). Terminverteilung prüfen.`,
  };
}

/**
 * Build the ranked insight feed for a week. Pure: every input is a precomputed
 * view-model, so this can be memoized by an NgRx selector.
 */
export function buildInsights(inputs: InsightInputs): Insight[] {
  const { kpis, daily, heatmap, doctors, behandlungen } = inputs;
  const candidates: (Insight | null)[] = [
    noShowHotspot(heatmap),
    noShowTrend(kpis),
    utilizationTrend(kpis),
    bestDay(daily),
    weakDay(daily),
    noShowImpact(kpis),
    treatmentMix(behandlungen),
    doctorBalance(doctors),
  ];

  return candidates
    .filter((x): x is Insight => x !== null)
    .sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone])
    .slice(0, MAX_INSIGHTS);
}
