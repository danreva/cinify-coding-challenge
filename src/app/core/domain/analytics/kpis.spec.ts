import { computeKpis } from './kpis';
import { DEFAULT_PRAXIS_CONFIG } from '../../config/opening-hours.token';
import { Appointment, AppointmentStatus } from '../models/appointment.model';

const A = (over: Partial<Appointment>): Appointment => ({
  id: 'x',
  start: '2026-06-15T08:00:00',
  dayOfWeek: 1,
  minuteOfDay: 480,
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

// roster = 1 -> weekly capacity = 5 days * 540 min = 2700 min
const config = { ...DEFAULT_PRAXIS_CONFIG, roster: 1 };

describe('computeKpis', () => {
  const week: Appointment[] = [
    A({ status: AppointmentStatus.Attended, durationMin: 180 }),
    A({ status: AppointmentStatus.Attended, durationMin: 180 }),
    A({ status: AppointmentStatus.Attended, durationMin: 180 }),
    A({ status: AppointmentStatus.NoShow, durationMin: 270 }),
    A({ status: AppointmentStatus.Cancelled, durationMin: 60 }),
  ];

  it('computes effective vs booked utilization against capacity', () => {
    const k = computeKpis(week, [], config);
    // attended 540 / 2700 = 0.2 ; booked (540+270)/2700 = 0.3
    expect(k.auslastungEffektiv).toBeCloseTo(0.2, 5);
    expect(k.auslastungGebucht).toBeCloseTo(0.3, 5);
    expect(k.luecke).toBeCloseTo(0.1, 5);
  });

  it('derives counts, no-show rate and average duration', () => {
    const k = computeKpis(week, [], config);
    expect(k.attended).toBe(3);
    expect(k.noShow).toBe(1);
    expect(k.cancelled).toBe(1);
    expect(k.termineTotal).toBe(4); // attended + no_show (cancelled excluded)
    expect(k.noShowRate).toBeCloseTo(0.25, 5);
    expect(k.avgDauer).toBe(180);
  });

  it('reports no deltas when there is no previous week', () => {
    const k = computeKpis(week, [], config);
    expect(k.hasPrev).toBeFalse();
    expect(k.deltaAuslastung).toBe(0);
    expect(k.deltaNoShow).toBe(0);
  });

  it('computes signed utilization delta vs the previous week', () => {
    const prev: Appointment[] = [A({ status: AppointmentStatus.Attended, durationMin: 270 })];
    const k = computeKpis(week, prev, config);
    expect(k.hasPrev).toBeTrue();
    // prev effektiv 270/2700 = 0.1 ; cur 0.2 -> +0.1
    expect(k.deltaAuslastung).toBeCloseTo(0.1, 5);
  });
});
