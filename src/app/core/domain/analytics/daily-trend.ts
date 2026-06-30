import { PraxisConfig } from '../../config/opening-hours.token';
import { Appointment, AppointmentStatus } from '../models/appointment.model';
import { DailyTrendPoint } from '../models/analytics.model';
import { addDaysISO, DAY_LABELS, openMinutesPerDay } from '../util/time';

/** Per-working-day capacity / attended / no-show breakdown for the trend chart. */
export function buildDailyTrend(
  week: Appointment[],
  weekStart: string,
  config: PraxisConfig,
): DailyTrendPoint[] {
  const capacity = openMinutesPerDay(config) * config.roster;

  return config.workingDays.map((dow, i) => {
    const dayAppts = week.filter((a) => a.dayOfWeek === dow);
    const wahrgenommenMin = dayAppts
      .filter((a) => a.status === AppointmentStatus.Attended)
      .reduce((s, a) => s + a.durationMin, 0);
    const noShowMin = dayAppts
      .filter((a) => a.status === AppointmentStatus.NoShow)
      .reduce((s, a) => s + a.durationMin, 0);

    return {
      dayIdx: i,
      label: DAY_LABELS[i] ?? `T${i + 1}`,
      date: addDaysISO(weekStart, i),
      kapazitaetMin: capacity,
      wahrgenommenMin,
      noShowMin,
      freiMin: Math.max(0, capacity - wahrgenommenMin - noShowMin),
      auslastung: capacity > 0 ? wahrgenommenMin / capacity : 0,
    };
  });
}
