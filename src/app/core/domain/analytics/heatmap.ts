import { PraxisConfig } from '../../config/opening-hours.token';
import { Appointment, AppointmentStatus } from '../models/appointment.model';
import { HeatCell } from '../models/analytics.model';
import { overlapMinutes } from '../util/time';

export interface HeatmapResult {
  hours: number[];
  /** matrix[dayIdx][hourIdx] */
  matrix: HeatCell[][];
}

/**
 * Hour × weekday utilization matrix. Attended minutes are allocated by overlap
 * so long appointments contribute to every hour they touch. Lunch hours are
 * marked closed (capacity 0).
 */
export function buildHeatmapMatrix(week: Appointment[], config: PraxisConfig): HeatmapResult {
  const hours: number[] = [];
  for (let h = config.openFromHour; h < config.openToHour; h++) hours.push(h);

  const matrix = config.workingDays.map((dow) => {
    const dayAppts = week.filter((a) => a.dayOfWeek === dow);
    return hours.map((h) => {
      const closed = h >= config.lunchFromHour && h < config.lunchToHour;
      const binStart = h * 60;
      const binEnd = (h + 1) * 60;
      let seen = 0;
      let noShow = 0;
      const appts: Appointment[] = [];
      for (const a of dayAppts) {
        const ov = overlapMinutes(a.minuteOfDay, a.minuteOfDay + a.durationMin, binStart, binEnd);
        if (ov <= 0) continue;
        appts.push(a);
        if (a.status === AppointmentStatus.Attended) seen += ov;
        else if (a.status === AppointmentStatus.NoShow) noShow += 1;
      }
      appts.sort((x, y) => x.minuteOfDay - y.minuteOfDay);
      const capacity = closed ? 0 : config.roster * 60;
      const util = capacity > 0 ? Math.min(1, seen / capacity) : 0;
      return { hour: h, capacity, seen, noShow, util, closed, appts } satisfies HeatCell;
    });
  });

  return { hours, matrix };
}
