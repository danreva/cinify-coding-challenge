import { buildDataQualityReport, listQualityIssues } from './data-quality';
import { Appointment, AppointmentStatus } from '../models/appointment.model';

const A = (over: Partial<Appointment>): Appointment => ({
  id: 'x',
  start: '2026-06-15T09:00:00',
  dayOfWeek: 1,
  minuteOfDay: 540,
  durationMin: 30,
  behandlung: 'Blutabnahme',
  behandlungGroup: 'Blutabnahme',
  doctor: 'Dr. Brandt',
  status: AppointmentStatus.Attended,
  isNewPatient: false,
  weekStart: '2026-06-15',
  flags: [],
  valid: true,
  ...over,
});

describe('buildDataQualityReport', () => {
  const appts: Appointment[] = [
    A({ id: 'clean' }),
    A({ id: 'dur', durationMin: 0, flags: ['invalidDuration'], valid: false }),
    A({ id: 'soft', behandlungGroup: 'Sonstiges', flags: ['unmappedBehandlung'], valid: true }),
    A({ id: 'cancel', status: AppointmentStatus.Cancelled, valid: true }),
    A({ id: 'sat', start: '2026-06-20T09:00:00', dayOfWeek: 6, flags: ['outsideOpeningDays'], valid: false }),
  ];
  const report = buildDataQualityReport(appts);

  it('counts totals, valid and excluded rows', () => {
    expect(report.total).toBe(5);
    expect(report.valid).toBe(3); // clean + soft + cancelled
    expect(report.excluded).toBe(2); // invalid duration + Saturday
  });

  it('tallies hard, soft and cancelled issues', () => {
    expect(report.issues.invalidDuration).toBe(1);
    expect(report.issues.outsideOpeningDays).toBe(1);
    expect(report.issues.unmappedBehandlung).toBe(1);
    expect(report.issues.cancelled).toBe(1);
    expect(report.issues.unknownStatus).toBe(0);
  });

  it('returns an all-zero report for an empty week', () => {
    const empty = buildDataQualityReport([]);
    expect(empty.total).toBe(0);
    expect(empty.valid).toBe(0);
    expect(empty.excluded).toBe(0);
  });
});

describe('listQualityIssues', () => {
  it('lists only flagged/cancelled rows, hard exclusions first', () => {
    const items = listQualityIssues([
      A({ id: 'clean' }),
      A({ id: 'soft', flags: ['unmappedBehandlung'], valid: true, start: '2026-06-15T08:00:00' }),
      A({ id: 'dur', durationMin: 0, flags: ['invalidDuration'], valid: false, start: '2026-06-16T08:00:00' }),
    ]);
    expect(items.map((i) => i.id)).toEqual(['dur', 'soft']); // excluded first, clean omitted
    expect(items[0].excluded).toBeTrue();
    expect(items[1].excluded).toBeFalse();
  });

  it('maps flags and cancellation to human-readable reasons', () => {
    const [hard] = listQualityIssues([A({ flags: ['outsideOpeningHours'], valid: false })]);
    expect(hard.reasons).toEqual(['außerhalb Öffnungszeit']);

    const [soft] = listQualityIssues([A({ flags: ['unmappedBehandlung'], valid: true })]);
    expect(soft.reasons).toEqual(['Label bereinigt']);
    expect(soft.excluded).toBeFalse();

    const [cancelled] = listQualityIssues([A({ status: AppointmentStatus.Cancelled, valid: true })]);
    expect(cancelled.reasons).toEqual(['abgesagt (nicht in Auslastung)']);
  });

  it('formats a compact local timestamp including weekend days', () => {
    const [item] = listQualityIssues([
      A({ start: '2026-06-20T09:00:00', dayOfWeek: 6, flags: ['outsideOpeningDays'], valid: false }),
    ]);
    expect(item.timeLabel).toBe('Sa 20.06 · 09:00');
  });
});
