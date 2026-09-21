import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  CreateRunDto,
  DecideApprovalDto,
  RunResponse,
} from '@dar/contracts';

@Service()
export class RunsService {
  private readonly http = inject(HttpClient);

  create(run: CreateRunDto): Promise<RunResponse> {
    return firstValueFrom(this.http.post<RunResponse>('/runs', run));
  }

  decideApproval(
    id: string,
    decision: DecideApprovalDto,
  ): Promise<RunResponse> {
    return firstValueFrom(
      this.http.post<RunResponse>(`/runs/${id}/approval`, decision),
    );
  }
}
