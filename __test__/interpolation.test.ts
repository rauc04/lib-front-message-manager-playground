import { describe, it, expect } from "vitest"
import { buildBagFromSample, DEFAULT_LIMITS } from "../src/lib/interpolation"

const isPrimitive = (v: unknown): v is string | number | boolean =>
  typeof v === "string" || typeof v === "number" || typeof v === "boolean"

describe("DEFAULT_LIMITS", () => {
  it("matches the documented playground defaults", () => {
    expect(DEFAULT_LIMITS).toEqual({
      maxMessageLength: 1000,
      truncationIndicator: "…[truncado]",
    })
  })
})

describe("buildBagFromSample", () => {
  it("returns a Meta object whose values are all primitives", () => {
    const bag = buildBagFromSample({})
    expect(typeof bag).toBe("object")
    expect(bag).not.toBeNull()
    for (const value of Object.values(bag)) {
      expect(isPrimitive(value)).toBe(true)
    }
  })

  it("surfaces the provided code/title/message as bag values", () => {
    const bag = buildBagFromSample({
      code: "E42",
      title: "Oops",
      message: "Algo falló",
      statusCode: "500",
      transactionId: "tx-1",
    })
    const values = Object.values(bag)
    expect(values).toContain("E42")
    expect(values).toContain("Oops")
    expect(values).toContain("Algo falló")
    // every value stays primitive even with fields provided
    for (const value of values) {
      expect(isPrimitive(value)).toBe(true)
    }
  })

  it("spreads a provided meta object flat into the bag (top-level keys)", () => {
    const bag = buildBagFromSample({ meta: { orderId: "7" } })
    expect(bag).toHaveProperty("orderId", "7")
  })
})
