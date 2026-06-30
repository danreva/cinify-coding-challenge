import { PraxisConfig } from '../../config/opening-hours.token';
import { Appointment, AppointmentStatus } from '../models/appointment.model';
import { DoctorLoadRow } from '../models/analytics.model';
import { doctorInitials, openMinutesPerDay } from '../util/time';

interface DoctorAgg {
  seen: number;
  noShow: number;
  attendedMin: number;
  byBehandlung: Map<string, number>;
}

/** Per-doctor load for the week (attended minutes / per-doctor weekly capacity). */
export function byDoctor(week: Appointment[], config: PraxisConfig): DoctorLoadRow[] {
  const capacityPerDoctor = config.workingDays.length * openMinutesPerDay(config);
  const map = new Map<string, DoctorAgg>();

  for (const a of week) {
    if (!a.doctor) continue;
    let agg = map.get(a.doctor);
    if (!agg) {
      agg = { seen: 0, noShow: 0, attendedMin: 0, byBehandlung: new Map() };
      map.set(a.doctor, agg);
    }
    if (a.status === AppointmentStatus.Attended) {
      agg.seen += 1;
      agg.attendedMin += a.durationMin;
      agg.byBehandlung.set(
        a.behandlungGroup,
        (agg.byBehandlung.get(a.behandlungGroup) ?? 0) + 1,
      );
    } else if (a.status === AppointmentStatus.NoShow) {
      agg.noShow += 1;
    }
  }

  return [...map.entries()]
    .map(([name, agg]) => {
      let schwerpunkt = '—';
      let top = -1;
      for (const [k, v] of agg.byBehandlung) {
        if (v > top) {
          top = v;
          schwerpunkt = k;
        }
      }
      return {
        name,
        initials: doctorInitials(name),
        schwerpunkt,
        load: capacityPerDoctor > 0 ? agg.attendedMin / capacityPerDoctor : 0,
        seen: agg.seen,
        noShow: agg.noShow,
      } satisfies DoctorLoadRow;
    })
    .sort((a, b) => b.load - a.load);
}
