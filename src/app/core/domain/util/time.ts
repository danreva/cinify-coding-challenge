import { format, getISOWeek, startOfWeek } from 'date-fns';
import { PraxisConfig } from '../../config/opening-hours.token';

export const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'] as const;
/** Full Mon–Sun set, used where dirty rows can fall on a weekend. */
export const DAY_LABELS_7 = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;
export const DAY_LABELS_LONG = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
] as const;

/**
 * Parse "YYYY-MM-DDTHH:mm:ss" as **local** wall-clock time.
 * Done manually to avoid the date-only-vs-datetime UTC parsing pitfall and to
 * stay deterministic regardless of the host timezone.
 */
export function parseLocalDateTime(value: string): Date {
  const [datePart, timePart = '00:00:00'] = value.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm, ss = 0] = timePart.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, ss);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoDayOfWeek(date: Date): number {
  return ((date.getDay() + 6) % 7) + 1;
}

export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** ISO date (yyyy-MM-dd) of the Monday of the given date's week. */
export function weekStartISO(date: Date): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

/** Add days to an ISO date string, returning an ISO date string. */
export function addDaysISO(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return format(new Date(y, m - 1, d + days), 'yyyy-MM-dd');
}

/** ISO week number (1–53) for an ISO date string (yyyy-MM-dd). */
export function isoWeek(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return getISOWeek(new Date(y, m - 1, d));
}

/** Compact Mon–Fri range label for a week, e.g. "15.06.–19.06.2026". */
export function weekRangeLabel(weekStart: string): string {
  const [y, m, d] = weekStart.split('-').map(Number);
  const mon = new Date(y, m - 1, d);
  const fri = new Date(y, m - 1, d + 4);
  return `${format(mon, 'dd.MM.')}–${format(fri, 'dd.MM.yyyy')}`;
}

/** Human label like "Mo 16.06" for a working-day index within a week. */
export function dayDateLabel(weekStart: string, dayIdx: number): string {
  const [y, m, d] = weekStart.split('-').map(Number);
  const date = new Date(y, m - 1, d + dayIdx);
  return `${DAY_LABELS[dayIdx]} ${format(date, 'dd.MM')}`;
}

/** Compact local timestamp like "Mi 24.06 · 19:30" for an ISO datetime string. */
export function dateTimeLabel(start: string): string {
  const date = parseLocalDateTime(start);
  return `${DAY_LABELS_7[isoDayOfWeek(date) - 1]} ${format(date, 'dd.MM')} · ${format(date, 'HH:mm')}`;
}

export function formatHHmm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Overlap (in minutes) between two [start, end) intervals. */
export function overlapMinutes(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): number {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}

/** Net open minutes per day, lunch break excluded. */
export function openMinutesPerDay(c: PraxisConfig): number {
  const open = (c.openToHour - c.openFromHour) * 60;
  const lunch = (c.lunchToHour - c.lunchFromHour) * 60;
  return open - lunch;
}

/** Initials from a doctor name, dropping the "Dr." title. */
export function doctorInitials(name: string): string {
  const surname = name.replace(/^dr\.?\s*/i, '').trim();
  return surname.slice(0, 2).toUpperCase() || name.slice(0, 2).toUpperCase();
}
