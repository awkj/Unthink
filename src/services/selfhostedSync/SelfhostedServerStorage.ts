import { LocalServerSDK } from "@/services/serverApi/main"
import { AppendChangeResponse, SyncChangesPage, SyncStatus } from "@/services/serverApi/sync"
import { SelfhostedAttachmentConfig } from "@/services/serverApi/attachments"

export class SelfhostedServerStorage {
  private readonly sdk: LocalServerSDK

  constructor(
    entrypoint: string,
    authToken: string,
    private readonly folder: string,
  ) {
    this.sdk = new LocalServerSDK({
      endpoint: entrypoint,
      authToken,
      requestLib: LocalServerSDK.fetchToRequestLib(fetch),
    })
  }

  status(): Promise<SyncStatus> {
    return this.sdk.sync.status(this.folder)
  }

  attachmentConfig(): Promise<SelfhostedAttachmentConfig> {
    return this.sdk.attachments.config()
  }

  changes(after: number, clientId: string): Promise<SyncChangesPage> {
    return this.sdk.sync.changes(this.folder, after, clientId)
  }

  appendChange(clientId: string, changeId: string, payload: string): Promise<AppendChangeResponse> {
    return this.sdk.sync.appendChange(this.folder, { clientId, changeId, payload })
  }

  putSnapshot(clientId: string, coversRevision: number, payload: string): Promise<SyncStatus> {
    return this.sdk.sync.putSnapshot(this.folder, { clientId, coversRevision, payload })
  }
}
