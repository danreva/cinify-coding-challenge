import { createReducer, on } from '@ngrx/store';
import { AppointmentsActions } from './appointments.actions';
import {
  appointmentsAdapter,
  AppointmentsState,
  initialAppointmentsState,
} from './appointments.state';

export const appointmentsReducer = createReducer(
  initialAppointmentsState,

  on(
    AppointmentsActions.load,
    (state): AppointmentsState => ({ ...state, status: 'loading', error: null }),
  ),

  on(
    AppointmentsActions.loadSuccess,
    (state, { appointments, meta, quality }): AppointmentsState =>
      appointmentsAdapter.setAll(appointments, {
        ...state,
        meta,
        quality,
        status: 'loaded',
        error: null,
        // Default to the most recent week unless the user already picked one.
        selectedWeekStart:
          state.selectedWeekStart ??
          (meta.weeks.length ? meta.weeks[meta.weeks.length - 1] : null),
      }),
  ),

  on(
    AppointmentsActions.loadFailure,
    (state, { error }): AppointmentsState => ({ ...state, status: 'error', error }),
  ),

  on(
    AppointmentsActions.selectWeek,
    (state, { weekStart }): AppointmentsState => ({ ...state, selectedWeekStart: weekStart }),
  ),
);
