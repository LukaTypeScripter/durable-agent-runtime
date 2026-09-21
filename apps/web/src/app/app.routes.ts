import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'runs',
    loadChildren: () =>
      import('./features/runs/runs.routes.js').then((m) => m.RUNS_ROUTES),
  },
  { path: '', pathMatch: 'full', redirectTo: 'runs' },
];
