import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Appointment } from '../../core/domain/models/appointment.model';
import { PraxisMeta } from '../../core/domain/models/praxis-meta.model';
import { DataQualityReport } from '../../core/domain/models/data-quality.model';

export const AppointmentsActions = createActionGroup({
  source: 'Appointments',
  events: {
    Load: emptyProps(),
    'Load Success': props<{
      appointments: Appointment[];
      meta: PraxisMeta;
      quality: DataQualityReport;
    }>(),
    'Load Failure': props<{ error: string }>(),
    'Select Week': props<{ weekStart: string }>(),
  },
});
