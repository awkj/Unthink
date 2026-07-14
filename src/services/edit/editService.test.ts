import { describe, expect, it } from "vitest"
import { EditService } from "./editService"

describe("EditService.syncInputValue", () => {
  it("preserves an unsaved edit when an input remounts with the same default value", () => {
    const service = new EditService()

    service.syncInputValue("title", "old title")
    service.setInputValue("title", "draft title")
    service.syncInputValue("title", "old title")

    expect(service.getInputValue("title", "old title")).toBe("draft title")
  })

  it("accepts a model update when the input still contains the previous default value", () => {
    const service = new EditService()

    service.syncInputValue("title", "old title")
    service.syncInputValue("title", "new title")

    expect(service.getInputValue("title", "old title")).toBe("new title")
  })
})
