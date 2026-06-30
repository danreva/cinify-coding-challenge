import {
  Appointment,
  AppointmentFlag,
  AppointmentStatus,
  HARD_FLAGS,
} from '../models/appointment.model';
import { DataQualityReport, QualityIssueItem } from '../models/data-quality.model';
import { dateTimeLabel } from '../util/time';

/** German labels for each flag, shared by the chips and the drill-down list. */
const FLAG_LABELS: Record<AppointmentFlag, string> = {
  invalidDuration: 'ungültige Dauer',
  outsideOpeningHours: 'außerhalb Öffnungszeit',
  outsideOpeningDays: 'außerhalb Öffnungstage',
  unknownStatus: 'unbek. Status',
  unmappedBehandlung: 'Label bereinigt',
};

const CANCELLED_LABEL = 'abgesagt (nicht in Auslastung)';

/**
 * Aggregate a data-quality report from a set of already-normalized appointments.
 * Works over any slice (whole file or a single week) because every appointment
 * carries its own flags, so the same logic powers both the global report built
 * during normalization and the per-week card.
 */
export function buildDataQualityReport(appts: Appointment[]): DataQualityReport {
  const report: DataQualityReport = {
    total: appts.length,
    valid: 0,
    excluded: 0,
    issues: {
      invalidDuration: 0,
      outsideOpeningHours: 0,
      outsideOpeningDays: 0,
      unknownStatus: 0,
      unmappedBehandlung: 0,
      cancelled: 0,
    },
  };

  for (const a of appts) {
    if (a.flags.includes('invalidDuration')) report.issues.invalidDuration++;
    if (a.flags.includes('outsideOpeningHours')) report.issues.outsideOpeningHours++;
    if (a.flags.includes('outsideOpeningDays')) report.issues.outsideOpeningDays++;
    if (a.flags.includes('unknownStatus')) report.issues.unknownStatus++;
    if (a.flags.includes('unmappedBehandlung')) report.issues.unmappedBehandlung++;
    if (a.valid && a.status === AppointmentStatus.Cancelled) report.issues.cancelled++;
    if (a.valid) report.valid++;
  }
  report.excluded = report.total - report.valid;

  return report;
}

/**
 * Per-appointment drill-down behind the aggregate counts: every row that was
 * flagged or cancelled, with its reasons. Hard-excluded rows are listed first,
 * then chronologically, so the most impactful problems surface at the top.
 */
export function listQualityIssues(appts: Appointment[]): QualityIssueItem[] {
  const items: QualityIssueItem[] = [...appts]
    .sort((a, b) => a.start.localeCompare(b.start))
    .flatMap((a) => {
      const reasons = a.flags.map((f) => FLAG_LABELS[f]);
      if (a.valid && a.status === AppointmentStatus.Cancelled) reasons.push(CANCELLED_LABEL);
      if (reasons.length === 0) return [];
      return [
        {
          id: a.id,
          timeLabel: dateTimeLabel(a.start),
          doctor: a.doctor,
          behandlung: a.behandlung,
          reasons,
          excluded: a.flags.some((f) => HARD_FLAGS.includes(f)),
        } satisfies QualityIssueItem,
      ];
    });

  // Stable sort keeps the chronological order within each group.
  return items.sort((x, y) => Number(y.excluded) - Number(x.excluded));
}
