import {
  addDaysISO,
  doctorInitials,
  formatHHmm,
  isoDayOfWeek,
  minutesOfDay,
  openMinutesPerDay,
  overlapMinutes,
  parseLocalDateTime,
  weekStartISO,
} from './time';
import { DEFAULT_PRAXIS_CONFIG } from '../../config/opening-hours.token';

describe('time utils', () => {
  describe('parseLocalDateTime', () => {
    it('parses wall-clock time without timezone shift', () => {
      const d = parseLocalDateTime('2026-06-15T09:30:00');
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(5); // June (0-based)
      expect(d.getDate()).toBe(15);
      expect(d.getHours()).toBe(9);
      expect(d.getMinutes()).toBe(30);
    });

    it('defaults missing time to midnight', () => {
      const d = parseLocalDateTime('2026-06-15');
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
    });
  });

  describe('isoDayOfWeek', () => {
    it('maps Monday to 1 and Saturday to 6', () => {
      expect(isoDayOfWeek(parseLocalDateTime('2026-06-15T08:00:00'))).toBe(1);
      expect(isoDayOfWeek(parseLocalDateTime('2026-06-20T08:00:00'))).toBe(6);
    });
  });

  it('minutesOfDay returns minutes since midnight', () => {
    expect(minutesOfDay(parseLocalDateTime('2026-06-15T08:20:00'))).toBe(500);
  });

  describe('overlapMinutes', () => {
    it('returns the intersection length', () => {
      expect(overlapMinutes(570, 630, 540, 600)).toBe(30);
    });
    it('returns 0 for disjoint intervals', () => {
      expect(overlapMinutes(600, 660, 480, 540)).toBe(0);
    });
  });

  it('openMinutesPerDay excludes the lunch break', () => {
    // (18-8)*60 - (13-12)*60 = 600 - 60 = 540
    expect(openMinutesPerDay(DEFAULT_PRAXIS_CONFIG)).toBe(540);
  });

  it('weekStartISO returns the Monday of the week', () => {
    expect(weekStartISO(parseLocalDateTime('2026-06-17T10:00:00'))).toBe('2026-06-15');
  });

  it('addDaysISO advances an ISO date', () => {
    expect(addDaysISO('2026-06-15', 2)).toBe('2026-06-17');
  });

  it('formatHHmm zero-pads hours and minutes', () => {
    expect(formatHHmm(500)).toBe('08:20');
    expect(formatHHmm(0)).toBe('00:00');
  });

  it('doctorInitials drops the title and uppercases', () => {
    expect(doctorInitials('Dr. Brandt')).toBe('BR');
    expect(doctorInitials('Dr. Yilmaz')).toBe('YI');
  });
});
