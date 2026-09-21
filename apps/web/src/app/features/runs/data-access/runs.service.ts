import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  CreateRunDto,
  DecideApprovalDto,
  RunResponse,
} from '@dar/contracts';

@Service()
export class RunsService {
  private readonly http = inject(HttpClient);

  create(run: CreateRunDto): Observable<RunResponse> {
    return this.http.post<RunResponse>('/runs', run);
  }

  findById(id: string): Observable<RunResponse> {
    return this.http.get<RunResponse>(`/runs/${id}`);
  }

  decideApproval(
    id: string,
    decision: DecideApprovalDto,
  ): Observable<RunResponse> {
    return this.http.post<RunResponse>(`/runs/${id}/approval`, decision);
  }
}
