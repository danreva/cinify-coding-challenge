/** View-model shapes produced by the analytics layer and consumed by components. */

import { Appointment } from './appointment.model';

export interface KpiSummary {
  /** Effective utilization (attended minutes / capacity), 0..1. */
  auslastungEffektiv: number;
  /** Booked utilization (attended + no-show minutes / capacity), 0..1. */
  auslastungGebucht: number;
  /** Capacity lost to no-shows (gebucht − effektiv), 0..1. */
  luecke: number;
  /** no_show / (attended + no_show), 0..1. */
  noShowRate: number;
  /** Booked appointments (attended + no_show). */
  termineTotal: number;
  attended: number;
  noShow: number;
  cancelled: number;
  /** Average attended duration in minutes. */
  avgDauer: number;
  /** Signed change vs. previous week (points for rates, ratios for counts). */
  deltaAuslastung: number;
  deltaNoShow: number;
  deltaTermine: number;
  deltaAvgDauer: number;
  /** Whether a previous week existed to compute deltas. */
  hasPrev: boolean;
}

export interface DailyTrendPoint {
  dayIdx: number;
  label: string;
  date: string;
  kapazitaetMin: number;
  wahrgenommenMin: number;
  noShowMin: number;
  freiMin: number;
  auslastung: number;
}

export interface HeatCell {
  hour: number;
  capacity: number;
  /** Attended minutes overlapping the hour. */
  seen: number;
  /** No-show appointments overlapping the hour. */
  noShow: number;
  util: number;
  closed: boolean;
  /** Appointments overlapping the hour, sorted by start (for the drill-down). */
  appts: Appointment[];
}

export interface TimelinePoint {
  idx: number;
  dayIdx: number;
  dayLabel: string;
  isDayStart: boolean;
  minuteOfDay: number;
  timeLabel: string;
  capacity: number;
  busy: number;
  noShowBusy: number;
  auslastungPct: number;
  noShowPct: number;
}

export interface TimelineStats {
  avg: number;
  peak: TimelinePoint | null;
  low: TimelinePoint | null;
  noShowSlots: number;
  noShowAvg: number;
}

export interface TimelineResult {
  points: TimelinePoint[];
  stats: TimelineStats;
}

export interface DoctorLoadRow {
  name: string;
  initials: string;
  schwerpunkt: string;
  load: number;
  seen: number;
  noShow: number;
}

export interface BehandlungRow {
  name: string;
  count: number;
  noShow: number;
}

export type InsightTone = 'danger' | 'warn' | 'ok' | 'info';

export interface Insight {
  tone: InsightTone;
  icon: string;
  title: string;
  body: string;
}

export interface TimelineFilters {
  arzt: string | 'ALL';
  behandlung: string | 'ALL';
  bucketMin: 15 | 30 | 60;
}
