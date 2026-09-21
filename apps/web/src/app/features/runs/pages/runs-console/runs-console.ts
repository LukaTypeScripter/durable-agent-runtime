import { Component, inject } from '@angular/core';
import { RunsStore } from '../../data-access/runs.store.js';
import { RunJournal } from '../../ui/run-journal.js';
import { RunList } from '../../ui/run-list.js';
import { StartRun } from '../../ui/start-run.js';
import type { CreateRunDto, RunStatus } from '@dar/contracts';

@Component({
  selector: 'app-runs-console',
  imports: [RunList, RunJournal, StartRun],
  template: `
    <header class="bar">
      <h1>Durable agent runtime</h1>
      <div class="bar-end">
        @if (store.awaitingCount() > 0) {
          <p class="waiting">
            {{ store.awaitingCount() }} waiting for approval
          </p>
        }
        <button
          type="button"
          class="refresh"
          [disabled]="store.isLoading()"
          [attr.aria-busy]="store.isLoading()"
          (click)="store.refresh()"
        >
          Refresh
        </button>
      </div>
    </header>

    @if (store.error(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    }

    <div class="split">
      <aside>
        <app-start-run (start)="start($event)" />

        <div class="filter">
          <label for="status">Show</label>
          <select id="status" (change)="filter($event)">
            <option value="">All runs</option>
            @for (option of statuses; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </div>
        <app-run-list
          [runs]="store.runs()"
          [selectedId]="store.selectedId()"
          (select)="store.select($event)"
        />
      </aside>

      <main>
        @if (store.selected(); as run) {
          <app-run-journal
            [run]="run"
            [events]="store.events()"
            (decide)="store.decide(run.id, $event)"
          />
        } @else {
          <p class="quiet">Select a run to see what it did.</p>
        }
      </main>
    </div>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-rows: auto 1fr;
      height: 100vh;
    }
    .bar {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      padding: var(--space-4) var(--space-6);
      border-bottom: 1px solid var(--line);
    }
    h1 {
      font-size: var(--text-lg);
    }
    .waiting {
      margin: 0;
      color: var(--amber);
      font-size: var(--text-sm);
      font-weight: 500;
    }
    .bar-end {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }
    .refresh {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--paper);
      color: var(--ink);
      font: inherit;
      font-size: var(--text-sm);
      cursor: pointer;
    }
    .refresh:hover:not(:disabled) {
      border-color: var(--ink);
    }
    .refresh:disabled {
      color: var(--graphite);
      cursor: progress;
    }
    .error {
      margin: 0;
      padding: var(--space-3) var(--space-6);
      border-bottom: 1px solid var(--line);
      background: var(--amber-wash);
      color: var(--ink);
      font-size: var(--text-sm);
    }
    .split {
      display: grid;
      grid-template-columns: minmax(18rem, 24rem) 1fr;
      min-height: 0;
    }
    .filter {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--line);
      font-size: var(--text-sm);
      color: var(--graphite);
    }
    .filter select {
      flex: 1;
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--paper);
      color: var(--ink);
      font: inherit;
      font-size: var(--text-sm);
    }
    aside {
      display: grid;
      grid-template-rows: auto auto 1fr;
      min-height: 0;
      background: var(--mist);
    }
    main {
      min-height: 0;
      overflow-y: auto;
    }
    .quiet {
      padding: var(--space-8);
      color: var(--graphite);
    }
    @media (max-width: 52rem) {
      .split {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class RunsConsole {
  protected readonly store = inject(RunsStore);

  protected readonly statuses: { value: RunStatus; label: string }[] = [
    { value: 'awaiting_approval', label: 'Waiting for approval' },
    { value: 'running', label: 'Running' },
    { value: 'pending', label: 'Queued' },
    { value: 'completed', label: 'Done' },
    { value: 'failed', label: 'Stopped' },
  ];

  protected filter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;

    this.store.filterBy(value === '' ? null : (value as RunStatus));
  }

  protected start(run: CreateRunDto): void {
    this.store.start(run);
  }
}
