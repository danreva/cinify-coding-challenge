import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/dashboard/containers/dashboard-page/dashboard-page').then(
        (m) => m.DashboardPage,
      ),
    title: 'Praxis Cockpit · Terminauslastung',
  },
];
