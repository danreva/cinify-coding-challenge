import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { AppointmentsActions } from './appointments.actions';
import { AppointmentsDataService } from '../../data-access/appointments.data.service';
import { normalizeAppointments } from '../../core/domain/normalize/normalize-appointments';
import { PRAXIS_CONFIG } from '../../core/config/opening-hours.token';

@Injectable()
export class AppointmentsEffects {
  private readonly actions$ = inject(Actions);
  private readonly data = inject(AppointmentsDataService);
  private readonly config = inject(PRAXIS_CONFIG);

  readonly load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AppointmentsActions.load),
      switchMap(() =>
        this.data.loadRaw().pipe(
          map((file) => {
            const { appointments, meta, quality } = normalizeAppointments(file, this.config);
            return AppointmentsActions.loadSuccess({ appointments, meta, quality });
          }),
          catchError((err: unknown) =>
            of(
              AppointmentsActions.loadFailure({
                error: err instanceof Error ? err.message : 'Daten konnten nicht geladen werden.',
              }),
            ),
          ),
        ),
      ),
    ),
  );
}
