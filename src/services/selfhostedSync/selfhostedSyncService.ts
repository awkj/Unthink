import { Event } from "@hamsterbase/foundation/event"
import { createDecorator } from "@hamsterbase/foundation/instantiation"

export type ISelfhostedSyncServerConfig = {
  type: "selfhosted"
  id: string
  folder: string
  entrypoint: string
  authToken: string
}

export type ISelfhostedSyncMetadata = {
  clientId: string
  serverRevision: number
  snapshotRevision: number
  uploadedVersion: Record<string, number>
}

export interface ISelfhostedSyncService {
  readonly _serviceBrand: undefined

  readonly hasServer: boolean
  readonly enabled: boolean
  readonly syncEnabled: boolean
  readonly syncing: boolean
  readonly lastError: string | null
  readonly lastSyncedAt: number | null
  readonly showSyncIcon: boolean
  readonly config: ISelfhostedSyncServerConfig | null
  readonly showCreateButton: boolean

  onStateChange: Event<void>

  addServer(config: Omit<ISelfhostedSyncServerConfig, "id">): Promise<string>

  updateServer(config: Omit<ISelfhostedSyncServerConfig, "id">): Promise<void>

  setSyncEnabled(enabled: boolean): Promise<void>

  removeServer(): Promise<void>

  sync(): Promise<void>

  init(): Promise<void>
}

export const ISelfhostedSyncService = createDecorator<ISelfhostedSyncService>("ISelfhostedSyncService")
