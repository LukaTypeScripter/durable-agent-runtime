import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import type { RunEventResponse, RunResponse } from '@dar/contracts';
import { summariseEvent } from './event-summary.js';

@Component({
  selector: 'app-run-journal',
  imports: [DatePipe],
  host: { class: 'run-journal' },
  template: `
    <header>
      <h2>{{ run().goal }}</h2>
      <p class="meta">
        <span class="model">{{ run().model }}</span>
        <span>{{ events().length }} steps recorded</span>
      </p>
      @if (run().failReason !== null) {
        <p class="stopped" role="alert">Stopped: {{ run().failReason }}</p>
      }
    </header>

    @if (awaiting()) {
      <section class="approval">
        <h3>Waiting for your decision</h3>
        <p>{{ pendingTool() }}</p>
        <div class="actions">
          <button type="button" class="approve" (click)="decide.emit(true)">
            Approve
          </button>
          <button type="button" class="decline" (click)="decide.emit(false)">
            Decline
          </button>
        </div>
      </section>
    }

    <ol class="spine">
      @for (event of events(); track event.id) {
        <li>
          <div class="line">
            <span class="step">{{ event.stepKey }}</span>
            <span class="type">{{ event.type }}</span>
            <time [attr.datetime]="event.createdAt">
              {{ event.createdAt | date: 'HH:mm:ss' }}
            </time>
          </div>
          @if (summary(event); as said) {
            <p class="said">{{ said }}</p>
          }
        </li>
      } @empty {
        <li class="quiet">Nothing recorded yet.</li>
      }
    </ol>
  `,
  styles: `
    :host {
      display: block;
      padding: var(--space-8);
      overflow-y: auto;
    }
    h2 {
      font-size: var(--text-xl);
      max-width: var(--measure);
    }
    h3 {
      font-size: var(--text-base);
    }
    .meta {
      display: flex;
      gap: var(--space-4);
      margin: var(--space-2) 0 0;
      color: var(--graphite);
      font-size: var(--text-sm);
    }
    .model {
      font-family: var(--font-mono);
    }
    .stopped {
      margin: var(--space-4) 0 0;
      color: var(--ink);
      font-size: var(--text-sm);
    }
    .approval {
      margin: var(--space-6) 0 0;
      padding: var(--space-4);
      border: 1px solid var(--amber);
      border-radius: var(--radius);
      background: var(--amber-wash);
    }
    .approval p {
      margin: var(--space-2) 0 var(--space-4);
      font-family: var(--font-mono);
      font-size: var(--text-sm);
    }
    .actions {
      display: flex;
      gap: var(--space-2);
    }
    button {
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius);
      font: inherit;
      cursor: pointer;
    }
    .approve {
      border: 1px solid var(--amber);
      background: var(--amber);
      color: var(--signal-ink);
    }
    .decline {
      border: 1px solid var(--line);
      background: var(--paper);
      color: var(--ink);
    }
    .spine {
      margin: var(--space-8) 0 0;
      padding: 0 0 0 var(--space-4);
      border-left: 1px solid var(--line);
      list-style: none;
    }
    .spine li {
      padding: var(--space-3) 0;
      font-size: var(--text-sm);
    }
    .line {
      display: flex;
      gap: var(--space-4);
    }
    .said {
      max-width: var(--measure);
      margin: var(--space-2) 0 0;
      color: var(--ink);
      font-size: var(--text-base);
      line-height: 1.55;
      white-space: pre-wrap;
    }
    .step {
      min-width: 22ch;
      font-family: var(--font-mono);
      color: var(--ink);
    }
    .type {
      color: var(--graphite);
    }
    .line time {
      margin-left: auto;
      color: var(--graphite);
      font-variant-numeric: tabular-nums;
    }
    .quiet {
      color: var(--graphite);
    }
  `,
})
export class RunJournal {
  readonly run = input.required<RunResponse>();
  readonly events = input.required<RunEventResponse[]>();
  readonly decide = output<boolean>();

  protected readonly summary = summariseEvent;

  protected readonly awaiting = computed(
    () => this.run().status === 'awaiting_approval',
  );

  protected readonly pendingTool = computed(() => {
    const request = [...this.events()]
      .reverse()
      .find((event) => event.type === 'approval_requested');

    if (request === undefined) {
      return 'A tool call is waiting for review.';
    }

    const payload = request.payload as { toolName?: string; input?: unknown };

    return `${payload.toolName ?? 'A tool'}(${JSON.stringify(payload.input ?? {})})`;
  });
}
