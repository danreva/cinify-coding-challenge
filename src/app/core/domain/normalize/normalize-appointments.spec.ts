import { normalizeAppointments } from './normalize-appointments';
import { DEFAULT_PRAXIS_CONFIG } from '../../config/opening-hours.token';
import { AppointmentStatus, RawPraxisFile } from '../models/appointment.model';

function file(termine: RawPraxisFile['termine']): RawPraxisFile {
  return {
    praxis: 'Test',
    zeitraum: { von: '2026-06-15', bis: '2026-07-03' },
    oeffnungszeiten_hinweis: 'Mo-Fr 08:00-18:00',
    termine,
  };
}

describe('normalizeAppointments', () => {
  const result = normalizeAppointments(
    file([
      // 0: clean attended row
      {
        termin_id: 'T1',
        datum: '2026-06-15T09:00:00',
        dauer_minuten: 30,
        behandlungsart: 'Blutabnahme',
        arzt: 'Dr. Brandt',
        status: 'wahrgenommen',
        neupatient: false,
      },
      // 1: invalid duration (hard)
      {
        termin_id: 'T2',
        datum: '2026-06-15T11:00:00',
        dauer_minuten: 0,
        behandlungsart: 'Impfung',
        arzt: 'Dr. Brandt',
        status: 'wahrgenommen',
        neupatient: false,
      },
      // 2: Saturday -> outside opening days (hard)
      {
        termin_id: 'T3',
        datum: '2026-06-20T09:00:00',
        dauer_minuten: 30,
        behandlungsart: 'Impfung',
        arzt: 'Dr. Brandt',
        status: 'wahrgenommen',
        neupatient: false,
      },
      // 3: 19:00 -> outside opening hours (hard)
      {
        termin_id: 'T4',
        datum: '2026-06-15T19:00:00',
        dauer_minuten: 30,
        behandlungsart: 'EKG',
        arzt: 'Dr. Brandt',
        status: 'wahrgenommen',
        neupatient: false,
      },
      // 4: null status -> unknown (hard)
      {
        termin_id: 'T5',
        datum: '2026-06-16T10:00:00',
        dauer_minuten: 20,
        behandlungsart: 'EKG',
        arzt: 'Dr. Brandt',
        status: null,
        neupatient: false,
      },
      // 5: unmapped behandlung -> soft flag, still valid
      {
        termin_id: 'T6',
        datum: '2026-06-16T14:00:00',
        dauer_minuten: 15,
        behandlungsart: 'sonstiges - Rezept abholen??',
        arzt: 'Dr. Sommer',
        status: 'wahrgenommen',
        neupatient: false,
      },
      // 6: cancelled but otherwise valid
      {
        termin_id: 'T7',
        datum: '2026-06-17T10:00:00',
        dauer_minuten: 30,
        behandlungsart: 'EKG',
        arzt: 'Dr. Yilmaz',
        status: 'abgesagt',
        neupatient: false,
      },
    ]),
    DEFAULT_PRAXIS_CONFIG,
  );

  it('counts totals, valid and excluded rows', () => {
    expect(result.quality.total).toBe(7);
    expect(result.quality.valid).toBe(3); // attended + unmapped-soft + cancelled
    expect(result.quality.excluded).toBe(4);
  });

  it('tallies each hard issue exactly once', () => {
    const i = result.quality.issues;
    expect(i.invalidDuration).toBe(1);
    expect(i.outsideOpeningDays).toBe(1);
    expect(i.outsideOpeningHours).toBe(1);
    expect(i.unknownStatus).toBe(1);
  });

  it('treats unmapped treatment as a soft flag (row stays valid)', () => {
    const soft = result.appointments.find((a) => a.id === 'T6')!;
    expect(soft.valid).toBeTrue();
    expect(soft.behandlungGroup).toBe('Sonstiges');
    expect(soft.flags).toContain('unmappedBehandlung');
    expect(result.quality.issues.unmappedBehandlung).toBe(1);
  });

  it('keeps cancelled rows valid but records them separately', () => {
    const cancelled = result.appointments.find((a) => a.id === 'T7')!;
    expect(cancelled.valid).toBeTrue();
    expect(cancelled.status).toBe(AppointmentStatus.Cancelled);
    expect(result.quality.issues.cancelled).toBe(1);
  });

  it('leaves a clean row unflagged', () => {
    const clean = result.appointments.find((a) => a.id === 'T1')!;
    expect(clean.flags).toEqual([]);
    expect(clean.valid).toBeTrue();
    expect(clean.status).toBe(AppointmentStatus.Attended);
    expect(clean.weekStart).toBe('2026-06-15');
  });

  it('derives sorted, distinct meta from valid rows only', () => {
    expect(result.meta.doctors).toEqual(['Dr. Brandt', 'Dr. Sommer', 'Dr. Yilmaz']);
    expect(result.meta.behandlungen).toEqual(['Blutabnahme', 'EKG', 'Sonstiges']);
    expect(result.meta.weeks).toEqual(['2026-06-15']);
  });
});
