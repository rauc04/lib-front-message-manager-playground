import { describe, it, expect } from "vitest"
import { act, renderHook } from "@testing-library/react"
import type { ComponentNode } from "@macropaytd/lib-front-fifo-message-manager"
import {
  useComponentTree,
  SAMPLE_TREE,
} from "../src/store/useComponentTree"

describe("useComponentTree", () => {
  it("starts with a null tree and 'null' jsonText when no initial is given", () => {
    const { result } = renderHook(() => useComponentTree())
    expect(result.current.tree).toBeNull()
    expect(result.current.jsonText).toBe("null")
  })

  it("serializes the initial tree into jsonText", () => {
    const initial: ComponentNode = { type: "Alert", children: "hi" }
    const { result } = renderHook(() => useComponentTree(initial))
    expect(result.current.tree).toEqual(initial)
    expect(result.current.jsonText).toBe(JSON.stringify(initial, null, 2))
  })

  it("commits valid allowlisted JSON and reserializes the projection", () => {
    const { result } = renderHook(() => useComponentTree())
    const raw = '{"type":"Alert","props":{"variant":"info"},"children":"hi"}'

    let outcome: { ok: boolean } | undefined
    act(() => {
      outcome = result.current.setFromJson(raw)
    })

    expect(outcome).toEqual({ ok: true })
    expect(result.current.tree).toEqual({
      type: "Alert",
      props: { variant: "info" },
      children: "hi",
    })
    expect(result.current.jsonText).toBe(
      JSON.stringify(result.current.tree, null, 2),
    )
  })

  it("rejects syntactically invalid JSON, keeping the raw text and prior tree", () => {
    const initial: ComponentNode = { type: "Alert", children: "hi" }
    const { result } = renderHook(() => useComponentTree(initial))
    const raw = "{ not json"

    let outcome: ReturnType<typeof result.current.setFromJson> | undefined
    act(() => {
      outcome = result.current.setFromJson(raw)
    })

    expect(outcome?.ok).toBe(false)
    expect(result.current.tree).toEqual(initial)
    expect(result.current.jsonText).toBe(raw)
  })

  it("rejects valid JSON that fails library validation", () => {
    const { result } = renderHook(() => useComponentTree())
    const raw = '{"type":"NotAComponent"}'

    let outcome: ReturnType<typeof result.current.setFromJson> | undefined
    act(() => {
      outcome = result.current.setFromJson(raw)
    })

    expect(outcome?.ok).toBe(false)
    if (outcome && outcome.ok === false) {
      expect(outcome.error).toMatch(/validaci/i)
    }
    expect(result.current.tree).toBeNull()
    expect(result.current.jsonText).toBe(raw)
  })

  it.each(["", "   ", "\n\t ", "null"])(
    "treats %j as start-from-scratch (null tree, 'null' text)",
    (input) => {
      const initial: ComponentNode = { type: "Alert", children: "hi" }
      const { result } = renderHook(() => useComponentTree(initial))

      let outcome: ReturnType<typeof result.current.setFromJson> | undefined
      act(() => {
        outcome = result.current.setFromJson(input)
      })

      expect(outcome).toEqual({ ok: true })
      expect(result.current.tree).toBeNull()
      expect(result.current.jsonText).toBe("null")
    },
  )

  it("mutateTree replaces the tree and reserializes jsonText", () => {
    const { result } = renderHook(() => useComponentTree())
    const next: ComponentNode = { type: "Text", children: "x" }

    act(() => {
      result.current.mutateTree(next)
    })

    expect(result.current.tree).toEqual(next)
    expect(result.current.jsonText).toBe(JSON.stringify(next, null, 2))
  })

  it("mutateTree(null) resets jsonText to 'null'", () => {
    const initial: ComponentNode = { type: "Alert", children: "hi" }
    const { result } = renderHook(() => useComponentTree(initial))

    act(() => {
      result.current.mutateTree(null)
    })

    expect(result.current.tree).toBeNull()
    expect(result.current.jsonText).toBe("null")
  })

  it("seedSample loads the sample tree and its pretty projection", () => {
    const { result } = renderHook(() => useComponentTree())

    act(() => {
      result.current.seedSample()
    })

    expect(result.current.tree).toEqual(SAMPLE_TREE)
    expect(result.current.jsonText).toBe(JSON.stringify(SAMPLE_TREE, null, 2))
  })
})
