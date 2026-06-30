import { buildHeatmapMatrix } from './heatmap';
import { DEFAULT_PRAXIS_CONFIG } from '../../config/opening-hours.token';
import { Appointment, AppointmentStatus } from '../models/appointment.model';

const A = (over: Partial<Appointment>): Appointment => ({
  id: 'x',
  start: '2026-06-15T08:00:00',
  dayOfWeek: 1,
  minuteOfDay: 480,
  durationMin: 60,
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

const config = { ...DEFAULT_PRAXIS_CONFIG, roster: 1, workingDays: [1] };

describe('buildHeatmapMatrix', () => {
  const { hours, matrix } = buildHeatmapMatrix(
    [
      A({ minuteOfDay: 480, durationMin: 60 }), // 08:00 attended -> hour 8 full
      A({ minuteOfDay: 600, durationMin: 30, status: AppointmentStatus.NoShow }), // 10:00 no-show
    ],
    config,
  );

  it('produces one column per open hour', () => {
    expect(hours).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    expect(matrix[0].length).toBe(10);
  });

  it('marks a fully booked hour as 100% utilized', () => {
    const hour8 = matrix[0][0];
    expect(hour8.seen).toBe(60);
    expect(hour8.util).toBe(1);
  });

  it('marks lunch as closed with zero capacity', () => {
    const lunch = matrix[0][hours.indexOf(12)];
    expect(lunch.closed).toBeTrue();
    expect(lunch.capacity).toBe(0);
    expect(lunch.util).toBe(0);
  });

  it('counts no-shows in the overlapping hour', () => {
    const hour10 = matrix[0][hours.indexOf(10)];
    expect(hour10.noShow).toBe(1);
  });

  it('attaches the overlapping appointments to each cell', () => {
    const hour8 = matrix[0][0];
    const hour10 = matrix[0][hours.indexOf(10)];
    expect(hour8.appts.length).toBe(1);
    expect(hour8.appts[0].status).toBe(AppointmentStatus.Attended);
    expect(hour10.appts.length).toBe(1);
    expect(hour10.appts[0].status).toBe(AppointmentStatus.NoShow);
  });
});
