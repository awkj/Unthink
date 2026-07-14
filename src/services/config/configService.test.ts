import assert from "node:assert/strict"
import { test } from "vitest"
import { ConfigKey, IConfigStorage, WorkbenchConfig } from "./configService"

const tokenKey: ConfigKey<string> = {
  key: "token",
  default: "",
  check: (value) => typeof value === "string",
}

test("config store loads persisted values and rejects values that fail validation", async () => {
  const config = new WorkbenchConfig({
    async init() {
      return { token: JSON.stringify("persisted"), invalidToken: JSON.stringify(42) }
    },
    async save() {},
  })

  await config.init()

  assert.equal(config.get(tokenKey), "persisted")
  assert.equal(config.get({ ...tokenKey, key: "invalidToken" }), "")
  assert.equal(config.get({ ...tokenKey, key: "missingToken" }), "")
})

test("config save updates Zustand subscribers before persistence completes", async () => {
  let finishSave: (() => void) | undefined
  const storage: IConfigStorage = {
    async init() {
      return {}
    },
    save() {
      return new Promise<void>((resolve) => {
        finishSave = resolve
      })
    },
  }
  const config = new WorkbenchConfig(storage)
  await config.init()
  const changedKeys: string[] = []
  const changedValues: string[] = []
  const eventSubscription = config.onConfigChange((event) => changedKeys.push(event.key))
  const storeSubscription = config.store.subscribe((state) => {
    const value = state.values.token
    if (value !== undefined) changedValues.push(value)
  })

  const savePromise = config.save(tokenKey, "new-token")

  assert.equal(config.get(tokenKey), "new-token")
  assert.deepEqual(changedKeys, ["token"])
  assert.deepEqual(changedValues, [JSON.stringify("new-token")])

  assert.ok(finishSave)
  finishSave()
  await savePromise
  eventSubscription.dispose()
  storeSubscription()
})

test("config save rejects invalid values without updating the store", async () => {
  const config = new WorkbenchConfig({
    async init() {
      return {}
    },
    async save() {
      assert.fail("invalid config must not reach storage")
    },
  })
  await config.init()

  await assert.rejects(config.save(tokenKey, 42 as unknown as string), /Invalid value/)
  assert.equal(config.get(tokenKey), "")
})
