import { createFeatureSelector, createSelector } from '@ngrx/store';
import {
  appointmentsAdapter,
  appointmentsFeatureKey,
  AppointmentsState,
} from './appointments.state';
import { computeKpis } from '../../core/domain/analytics/kpis';
import { buildDailyTrend } from '../../core/domain/analytics/daily-trend';
import { buildHeatmapMatrix } from '../../core/domain/analytics/heatmap';
import { byDoctor } from '../../core/domain/analytics/by-doctor';
import { byBehandlung } from '../../core/domain/analytics/by-behandlung';
import { buildInsights } from '../../core/domain/analytics/insights';
import {
  buildDataQualityReport,
  listQualityIssues,
} from '../../core/domain/analytics/data-quality';

export const selectAppointmentsState =
  createFeatureSelector<AppointmentsState>(appointmentsFeatureKey);

const { selectAll } = appointmentsAdapter.getSelectors();

export const selectAllAppointments = createSelector(selectAppointmentsState, selectAll);
export const selectValidAppointments = createSelector(selectAllAppointments, (all) =>
  all.filter((a) => a.valid),
);

export const selectMeta = createSelector(selectAppointmentsState, (s) => s.meta);
export const selectQuality = createSelector(selectAppointmentsState, (s) => s.quality);
export const selectStatus = createSelector(selectAppointmentsState, (s) => s.status);
export const selectError = createSelector(selectAppointmentsState, (s) => s.error);
export const selectIsLoading = createSelector(
  selectStatus,
  (s) => s === 'idle' || s === 'loading',
);
export const selectBaseConfig = createSelector(selectAppointmentsState, (s) => s.config);
export const selectSelectedWeekStart = createSelector(
  selectAppointmentsState,
  (s) => s.selectedWeekStart,
);

/** Capacity roster resolved from the distinct doctors found in the data. */
export const selectEffectiveConfig = createSelector(selectBaseConfig, selectMeta, (cfg, meta) => ({
  ...cfg,
  roster: meta && meta.doctors.length > 0 ? meta.doctors.length : cfg.roster,
}));

export const selectWeeks = createSelector(selectMeta, (m) => m?.weeks ?? []);
export const selectDoctors = createSelector(selectMeta, (m) => m?.doctors ?? []);
export const selectBehandlungen = createSelector(selectMeta, (m) => m?.behandlungen ?? []);

export const selectCurrentWeekStart = createSelector(
  selectSelectedWeekStart,
  selectWeeks,
  (selected, weeks) => selected ?? (weeks.length ? weeks[weeks.length - 1] : null),
);

export const selectPrevWeekStart = createSelector(
  selectCurrentWeekStart,
  selectWeeks,
  (current, weeks) => {
    if (!current) return null;
    const i = weeks.indexOf(current);
    return i > 0 ? weeks[i - 1] : null;
  },
);

export const selectCurrentWeekAppointments = createSelector(
  selectValidAppointments,
  selectCurrentWeekStart,
  (appts, wk) => (wk ? appts.filter((a) => a.weekStart === wk) : []),
);

/** All rows for the selected week, including hard-excluded ones (for quality). */
export const selectCurrentWeekAllAppointments = createSelector(
  selectAllAppointments,
  selectCurrentWeekStart,
  (appts, wk) => (wk ? appts.filter((a) => a.weekStart === wk) : []),
);

/** Data-quality report scoped to the selected week. */
export const selectCurrentWeekQuality = createSelector(
  selectCurrentWeekAllAppointments,
  (appts) => buildDataQualityReport(appts),
);

/** Drill-down list of flagged rows for the selected week. */
export const selectCurrentWeekQualityIssues = createSelector(
  selectCurrentWeekAllAppointments,
  (appts) => listQualityIssues(appts),
);

export const selectPrevWeekAppointments = createSelector(
  selectValidAppointments,
  selectPrevWeekStart,
  (appts, wk) => (wk ? appts.filter((a) => a.weekStart === wk) : []),
);

export const selectKpis = createSelector(
  selectCurrentWeekAppointments,
  selectPrevWeekAppointments,
  selectEffectiveConfig,
  (current, prev, cfg) => computeKpis(current, prev, cfg),
);

export const selectDailyTrend = createSelector(
  selectCurrentWeekAppointments,
  selectCurrentWeekStart,
  selectEffectiveConfig,
  (current, wk, cfg) => (wk ? buildDailyTrend(current, wk, cfg) : []),
);

export const selectHeatmap = createSelector(
  selectCurrentWeekAppointments,
  selectEffectiveConfig,
  (current, cfg) => buildHeatmapMatrix(current, cfg),
);

export const selectDoctorLoad = createSelector(
  selectCurrentWeekAppointments,
  selectEffectiveConfig,
  (current, cfg) => byDoctor(current, cfg),
);

export const selectBehandlungBreakdown = createSelector(selectCurrentWeekAppointments, (current) =>
  byBehandlung(current),
);

export const selectInsights = createSelector(
  selectKpis,
  selectDailyTrend,
  selectHeatmap,
  selectDoctorLoad,
  selectBehandlungBreakdown,
  selectEffectiveConfig,
  (kpis, daily, heatmap, doctors, behandlungen, config) =>
    buildInsights({ kpis, daily, heatmap, doctors, behandlungen, config }),
);
