import { Service, computed, inject, linkedSignal, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import type {
  CreateRunDto,
  RunEventResponse,
  RunResponse,
  RunStatus,
} from '@dar/contracts';
import { RunsService } from './runs.service.js';

@Service()
export class RunsStore {
  private readonly api = inject(RunsService);
  private readonly commandError = signal<string | null>(null);

  readonly statusFilter = signal<RunStatus | null>(null);

  private readonly runsResource = httpResource<RunResponse[]>(
    () => {
      const status = this.statusFilter();

      return status === null ? '/runs' : `/runs?status=${status}`;
    },
    { defaultValue: [] },
  );

  readonly runs = this.runsResource.value;

  readonly selectedId = linkedSignal<RunResponse[], string | null>({
    source: this.runs,
    computation: (runs, previous) => {
      const kept = runs.find((run) => run.id === previous?.value);

      return kept?.id ?? runs[0]?.id ?? null;
    },
  });

  private readonly eventsResource = httpResource<RunEventResponse[]>(
    () => {
      const id = this.selectedId();

      return id === null ? undefined : `/runs/${id}/events`;
    },
    { defaultValue: [] },
  );

  readonly events = this.eventsResource.value;

  readonly isLoading = computed(
    () => this.runsResource.isLoading() || this.eventsResource.isLoading(),
  );

  readonly selected = computed(
    () => this.runs().find((run) => run.id === this.selectedId()) ?? null,
  );

  readonly awaitingCount = computed(
    () => this.runs().filter((run) => run.status === 'awaiting_approval').length,
  );

  readonly error = computed(() => {
    const failedCommand = this.commandError();

    if (failedCommand !== null) {
      return failedCommand;
    }

    if (this.runsResource.error() !== undefined) {
      return 'Could not reach the runtime.';
    }

    if (this.eventsResource.error() !== undefined) {
      return 'Could not read this run.';
    }

    return null;
  });

  refresh(): void {
    this.runsResource.reload();
    this.eventsResource.reload();
  }

  filterBy(status: RunStatus | null): void {
    this.statusFilter.set(status);
  }

  select(id: string): void {
    this.selectedId.set(id);
  }

  async start(run: CreateRunDto): Promise<void> {
    this.commandError.set(null);

    try {
      const created = await this.api.create(run);

      this.runsResource.update((runs) => [created, ...runs]);
      this.selectedId.set(created.id);
    } catch {
      this.commandError.set('Could not start the run.');
    }
  }

  async decide(id: string, approved: boolean): Promise<void> {
    this.commandError.set(null);

    try {
      await this.api.decideApproval(id, { approved });

      this.runsResource.reload();
      this.eventsResource.reload();
    } catch {
      this.commandError.set('Could not record that decision.');
    }
  }
}
