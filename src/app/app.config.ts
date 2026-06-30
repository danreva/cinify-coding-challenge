import {
  ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideEchartsCore } from 'ngx-echarts';

import { routes } from './app.routes';
import {
  appointmentsFeatureKey,
  appointmentsReducer,
  AppointmentsEffects,
} from './state/appointments';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideStore({ [appointmentsFeatureKey]: appointmentsReducer }),
    provideEffects(AppointmentsEffects),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
    // ECharts is lazy-loaded so it stays out of the initial bundle.
    provideEchartsCore({ echarts: () => import('echarts') }),
  ],
};
