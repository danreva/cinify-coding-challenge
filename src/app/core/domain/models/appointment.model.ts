/** Raw shapes exactly as they appear in `termindaten_beispiel.json`. */
export interface RawAppointmentDto {
  termin_id: string;
  datum: string;
  dauer_minuten: number;
  behandlungsart: string;
  arzt: string;
  status: string | null;
  neupatient: boolean;
}

export interface RawPraxisFile {
  praxis: string;
  zeitraum: { von: string; bis: string };
  oeffnungszeiten_hinweis: string;
  termine: RawAppointmentDto[];
}

/** Normalized appointment status. Unknown captures missing/garbage values. */
export enum AppointmentStatus {
  Attended = 'wahrgenommen',
  NoShow = 'no_show',
  Cancelled = 'abgesagt',
  Unknown = 'unknown',
}

/**
 * Data-quality flags raised during normalization. The first four are "hard"
 * problems that exclude a row from all metrics; `unmappedBehandlung` is a soft
 * flag (the appointment still counts, only its label was tidied up).
 */
export type AppointmentFlag =
  | 'invalidDuration'
  | 'outsideOpeningHours'
  | 'outsideOpeningDays'
  | 'unknownStatus'
  | 'unmappedBehandlung';

/** Flags that make a row ineligible for metrics / the grid. */
export const HARD_FLAGS: readonly AppointmentFlag[] = [
  'invalidDuration',
  'outsideOpeningHours',
  'outsideOpeningDays',
  'unknownStatus',
];

/**
 * Normalized, serializable appointment used throughout the store and selectors.
 * Date math is pre-computed so the store stays free of `Date` objects.
 */
export interface Appointment {
  id: string;
  /** ISO local datetime string (kept serializable for the store). */
  start: string;
  /** ISO weekday: 1 = Mon … 7 = Sun. */
  dayOfWeek: number;
  /** Minutes since midnight of the appointment start. */
  minuteOfDay: number;
  durationMin: number;
  behandlung: string;
  behandlungGroup: string;
  doctor: string;
  status: AppointmentStatus;
  isNewPatient: boolean;
  /** ISO date (yyyy-MM-dd) of the Monday of this appointment's week. */
  weekStart: string;
  flags: AppointmentFlag[];
  /** True when the row passes all hard rules and may be counted. */
  valid: boolean;
}
