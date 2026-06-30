import { Appointment, AppointmentStatus } from '../models/appointment.model';
import { BehandlungRow } from '../models/analytics.model';

/** Booked appointments (attended + no-show) per treatment group, no-shows split out. */
export function byBehandlung(week: Appointment[]): BehandlungRow[] {
  const map = new Map<string, { count: number; noShow: number }>();

  for (const a of week) {
    if (a.status !== AppointmentStatus.Attended && a.status !== AppointmentStatus.NoShow) {
      continue;
    }
    let agg = map.get(a.behandlungGroup);
    if (!agg) {
      agg = { count: 0, noShow: 0 };
      map.set(a.behandlungGroup, agg);
    }
    agg.count += 1;
    if (a.status === AppointmentStatus.NoShow) agg.noShow += 1;
  }

  return [...map.entries()]
    .map(([name, agg]) => ({ name, count: agg.count, noShow: agg.noShow }))
    .sort((a, b) => b.count - a.count);
}
