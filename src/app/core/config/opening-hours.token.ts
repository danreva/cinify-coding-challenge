import { InjectionToken } from '@angular/core';

/**
 * Practice configuration. Kept as a plain, serializable object so it can live in
 * the NgRx store and be passed into the framework-agnostic domain functions.
 *
 * Defaults reflect the dataset's stated opening hours:
 *   Mo–Fr 08:00–18:00, Mittagspause 12:00–13:00.
 */
export interface PraxisConfig {
  /** First open hour (inclusive), 24h clock. */
  openFromHour: number;
  /** Last open hour (exclusive), 24h clock. */
  openToHour: number;
  /** Lunch break start hour (inclusive). */
  lunchFromHour: number;
  /** Lunch break end hour (exclusive). */
  lunchToHour: number;
  /** ISO weekdays the practice is open (1 = Mon … 7 = Sun). */
  workingDays: number[];
  /** Utilization target used for reference lines (0..1). */
  targetUtilization: number;
  /**
   * Number of parallel treatment streams used as the capacity basis.
   * Resolved at runtime from the distinct doctors found in the data; this value
   * is the fallback when no data is loaded yet.
   */
  roster: number;
}

export const DEFAULT_PRAXIS_CONFIG: PraxisConfig = {
  openFromHour: 8,
  openToHour: 18,
  lunchFromHour: 12,
  lunchToHour: 13,
  workingDays: [1, 2, 3, 4, 5],
  targetUtilization: 0.8,
  roster: 3,
};

export const PRAXIS_CONFIG = new InjectionToken<PraxisConfig>('PRAXIS_CONFIG', {
  factory: () => DEFAULT_PRAXIS_CONFIG,
});
