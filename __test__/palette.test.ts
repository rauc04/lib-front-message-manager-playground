import { describe, it, expect } from "vitest"
import {
  EMBEDDABLE_COMPONENTS,
  getRenderComponent,
} from "@macropaytd/lib-front-fifo-message-manager"
import { PALETTE_COMPONENTS } from "../src/lib/palette"

describe("PALETTE_COMPONENTS", () => {
  it("is a non-empty array of strings", () => {
    expect(Array.isArray(PALETTE_COMPONENTS)).toBe(true)
    expect(PALETTE_COMPONENTS.length).toBeGreaterThan(0)
    for (const name of PALETTE_COMPONENTS) {
      expect(typeof name).toBe("string")
    }
  })

  it("equals the embeddable names that have a real renderer", () => {
    const expected = EMBEDDABLE_COMPONENTS.filter(
      (name) => !!getRenderComponent(name),
    )
    expect(PALETTE_COMPONENTS).toEqual(expected)
  })

  it("only contains names on the embeddable allowlist with a renderer", () => {
    for (const name of PALETTE_COMPONENTS) {
      expect(EMBEDDABLE_COMPONENTS).toContain(name)
      expect(getRenderComponent(name)).toBeTruthy()
    }
  })

  it("excludes any embeddable name whose renderer is undefined", () => {
    const leaked = PALETTE_COMPONENTS.filter(
      (name) => getRenderComponent(name) === undefined,
    )
    expect(leaked).toEqual([])
  })
})
