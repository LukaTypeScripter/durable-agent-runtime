import type { Routes } from '@angular/router';

export const RUNS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/runs-console/runs-console.js').then((m) => m.RunsConsole),
  },
];
