import { buildTimeline, smoothTimeline } from './timeline';
import { DEFAULT_PRAXIS_CONFIG } from '../../config/opening-hours.token';
import { Appointment, AppointmentStatus } from '../models/appointment.model';
import { TimelineFilters } from '../models/analytics.model';

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

// Single working day keeps the bucket grid small and predictable.
const config = { ...DEFAULT_PRAXIS_CONFIG, roster: 1, workingDays: [1] };
const filters: TimelineFilters = { arzt: 'ALL', behandlung: 'ALL', bucketMin: 60 };

describe('buildTimeline', () => {
  const week: Appointment[] = [
    A({ minuteOfDay: 480, durationMin: 60 }), // 08:00 fills the 08:00 bucket
    A({ minuteOfDay: 570, durationMin: 60 }), // 09:30 spans 09:00 and 10:00 buckets
    A({ minuteOfDay: 615, durationMin: 30, status: AppointmentStatus.NoShow }), // 10:15 no-show
  ];
  const { points, stats } = buildTimeline(week, filters, config);

  it('skips lunch buckets', () => {
    expect(points.length).toBe(9); // 10 open hours minus the 12:00 lunch hour
    expect(points.some((p) => p.minuteOfDay === 720)).toBeFalse();
  });

  it('allocates attended minutes to a fully booked bucket', () => {
    const at8 = points.find((p) => p.minuteOfDay === 480)!;
    expect(at8.busy).toBe(60);
    expect(at8.auslastungPct).toBe(100);
  });

  it('splits an appointment across the buckets it overlaps', () => {
    const at9 = points.find((p) => p.minuteOfDay === 540)!;
    const at10 = points.find((p) => p.minuteOfDay === 600)!;
    expect(at9.auslastungPct).toBe(50); // 30 of 60 minutes
    expect(at10.busy).toBe(30);
  });

  it('counts no-show appointments per overlapping bucket', () => {
    const at10 = points.find((p) => p.minuteOfDay === 600)!;
    expect(at10.noShowBusy).toBe(1);
    expect(stats.noShowSlots).toBe(1);
  });

  it('reports the peak bucket in stats', () => {
    expect(stats.peak?.auslastungPct).toBe(100);
    expect(stats.peak?.minuteOfDay).toBe(480);
  });
});

describe('smoothTimeline', () => {
  it('returns the input unchanged for a window of 1', () => {
    const { points } = buildTimeline([A({})], filters, config);
    expect(smoothTimeline(points, 1)).toBe(points);
  });

  it('does not bleed averages across day boundaries', () => {
    const twoDays = { ...config, workingDays: [1, 2] };
    const { points } = buildTimeline(
      [A({ dayOfWeek: 1, minuteOfDay: 480, durationMin: 60 })],
      filters,
      twoDays,
    );
    const smoothed = smoothTimeline(points, 3);
    // First bucket of day 2 must not inherit day 1's load.
    const day2Start = smoothed.find((p) => p.dayIdx === 1 && p.isDayStart)!;
    expect(day2Start.auslastungPct).toBe(0);
  });
});
