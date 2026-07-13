import { LocalServerClient } from "./client"

export interface SyncStatus {
  revision: number
  snapshotRevision: number
}

export interface SyncChange {
  revision: number
  clientId: string
  changeId: string
  payload: string
  createdAt: number
}

export interface SyncSnapshot {
  revision: number
  payload: string
  createdAt: number
}

export interface SyncChangesPage {
  revision: number
  hasMore: boolean
  changes: SyncChange[]
  snapshot?: SyncSnapshot
}

export interface AppendChangeRequest {
  clientId: string
  changeId: string
  payload: string
}

export interface AppendChangeResponse {
  revision: number
  duplicate: boolean
}

export interface PutSnapshotRequest {
  clientId: string
  coversRevision: number
  payload: string
}

export class Sync {
  constructor(private client: LocalServerClient) {}

  status(space: string): Promise<SyncStatus> {
    return this.client.get<SyncStatus>(`v1/spaces/${encodeURIComponent(space)}/status`)
  }

  changes(space: string, after: number, clientId: string, limit = 500): Promise<SyncChangesPage> {
    const query = new URLSearchParams({
      after: String(after),
      clientId,
      limit: String(limit),
    })
    return this.client.get<SyncChangesPage>(`v1/spaces/${encodeURIComponent(space)}/changes?${query.toString()}`)
  }

  appendChange(space: string, request: AppendChangeRequest): Promise<AppendChangeResponse> {
    return this.client.post<AppendChangeResponse>(`v1/spaces/${encodeURIComponent(space)}/changes`, request)
  }

  putSnapshot(space: string, request: PutSnapshotRequest): Promise<SyncStatus> {
    return this.client.put<SyncStatus>(`v1/spaces/${encodeURIComponent(space)}/snapshot`, request)
  }
}
