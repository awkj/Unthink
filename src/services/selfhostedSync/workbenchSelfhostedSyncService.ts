import { selfhostedSyncMetadataConfigKey, thirdpartySyncServersConfigKey } from "@/services/config/config"
import { IConfigService } from "@/services/config/configService"
import { ITodoService } from "@/services/todo/todoService"
import { IAttachmentUploadService } from "@/services/attachment/attachmentUploadService"
import { ByteBuffer, decodeBase64, encodeBase64 } from "@hamsterbase/foundation/buffer"
import { Emitter } from "@hamsterbase/foundation/event"
import { generateUuid } from "@hamsterbase/foundation/uuid"
import { LoroDoc } from "loro-crdt"
import { SelfhostedServerStorage } from "./SelfhostedServerStorage"
import {
  ISelfhostedSyncMetadata,
  ISelfhostedSyncServerConfig,
  ISelfhostedSyncService,
} from "./selfhostedSyncService.ts"

const LOCAL_CHANGE_DEBOUNCE_MS = 500
const REMOTE_POLL_INTERVAL_MS = 60_000
const SNAPSHOT_INTERVAL = 100
const MAX_RETRY_DELAY_MS = 60_000
const MAX_EVENT_RECONNECT_DELAY_MS = 30_000

function mergeVersions(left: Record<string, number>, right: Record<string, number>): Record<string, number> {
  const merged = { ...left }
  for (const [peer, version] of Object.entries(right)) {
    merged[peer] = Math.max(merged[peer] ?? 0, version)
  }
  return merged
}

function hasVersionBeyond(current: Record<string, number>, known: Record<string, number>): boolean {
  return Object.entries(current).some(([peer, version]) => version > (known[peer] ?? 0))
}

function getPayloadVersion(payloads: Uint8Array[]): Record<string, number> {
  if (payloads.length === 0) return {}
  const doc = new LoroDoc()
  for (const payload of payloads) {
    doc.import(payload)
  }
  const version: Record<string, number> = {}
  doc
    .version()
    .toJSON()
    .forEach((value, peer) => {
      version[peer] = value
    })
  return version
}

export class WorkbenchSelfhostedSyncService implements ISelfhostedSyncService {
  readonly _serviceBrand: undefined

  private readonly onStateChangeEmitter = new Emitter<void>()
  readonly onStateChange = this.onStateChangeEmitter.event

  private storage: SelfhostedServerStorage | null = null
  private metadata: ISelfhostedSyncMetadata | null = null
  private syncRequest: Promise<void> | null = null
  private syncTimer: ReturnType<typeof setTimeout> | null = null
  private syncAfterCurrent = false
  private eventStreamController: AbortController | null = null
  private applyingRemoteChanges = false
  private retryAttempt = 0
  private _syncing = false
  private _lastError: string | null = null
  private _lastSyncedAt: number | null = null

  constructor(
    @IConfigService private readonly configService: IConfigService,
    @ITodoService private readonly todoService: ITodoService,
    @IAttachmentUploadService private readonly attachmentService: IAttachmentUploadService,
  ) {
    todoService.onStateChange(() => {
      this.onStateChangeEmitter.fire()
      if (!this.applyingRemoteChanges) {
        this.scheduleSync(LOCAL_CHANGE_DEBOUNCE_MS)
      }
    })
  }

  get enabled(): boolean {
    try {
      return this.todoService.storageId === "local"
    } catch {
      return false
    }
  }

  get showSyncIcon(): boolean {
    return this.enabled && this.hasServer
  }

  get hasServer(): boolean {
    return this.storage !== null && this.metadata !== null && this.enabled
  }

  get showCreateButton(): boolean {
    return this.enabled && !this.hasServer
  }

  get config(): ISelfhostedSyncServerConfig | null {
    return this.configService.get(thirdpartySyncServersConfigKey())
  }

  get syncing(): boolean {
    return this._syncing
  }

  get lastError(): string | null {
    return this._lastError
  }

  get lastSyncedAt(): number | null {
    return this._lastSyncedAt
  }

  async addServer(config: Omit<ISelfhostedSyncServerConfig, "id">): Promise<string> {
    const folder = config.folder.trim().toLowerCase()
    if (!folder) {
      throw new Error("Folder name is required")
    }
    const newServer: ISelfhostedSyncServerConfig = { ...config, folder, id: generateUuid() }
    const storage = this.createStorage(newServer)
    await storage.status()

    const metadata: ISelfhostedSyncMetadata = {
      clientId: generateUuid(),
      serverRevision: 0,
      snapshotRevision: 0,
      uploadedVersion: {},
    }
    await this.configService.save(thirdpartySyncServersConfigKey(), newServer)
    await this.configService.save(selfhostedSyncMetadataConfigKey(newServer.id), metadata)
    this.storage = storage
    this.metadata = metadata
    this.startEventStream()
    await this.syncAttachmentStorage(storage, newServer)
    this._lastError = null
    this.onStateChangeEmitter.fire()
    await this.sync()
    return newServer.id
  }

