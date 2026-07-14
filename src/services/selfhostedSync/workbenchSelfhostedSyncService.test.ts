import assert from "node:assert/strict"
import { test, vi } from "vitest"
import type { IAttachmentUploadService } from "@/services/attachment/attachmentUploadService"
import type { IConfigService } from "@/services/config/configService"
import type { ITodoService } from "@/services/todo/todoService"
import type { ISelfhostedSyncMetadata } from "./selfhostedSyncService"
import { WorkbenchSelfhostedSyncService } from "./workbenchSelfhostedSyncService"

type SyncInternals = {
  storage: unknown
  metadata: ISelfhostedSyncMetadata | null
  performSync(): Promise<void>
  pullRemoteChanges(): Promise<void>
  pushLocalChanges(): Promise<boolean>
  compactIfNeeded(): Promise<void>
  requestImmediateSync(serverRevision?: number): void
}

function createService(syncEnabled = true) {
  let modelVersion: Record<string, number> = {}
  const todoService = {
    storageId: "local",
    onStateChange: () => ({ dispose() {} }),
    getModelVersion: () => modelVersion,
  } as unknown as ITodoService
  const configService = {
    get: () => syncEnabled,
  } as unknown as IConfigService
  const attachmentService = {} as IAttachmentUploadService
  const service = new WorkbenchSelfhostedSyncService(configService, todoService, attachmentService)
  const internals = service as unknown as SyncInternals
  const metadata: ISelfhostedSyncMetadata = {
    clientId: "web-client",
    serverRevision: 9,
    snapshotRevision: 0,
    uploadedVersion: {},
  }
  internals.storage = {}
  internals.metadata = metadata
  return {
    service,
    internals,
    metadata,
    setModelVersion(version: Record<string, number>) {
      modelVersion = version
    },
  }
}

test("a paused service rejects manual sync", async () => {
  const { service } = createService(false)

  await assert.rejects(service.sync(), /paused/)
})

test("a remote-only sync pulls once", async () => {
  const { internals } = createService()
  let pulls = 0
  internals.pullRemoteChanges = async () => {
    pulls += 1
  }
  internals.pushLocalChanges = async () => false
  internals.compactIfNeeded = async () => {}

  await internals.performSync()

  assert.equal(pulls, 1)
})

test("a sync pulls again after uploading local changes", async () => {
  const { internals } = createService()
  let pulls = 0
  internals.pullRemoteChanges = async () => {
    pulls += 1
  }
  internals.pushLocalChanges = async () => true
  internals.compactIfNeeded = async () => {}

  await internals.performSync()

  assert.equal(pulls, 2)
})

test("a revision covered by the current sync does not schedule another sync", async () => {
  vi.useFakeTimers()
  try {
    const { service, internals, metadata } = createService()
    let finishSync: (() => void) | undefined
    let syncRuns = 0
    internals.performSync = () => {
      syncRuns += 1
      return new Promise<void>((resolve) => {
        finishSync = resolve
      })
    }

    const currentSync = service.sync()
    internals.requestImmediateSync(13)
    metadata.serverRevision = 13
    assert.ok(finishSync)
    finishSync()
    await currentSync
    await vi.runAllTimersAsync()

    assert.equal(syncRuns, 1)
  } finally {
    vi.useRealTimers()
  }
})

test("a newer revision received during sync schedules one follow-up sync", async () => {
  vi.useFakeTimers()
  try {
    const { service, internals, metadata } = createService()
    let finishFirstSync: (() => void) | undefined
    let syncRuns = 0
    internals.performSync = async () => {
      syncRuns += 1
      if (syncRuns === 1) {
        await new Promise<void>((resolve) => {
          finishFirstSync = resolve
        })
      } else {
        metadata.serverRevision = 14
      }
    }

    const currentSync = service.sync()
    metadata.serverRevision = 13
    internals.requestImmediateSync(14)
    assert.ok(finishFirstSync)
    finishFirstSync()
    await currentSync
    await vi.runAllTimersAsync()

    assert.equal(syncRuns, 2)
  } finally {
    vi.useRealTimers()
  }
})
