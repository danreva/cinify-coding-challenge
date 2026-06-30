import { PraxisConfig } from '../../config/opening-hours.token';
import { Appointment, AppointmentStatus } from '../models/appointment.model';
import { KpiSummary } from '../models/analytics.model';
import { openMinutesPerDay } from '../util/time';

function sumDuration(appts: Appointment[]): number {
  return appts.reduce((s, a) => s + a.durationMin, 0);
}

interface WeekAgg {
  attended: number;
  noShow: number;
  cancelled: number;
  effektiv: number;
  gebucht: number;
  noShowRate: number;
  avgDauer: number;
}

function aggregate(appts: Appointment[], config: PraxisConfig): WeekAgg {
  const attended = appts.filter((a) => a.status === AppointmentStatus.Attended);
  const noShow = appts.filter((a) => a.status === AppointmentStatus.NoShow);
  const cancelled = appts.filter((a) => a.status === AppointmentStatus.Cancelled);
  const attendedMin = sumDuration(attended);
  const noShowMin = sumDuration(noShow);
  const capacity = config.workingDays.length * openMinutesPerDay(config) * config.roster;
  const booked = attended.length + noShow.length;
  return {
    attended: attended.length,
    noShow: noShow.length,
    cancelled: cancelled.length,
    effektiv: capacity > 0 ? attendedMin / capacity : 0,
    gebucht: capacity > 0 ? (attendedMin + noShowMin) / capacity : 0,
    noShowRate: booked > 0 ? noShow.length / booked : 0,
    avgDauer: attended.length > 0 ? attendedMin / attended.length : 0,
  };
}

/**
 * Headline KPIs for a week, with signed deltas vs. the previous week.
 * Rate deltas are point differences; count/duration deltas are relative ratios.
 */
export function computeKpis(
  week: Appointment[],
  prev: Appointment[],
  config: PraxisConfig,
): KpiSummary {
  const cur = aggregate(week, config);
  const hasPrev = prev.length > 0;
  const p = aggregate(prev, config);
  const rel = (a: number, b: number): number => (b > 0 ? (a - b) / b : 0);

  return {
    auslastungEffektiv: cur.effektiv,
    auslastungGebucht: cur.gebucht,
    luecke: cur.gebucht - cur.effektiv,
    noShowRate: cur.noShowRate,
    termineTotal: cur.attended + cur.noShow,
    attended: cur.attended,
    noShow: cur.noShow,
    cancelled: cur.cancelled,
    avgDauer: cur.avgDauer,
    deltaAuslastung: hasPrev ? cur.effektiv - p.effektiv : 0,
    deltaNoShow: hasPrev ? cur.noShowRate - p.noShowRate : 0,
    deltaTermine: hasPrev ? rel(cur.attended + cur.noShow, p.attended + p.noShow) : 0,
    deltaAvgDauer: hasPrev ? rel(cur.avgDauer, p.avgDauer) : 0,
    hasPrev,
  };
}
