import { Component, output, signal } from '@angular/core';
import { CLAUDE_MODELS } from '@dar/contracts';
import type { CreateRunDto } from '@dar/contracts';

@Component({
  selector: 'app-start-run',
  host: { class: 'start-run' },
  template: `
    <form (submit)="submit($event)">
      <label for="goal">What should the agent do?</label>
      <input
        id="goal"
        name="goal"
        [value]="goal()"
        (input)="onGoal($event)"
        placeholder="Summarise the incident report"
        maxlength="255"
        required
      />

      <label for="model">Model</label>
      <select id="model" name="model" (change)="onModel($event)">
        @for (option of models; track option) {
          <option [value]="option" [selected]="option === model()">
            {{ option }}
          </option>
        }
      </select>

      <button type="submit" [disabled]="goal().length === 0">Start a run</button>
    </form>
  `,
  styles: `
    form {
      display: grid;
      gap: var(--space-2);
      padding: var(--space-4);
      border-bottom: 1px solid var(--line);
    }
    label {
      font-size: var(--text-sm);
      color: var(--graphite);
    }
    input,
    select {
      padding: var(--space-2);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--paper);
      font: inherit;
      color: var(--ink);
    }
    select {
      font-family: var(--font-mono);
      font-size: var(--text-sm);
    }
    button {
      justify-self: start;
      margin-top: var(--space-2);
      padding: var(--space-2) var(--space-4);
      border: 1px solid var(--signal);
      border-radius: var(--radius);
      background: var(--signal);
      color: var(--signal-ink);
      font: inherit;
      cursor: pointer;
    }
    button:disabled {
      border-color: var(--line);
      background: var(--line);
      color: var(--graphite);
      cursor: not-allowed;
    }
  `,
})
export class StartRun {
  protected readonly models = CLAUDE_MODELS;
  protected readonly goal = signal('');
  protected readonly model = signal<CreateRunDto['model']>('claude-haiku-4-5');

  readonly start = output<CreateRunDto>();

  protected onGoal(event: Event): void {
    this.goal.set((event.target as HTMLInputElement).value);
  }

  protected onModel(event: Event): void {
    this.model.set(
      (event.target as HTMLSelectElement).value as CreateRunDto['model'],
    );
  }

  protected submit(event: Event): void {
    event.preventDefault();

    if (this.goal().length === 0) {
      return;
    }

    this.start.emit({ goal: this.goal(), model: this.model() });
    this.goal.set('');
  }
}
