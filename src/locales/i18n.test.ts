import { describe, expect, it } from "vitest"

import { i18n } from "./i18n"

describe("i18n strict mode", () => {
  it("translates native i18next interpolation", () => {
    expect(i18n.t("tasks.daysLeft", { 0: 3 })).toBe("3 days left")
  })

  it("throws when an interpolation value is missing", () => {
    expect(() => i18n.t("tasks.daysLeft")).toThrow("Missing interpolation value")
  })

  it("throws when a translation key is missing", () => {
    expect(() => i18n.t("missing.key" as never)).toThrow("Missing translation: missing.key")
  })
})
