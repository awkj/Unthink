import assert from "node:assert/strict"
import { test } from "vitest"
import { getNavigationPathFromDeepLink, NavigationService, supportsNativeBackButton } from "./navigationService"

test("macOS App Intent and Widget deep links only allow known navigation routes", () => {
  assert.equal(getNavigationPathFromDeepLink("unthink://navigate/today"), "/today")
  assert.equal(getNavigationPathFromDeepLink("unthink://navigate/inbox"), "/inbox")
  assert.equal(getNavigationPathFromDeepLink("unthink://navigate/settings"), null)
  assert.equal(getNavigationPathFromDeepLink("https://example.com/today"), null)
})

test("native back button registration is Android-only", () => {
  assert.equal(supportsNativeBackButton("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"), false)
  assert.equal(supportsNativeBackButton("Mozilla/5.0 (Linux; Android 15)"), true)
})

test("Android native back dispatches to the topmost registered UI handler", () => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} })
  try {
    const navigation = new NavigationService()
    const calls: string[] = []
    navigation.listenBackButton(() => calls.push("page"))
    const overlay = navigation.listenBackButton(() => calls.push("overlay"))
    const dispatch = () => (navigation as unknown as { dispatchBackButton(): void }).dispatchBackButton()

    dispatch()
    overlay.dispose()
    dispatch()
    assert.deepEqual(calls, ["overlay", "page"])
  } finally {
    Reflect.deleteProperty(globalThis, "window")
  }
})
