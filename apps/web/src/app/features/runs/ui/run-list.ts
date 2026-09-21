import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import type { RunResponse } from '@dar/contracts';

@Component({
  selector: 'app-run-list',
  imports: [DatePipe],
  host: { class: 'run-list' },
  template: `
    @if (runs().length === 0) {
      <p class="empty">No runs yet. Start one to see it here.</p>
    }

    <ul>
      @for (run of runs(); track run.id) {
        <li>
          <button
            type="button"
            class="row"
            [class.selected]="run.id === selectedId()"
            [class.needs-you]="run.status === 'awaiting_approval'"
            [attr.aria-current]="run.id === selectedId()"
            (click)="select.emit(run.id)"
          >
            <span class="goal">{{ run.goal }}</span>
            <span class="meta">
              <span class="status">{{ label(run.status) }}</span>
              <span class="model">{{ run.model }}</span>
              <time [attr.datetime]="run.createdAt">
                {{ run.createdAt | date: 'MMM d, HH:mm' }}
              </time>
            </span>
          </button>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
      border-right: 1px solid var(--line);
      background: var(--mist);
      overflow-y: auto;
    }
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .empty {
      margin: 0;
      padding: var(--space-6);
      color: var(--graphite);
      font-size: var(--text-sm);
    }
    .row {
      display: grid;
      gap: var(--space-1);
      width: 100%;
      padding: var(--space-3) var(--space-4);
      border: 0;
      border-bottom: 1px solid var(--line);
      border-left: 3px solid transparent;
      background: none;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .row:hover {
      background: var(--paper);
    }
    .selected {
      background: var(--paper);
      border-left-color: var(--ink);
    }
    .needs-you {
      border-left-color: var(--amber);
    }
    .goal {
      color: var(--ink);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta {
      display: flex;
      gap: var(--space-2);
      font-size: var(--text-xs);
      color: var(--graphite);
    }
    .needs-you .status {
      color: var(--amber);
      font-weight: 500;
    }
    .model {
      font-family: var(--font-mono);
    }
    time {
      margin-left: auto;
      white-space: nowrap;
    }
  `,
})
export class RunList {
  readonly runs = input.required<RunResponse[]>();
  readonly selectedId = input<string | null>(null);
  readonly select = output<string>();

  protected label(status: RunResponse['status']): string {
    const labels: Record<RunResponse['status'], string> = {
      pending: 'Queued',
      running: 'Running',
      awaiting_approval: 'Waiting for approval',
      completed: 'Done',
      failed: 'Stopped',
    };

    return labels[status];
  }
}
