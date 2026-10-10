import type { SerializableValue } from "@macropaytd/lib-front-fifo-message-manager"

/**
 * The value-type categories the properties panel surfaces as color-coded chips
 * (design §6). Pure, framework-free — no React.
 */
export type ValueType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "null"

/** Classify a serializable value into one of the chip categories. */
export const valueType = (v: SerializableValue): ValueType => {
  if (v === null) return "null"
  if (Array.isArray(v)) return "array"
  const t = typeof v
  if (t === "string") return "string"
  if (t === "number") return "number"
  if (t === "boolean") return "boolean"
  return "object"
}

/**
 * Map each value type to a DS `Tag` color literal (design §6). The chip ALWAYS
 * shows the type as text too, so meaning never depends on color alone.
 */
export const TYPE_TAG_COLOR: Record<ValueType, string> = {
  string: "green",
  number: "blue",
  boolean: "gold",
  array: "purple",
  object: "geekblue",
  null: "default",
}
