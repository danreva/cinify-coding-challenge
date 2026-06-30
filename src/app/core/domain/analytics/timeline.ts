import { PraxisConfig } from '../../config/opening-hours.token';
import { Appointment, AppointmentStatus } from '../models/appointment.model';
import {
  TimelineFilters,
  TimelinePoint,
  TimelineResult,
  TimelineStats,
} from '../models/analytics.model';
import { DAY_LABELS, formatHHmm, overlapMinutes } from '../util/time';

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

/**
 * Intraday utilization across the working week in fixed-size buckets.
 * Lunch buckets are skipped so the x-axis capacity stays consistent with the
 * headline KPI (which also excludes the break). Attended minutes are allocated
 * by overlap; no-show appointments are counted per bucket they touch.
 */
export function buildTimeline(
  week: Appointment[],
  filters: TimelineFilters,
  config: PraxisConfig,
): TimelineResult {
  const filtered = week.filter(
    (a) =>
      (filters.arzt === 'ALL' || a.doctor === filters.arzt) &&
      (filters.behandlung === 'ALL' || a.behandlungGroup === filters.behandlung),
  );

  const bucket = filters.bucketMin;
  const points: TimelinePoint[] = [];
  let idx = 0;

  config.workingDays.forEach((dow, dayIdx) => {
    const dayAppts = filtered.filter((a) => a.dayOfWeek === dow);
    let firstOfDay = true;

    for (let t = config.openFromHour * 60; t < config.openToHour * 60; t += bucket) {
      const isLunch = t >= config.lunchFromHour * 60 && t < config.lunchToHour * 60;
      if (isLunch) continue;

      const binStart = t;
      const binEnd = t + bucket;
      const capacity = config.roster * bucket;
      let busy = 0;
      let noShowMin = 0;
      let noShowBusy = 0;

      for (const a of dayAppts) {
        const ov = overlapMinutes(a.minuteOfDay, a.minuteOfDay + a.durationMin, binStart, binEnd);
        if (ov <= 0) continue;
        if (a.status === AppointmentStatus.Attended) busy += ov;
        else if (a.status === AppointmentStatus.NoShow) {
          noShowMin += ov;
          noShowBusy += 1;
        }
      }

      points.push({
        idx: idx++,
        dayIdx,
        dayLabel: DAY_LABELS[dayIdx] ?? `T${dayIdx + 1}`,
        isDayStart: firstOfDay,
        minuteOfDay: t,
        timeLabel: formatHHmm(t),
        capacity,
        busy,
        noShowBusy,
        auslastungPct: capacity > 0 ? clamp(Math.round((busy / capacity) * 100), 0, 100) : 0,
        noShowPct: capacity > 0 ? clamp(Math.round((noShowMin / capacity) * 100), 0, 100) : 0,
      });
      firstOfDay = false;
    }
  });

  return { points, stats: computeStats(points) };
}

/** Moving-average smoothing within each day (no bleed across day boundaries). */
export function smoothTimeline(points: TimelinePoint[], windowSize: number): TimelinePoint[] {
  if (windowSize <= 1) return points;
  const half = Math.floor(windowSize / 2);
  return points.map((p, i) => {
    let sumA = 0;
    let sumN = 0;
    let n = 0;
    for (let k = -half; k <= half; k++) {
      const q = points[i + k];
      if (!q || q.dayIdx !== p.dayIdx) continue;
      sumA += q.auslastungPct;
      sumN += q.noShowPct;
      n++;
    }
    return {
      ...p,
      auslastungPct: Math.round(sumA / Math.max(n, 1)),
      noShowPct: Math.round(sumN / Math.max(n, 1)),
    };
  });
}

function computeStats(data: TimelinePoint[]): TimelineStats {
  if (data.length === 0) {
    return { avg: 0, peak: null, low: null, noShowSlots: 0, noShowAvg: 0 };
  }
  let peak = data[0];
  let low = data[0];
  let noShowSlots = 0;
  let noShowSum = 0;
  let sum = 0;
  for (const p of data) {
    sum += p.auslastungPct;
    if (p.auslastungPct > peak.auslastungPct) peak = p;
    if (p.auslastungPct < low.auslastungPct) low = p;
    noShowSlots += p.noShowBusy;
    noShowSum += p.noShowPct;
  }
  return {
    avg: Math.round(sum / data.length),
    peak,
    low,
    noShowSlots,
    noShowAvg: Math.round(noShowSum / data.length),
  };
}
