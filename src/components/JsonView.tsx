import { useState } from "react"
import type { UseComponentTreeReturn } from "../store/useComponentTree"

export interface JsonViewProps {
  /** The ONE central store instance (JSON is a projection of its tree). */
  store: UseComponentTreeReturn
}

/**
 * Does the parsed value look like a catalog entry (`{code}.component` wrapper)
 * rather than a bare ComponentNode? We treat it as a wrapper when it is a plain
 * object that carries a `component` property.
 */
const looksLikeCatalogEntry = (
  value: unknown
): value is { component: unknown } =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  "component" in value

/**
 * Raw JSON editor for the ComponentNode tree. The textarea is bound to the
 * store's `jsonText` projection; every edit flows through `store.setFromJson`,
 * which parses + runs the library's `validateComponent` and only commits when
 * valid. Invalid input (parse error, overlay component, non-serializable prop,
 * depth > 10, > 200 nodes, malformed) surfaces inline and leaves the central
 * tree untouched.
 *
 * "Cargar / Pegar JSON" accepts either a bare ComponentNode OR a full
 * `{code}.component` catalog entry — the latter is unwrapped to its `.component`
 * before validating. Starting from empty text (or `null`) builds from scratch.
 */
export const JsonView = ({ store }: JsonViewProps) => {
  const [error, setError] = useState<string | null>(null)

  const commit = (text: string) => {
    const result = store.setFromJson(text)
    setError(result.ok ? null : result.error)
  }

  const handleChange = (text: string) => {
    commit(text)
  }

  /** Unwrap a pasted catalog entry to its `.component` before committing. */
  const handleLoad = () => {
    const text = store.jsonText
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      // Not valid JSON yet — let the normal change path report the error.
      commit(text)
      return
    }
    if (looksLikeCatalogEntry(parsed)) {
      commit(JSON.stringify(parsed.component, null, 2))
      return
    }
    commit(text)
  }

  const handleClear = () => {
    commit("null")
  }

  return (
    <div className="json-view">
      <div className="json-view__toolbar">
        <button type="button" onClick={handleLoad}>
          Cargar / Pegar JSON
        </button>
        <button type="button" onClick={handleClear}>
          Empezar de cero
        </button>
      </div>
      <textarea
        className="json-view__textarea"
        spellCheck={false}
        value={store.jsonText}
        onChange={event => handleChange(event.target.value)}
        placeholder={
          "Pega aquí un ComponentNode o un objeto {code}.component.\n" +
          "Ejemplo:\n" +
          '{\n  "type": "Alert",\n  "props": { "variant": "info" },\n' +
          '  "children": "Código {{code}}"\n}'
        }
      />
      {error ? (
        <p className="json-view__error" role="alert">
          {error}
        </p>
      ) : (
        <p className="json-view__hint">
          JSON válido. Los cambios se reflejan en la vista previa.
        </p>
      )}
    </div>
  )
}
