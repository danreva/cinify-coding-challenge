/** Summary of how the raw dataset was cleaned, surfaced in the UI badge. */
export interface DataQualityReport {
  /** Raw rows in the file. */
  total: number;
  /** Rows that passed all hard rules (counted in metrics). */
  valid: number;
  /** total − valid. */
  excluded: number;
  issues: {
    invalidDuration: number;
    outsideOpeningHours: number;
    outsideOpeningDays: number;
    unknownStatus: number;
    /** Soft: label tidied (e.g. "sonstiges - Rezept abholen??" → Sonstiges). */
    unmappedBehandlung: number;
    /** Info: valid rows that were cancelled (excluded from utilization). */
    cancelled: number;
  };
}

/**
 * A single flagged appointment, surfaced in the data-quality card's hover list
 * so the aggregate counts can be drilled down to the exact rows behind them.
 */
export interface QualityIssueItem {
  id: string;
  /** Compact local timestamp, e.g. "Mi 24.06 · 19:30". */
  timeLabel: string;
  doctor: string;
  /** Original (possibly messy) treatment label, before cleanup. */
  behandlung: string;
  /** Human-readable reasons in German, e.g. ["außerhalb Öffnungszeit"]. */
  reasons: string[];
  /** True when at least one hard rule excluded the row from all metrics. */
  excluded: boolean;
}
