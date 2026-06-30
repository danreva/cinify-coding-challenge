import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { Appointment } from '../../core/domain/models/appointment.model';
import { PraxisMeta } from '../../core/domain/models/praxis-meta.model';
import { DataQualityReport } from '../../core/domain/models/data-quality.model';
import { DEFAULT_PRAXIS_CONFIG, PraxisConfig } from '../../core/config/opening-hours.token';

export const appointmentsFeatureKey = 'appointments';

export type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * All normalized appointments (valid *and* flagged) live in the entity map so
 * the data-quality view can stay honest; selectors narrow to valid rows for
 * metrics. Only serializable data is stored — no `Date` objects.
 */
export interface AppointmentsState extends EntityState<Appointment> {
  meta: PraxisMeta | null;
  quality: DataQualityReport | null;
  /** Base practice config; the capacity `roster` is resolved in selectors. */
  config: PraxisConfig;
  status: LoadStatus;
  error: string | null;
  /** ISO Monday of the week currently in view (null → latest week). */
  selectedWeekStart: string | null;
}

export const appointmentsAdapter = createEntityAdapter<Appointment>({
  selectId: (a) => a.id,
});

export const initialAppointmentsState: AppointmentsState = appointmentsAdapter.getInitialState({
  meta: null,
  quality: null,
  config: DEFAULT_PRAXIS_CONFIG,
  status: 'idle',
  error: null,
  selectedWeekStart: null,
});