  async deleteServer(): Promise<void> {
    const config = this.config
    if (config) {
      await this.attachmentService.clearSelfhostedConfig(config.id)
      await this.configService.save(selfhostedSyncMetadataConfigKey(config.id), null)
    }
    await this.configService.save(thirdpartySyncServersConfigKey(), null)
    this.storage = null
    this.metadata = null
    this.stopEventStream()
    this._lastError = null
    this._lastSyncedAt = null
    this.clearScheduledSync()
    this.onStateChangeEmitter.fire()
  }

  sync(): Promise<void> {
    if (this.syncRequest) return this.syncRequest
    if (!this.storage || !this.metadata) {
      return Promise.reject(new Error("No sync server configured"))
    }
    if (!this.enabled) {
      return Promise.reject(new Error("Self-hosted sync is only available for the local database"))
    }

    this.clearScheduledSync()
    this._syncing = true
    this.onStateChangeEmitter.fire()
    const request = this.performSync()
      .then(() => {
        this.retryAttempt = 0
        this._lastError = null
        this._lastSyncedAt = Date.now()
      })
      .catch((error: unknown) => {
        this._lastError = error instanceof Error ? error.message : String(error)
        this.scheduleRetry()
        throw error
      })
      .finally(() => {
        let runAgain = false
        if (this.syncRequest === request) {
          this.syncRequest = null
          runAgain = this.syncAfterCurrent
          this.syncAfterCurrent = false
        }
        this._syncing = false
        this.onStateChangeEmitter.fire()
        if (runAgain) this.scheduleSync(0)
      })
    this.syncRequest = request
    return request
  }

  async init(): Promise<void> {
    const storedConfig = this.config
    if (storedConfig) {
      const config = { ...storedConfig, folder: storedConfig.folder.trim().toLowerCase() }
      if (config.folder !== storedConfig.folder) {
        await this.configService.save(thirdpartySyncServersConfigKey(), config)
      }
      this.storage = this.createStorage(config)
      this.metadata = this.configService.get(selfhostedSyncMetadataConfigKey(config.id))
      if (!this.metadata) {
        this.metadata = {
          clientId: generateUuid(),
          serverRevision: 0,
          snapshotRevision: 0,
          uploadedVersion: {},
        }
        await this.saveMetadata()
      }
      await this.syncAttachmentStorage(this.storage, config)
      this.startEventStream()
    }
    this.installAutoSyncTriggers()
    this.onStateChangeEmitter.fire()
    if (this.hasServer) {
      this.scheduleSync(0)
    }
  }

  private async performSync(): Promise<void> {
    await this.pullRemoteChanges()
    await this.pushLocalChanges()
    await this.pullRemoteChanges()
    await this.compactIfNeeded()
  }

  private async pullRemoteChanges(): Promise<void> {
    const storage = this.requireStorage()
    const metadata = this.requireMetadata()
    let cursor = metadata.serverRevision
    while (true) {
      const page = await storage.changes(cursor, metadata.clientId)
      const payloads: Array<{ revision: number; data: Uint8Array }> = []
      if (page.snapshot) {
        payloads.push({
          revision: page.snapshot.revision,
          data: decodeBase64(page.snapshot.payload).buffer,
        })
        metadata.snapshotRevision = Math.max(metadata.snapshotRevision, page.snapshot.revision)
      }
      for (const change of page.changes) {
        payloads.push({ revision: change.revision, data: decodeBase64(change.payload).buffer })
      }

      if (payloads.length > 0) {
        const data = payloads.map((item) => item.data)
        this.applyingRemoteChanges = true
        try {
          await this.todoService.import(data, this.todoService.storageId)
        } finally {
          this.applyingRemoteChanges = false
        }
        metadata.uploadedVersion = mergeVersions(metadata.uploadedVersion, getPayloadVersion(data))
        cursor = Math.max(cursor, ...payloads.map((item) => item.revision))
      }
      metadata.serverRevision = page.hasMore ? cursor : page.revision
      await this.saveMetadata()
      if (!page.hasMore) break
    }
  }

  private async pushLocalChanges(): Promise<void> {
    const storage = this.requireStorage()
    const metadata = this.requireMetadata()
    const currentVersion = this.todoService.getModelVersion(this.todoService.storageId)
    if (!hasVersionBeyond(currentVersion, metadata.uploadedVersion)) {
      return
    }
    const patch = this.todoService.exportPatch(metadata.uploadedVersion, this.todoService.storageId)
    await storage.appendChange(metadata.clientId, generateUuid(), encodeBase64(ByteBuffer.wrap(patch)))
    metadata.uploadedVersion = mergeVersions(metadata.uploadedVersion, currentVersion)
    await this.saveMetadata()
  }

