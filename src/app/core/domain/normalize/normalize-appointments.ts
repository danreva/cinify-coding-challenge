import { PraxisConfig } from '../../config/opening-hours.token';
import {
  Appointment,
  AppointmentFlag,
  AppointmentStatus,
  HARD_FLAGS,
  RawAppointmentDto,
  RawPraxisFile,
} from '../models/appointment.model';
import { DataQualityReport } from '../models/data-quality.model';
import { PraxisMeta } from '../models/praxis-meta.model';
import { isoDayOfWeek, minutesOfDay, parseLocalDateTime, weekStartISO } from '../util/time';
import { buildDataQualityReport } from '../analytics/data-quality';

export interface NormalizeResult {
  appointments: Appointment[];
  meta: PraxisMeta;
  quality: DataQualityReport;
}

/** Canonical treatment groups present in the dataset. */
const KNOWN_BEHANDLUNGEN = new Set<string>([
  'Blutabnahme',
  'Kontrolluntersuchung',
  'EKG',
  'Erstgespräch',
  'Wundversorgung',
  'Gesundheitscheck',
  'Ultraschall',
  'Impfung',
]);

const STATUS_MAP: Record<string, AppointmentStatus> = {
  wahrgenommen: AppointmentStatus.Attended,
  no_show: AppointmentStatus.NoShow,
  abgesagt: AppointmentStatus.Cancelled,
};

function mapStatus(raw: string | null): AppointmentStatus {
  if (!raw) return AppointmentStatus.Unknown;
  return STATUS_MAP[raw.trim().toLowerCase()] ?? AppointmentStatus.Unknown;
}

function mapBehandlung(raw: string): { group: string; mapped: boolean } {
  const value = (raw ?? '').trim();
  if (KNOWN_BEHANDLUNGEN.has(value)) return { group: value, mapped: true };
  return { group: 'Sonstiges', mapped: false };
}

function isHardInvalid(flags: AppointmentFlag[]): boolean {
  return flags.some((f) => HARD_FLAGS.includes(f));
}

/**
 * Transform the raw JSON into normalized appointments + metadata + a
 * data-quality report. Dirty rows are flagged and excluded from metrics rather
 * than silently dropped, so the UI can be honest about the data.
 */
export function normalizeAppointments(
  file: RawPraxisFile,
  config: PraxisConfig,
): NormalizeResult {
  const termine = file.termine ?? [];

  const appointments: Appointment[] = termine.map((dto: RawAppointmentDto) => {
    const date = parseLocalDateTime(dto.datum);
    const dayOfWeek = isoDayOfWeek(date);
    const minute = minutesOfDay(date);
    const duration = Number(dto.dauer_minuten) || 0;
    const status = mapStatus(dto.status);
    const { group, mapped } = mapBehandlung(dto.behandlungsart);

    const flags: AppointmentFlag[] = [];
    if (duration <= 0) flags.push('invalidDuration');
    if (status === AppointmentStatus.Unknown) flags.push('unknownStatus');
    if (!config.workingDays.includes(dayOfWeek)) flags.push('outsideOpeningDays');
    if (minute < config.openFromHour * 60 || minute >= config.openToHour * 60) {
      flags.push('outsideOpeningHours');
    }
    if (!mapped) flags.push('unmappedBehandlung');

    const valid = !isHardInvalid(flags);

    return {
      id: dto.termin_id,
      start: dto.datum,
      dayOfWeek,
      minuteOfDay: minute,
      durationMin: duration,
      behandlung: (dto.behandlungsart ?? '').trim(),
      behandlungGroup: group,
      doctor: (dto.arzt ?? '').trim(),
      status,
      isNewPatient: !!dto.neupatient,
      weekStart: weekStartISO(date),
      flags,
      valid,
    } satisfies Appointment;
  });

  // Aggregate the data-quality report from the flags computed above.
  const quality = buildDataQualityReport(appointments);

  const valid = appointments.filter((a) => a.valid);
  const doctors = [...new Set(valid.map((a) => a.doctor).filter(Boolean))].sort();
  const behandlungen = [...new Set(valid.map((a) => a.behandlungGroup))].sort();
  const weeks = [...new Set(valid.map((a) => a.weekStart))].sort();

  const meta: PraxisMeta = {
    praxis: file.praxis,
    zeitraumVon: file.zeitraum?.von ?? '',
    zeitraumBis: file.zeitraum?.bis ?? '',
    oeffnungszeitenHinweis: file.oeffnungszeiten_hinweis ?? '',
    doctors,
    behandlungen,
    weeks,
  };

  return { appointments, meta, quality };
}