  private async compactIfNeeded(): Promise<void> {
    const storage = this.requireStorage()
    const metadata = this.requireMetadata()
    if (metadata.serverRevision - metadata.snapshotRevision < SNAPSHOT_INTERVAL) {
      return
    }
    const currentVersion = this.todoService.getModelVersion(this.todoService.storageId)
    if (hasVersionBeyond(currentVersion, metadata.uploadedVersion)) {
      return
    }
    const snapshot = this.todoService.exportPatch({}, this.todoService.storageId)
    const status = await storage.putSnapshot(
      metadata.clientId,
      metadata.serverRevision,
      encodeBase64(ByteBuffer.wrap(snapshot)),
    )
    metadata.snapshotRevision = status.snapshotRevision
    await this.saveMetadata()
  }

  private createStorage(config: ISelfhostedSyncServerConfig): SelfhostedServerStorage {
    return new SelfhostedServerStorage(config.entrypoint, config.authToken, config.folder)
  }

  private async syncAttachmentStorage(
    storage: SelfhostedServerStorage,
    serverConfig: ISelfhostedSyncServerConfig,
  ): Promise<void> {
    try {
      const config = await storage.attachmentConfig()
      if (config.transport === "server") {
        await this.attachmentService.applySelfhostedConfig(
          serverConfig.id,
          serverConfig.entrypoint,
          serverConfig.authToken,
        )
      }
    } catch {
      // Older self-hosted servers do not expose attachment configuration.
      // Task synchronization remains available and a custom S3 config is preserved.
    }
  }

  private requireStorage(): SelfhostedServerStorage {
    if (!this.storage) throw new Error("No sync server configured")
    return this.storage
  }

  private requireMetadata(): ISelfhostedSyncMetadata {
    if (!this.metadata) throw new Error("Sync metadata is not initialized")
    return this.metadata
  }

  private async saveMetadata(): Promise<void> {
    const config = this.config
    if (!config || !this.metadata) return
    await this.configService.save(selfhostedSyncMetadataConfigKey(config.id), this.metadata)
  }

  private installAutoSyncTriggers(): void {
    const trigger = () => {
      if (this.hasServer) this.requestImmediateSync()
    }
    window.addEventListener("online", trigger)
    window.addEventListener("focus", trigger)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") trigger()
    })
    setInterval(trigger, REMOTE_POLL_INTERVAL_MS)
  }

  private scheduleSync(delay: number): void {
    if (!this.storage || !this.metadata || !this.enabled) return
    this.clearScheduledSync()
    this.syncTimer = setTimeout(() => {
      this.syncTimer = null
      void this.sync().catch(() => {
        // Error state and retry scheduling are handled by sync().
      })
    }, delay)
  }

  private requestImmediateSync(): void {
    if (this.syncRequest) {
      this.syncAfterCurrent = true
      return
    }
    this.scheduleSync(0)
  }

  private startEventStream(): void {
    this.stopEventStream()
    if (!this.storage || !this.metadata || !this.enabled) return
    const controller = new AbortController()
    this.eventStreamController = controller
    void this.runEventStream(this.storage, this.metadata.clientId, controller.signal)
  }

  private stopEventStream(): void {
    this.eventStreamController?.abort()
    this.eventStreamController = null
  }

  private async runEventStream(storage: SelfhostedServerStorage, clientId: string, signal: AbortSignal): Promise<void> {
    let retryAttempt = 0
    while (!signal.aborted) {
      let connected = false
      try {
        await storage.subscribeChanges(
          clientId,
          () => this.requestImmediateSync(),
          () => {
            connected = true
            retryAttempt = 0
            this.requestImmediateSync()
          },
          signal,
        )
      } catch (error) {
        if (signal.aborted) return
        console.warn("Self-hosted sync event stream disconnected:", error)
      }
      if (signal.aborted) return
      const delay = Math.min(1_000 * 2 ** retryAttempt, MAX_EVENT_RECONNECT_DELAY_MS)
      retryAttempt += 1
      if (connected) retryAttempt = 1
      await this.waitForEventReconnect(delay, signal)
    }
  }

  private waitForEventReconnect(delay: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(done, delay)
      signal.addEventListener("abort", done, { once: true })
      function done() {
        clearTimeout(timer)
        signal.removeEventListener("abort", done)
        resolve()
      }
    })
  }

  private scheduleRetry(): void {
    const delay = Math.min(2_000 * 2 ** this.retryAttempt, MAX_RETRY_DELAY_MS)
    this.retryAttempt += 1
    this.scheduleSync(delay)
  }

  private clearScheduledSync(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer)
      this.syncTimer = null
    }
  }
}
