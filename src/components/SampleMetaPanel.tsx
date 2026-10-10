import { useState } from "react"
import type { Meta } from "@macropaytd/lib-front-fifo-message-manager"
import { buildBagFromSample, type SampleMeta } from "../lib/interpolation"

export interface SampleMetaPanelProps {
  /** Receives the freshly-built interpolation bag whenever a field changes. */
  onBagChange: (bag: Meta) => void
}

/** A single arbitrary meta entry (key → value) in the editable map. */
interface MetaEntry {
  key: string
  value: string
}

/** Build the SampleMeta object from the standard fields + the meta entries. */
const toSample = (
  fields: Omit<SampleMeta, "meta">,
  entries: MetaEntry[]
): SampleMeta => {
  const meta: Meta = {}
  for (const { key, value } of entries) {
    const trimmed = key.trim()
    if (trimmed) meta[trimmed] = value
  }
  return { ...fields, meta }
}

/**
 * Editor for the SAMPLE interpolation inputs that drive the live preview. The
 * standard fields (code, title, message, statusCode, transactionId, level) plus
 * an arbitrary `meta` key→value map feed `buildBagFromSample` (reusing the
 * library's `buildInterpolation`). The resulting bag is lifted to App so the
 * preview re-resolves `{{code}}` / `{{title}}` / `{{meta.*}}` tokens.
 */
export const SampleMetaPanel = ({ onBagChange }: SampleMetaPanelProps) => {
  const [fields, setFields] = useState<Omit<SampleMeta, "meta">>({
    code: "E001",
    title: "Título de ejemplo",
    message: "Mensaje de ejemplo",
    statusCode: "",
    transactionId: "",
    level: "error",
  })
  const [entries, setEntries] = useState<MetaEntry[]>([
    { key: "orderId", value: "A-1024" },
  ])

  const emit = (
    nextFields: Omit<SampleMeta, "meta">,
    nextEntries: MetaEntry[]
  ) => {
    onBagChange(buildBagFromSample(toSample(nextFields, nextEntries)))
  }

  const setField = (key: keyof Omit<SampleMeta, "meta">, value: string) => {
    const next = { ...fields, [key]: value }
    setFields(next)
    emit(next, entries)
  }

  const setEntry = (index: number, patch: Partial<MetaEntry>) => {
    const next = entries.map((entry, i) =>
      i === index ? { ...entry, ...patch } : entry
    )
    setEntries(next)
    emit(fields, next)
  }

  const addEntry = () => {
    const next = [...entries, { key: "", value: "" }]
    setEntries(next)
    emit(fields, next)
  }

  const removeEntry = (index: number) => {
    const next = entries.filter((_, i) => i !== index)
    setEntries(next)
    emit(fields, next)
  }

  const fieldDefs: { key: keyof Omit<SampleMeta, "meta">; label: string }[] = [
    { key: "code", label: "code" },
    { key: "title", label: "title" },
    { key: "message", label: "message" },
    { key: "statusCode", label: "statusCode" },
    { key: "transactionId", label: "transactionId" },
    { key: "level", label: "level" },
  ]

  return (
    <div className="sample">
      <h3 className="sample__title">Datos de ejemplo (interpolación)</h3>
      <div className="sample__fields">
        {fieldDefs.map(({ key, label }) => (
          <label key={key} className="sample__field">
            <span className="sample__label">{label}</span>
            <input
              className="sample__input"
              value={fields[key] ?? ""}
              onChange={event => setField(key, event.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="sample__meta">
        <div className="sample__meta-head">
          <span className="sample__label">meta</span>
          <button type="button" onClick={addEntry}>
            + clave
          </button>
        </div>
        {entries.map((entry, index) => (
          <div key={index} className="sample__meta-row">
            <input
              className="sample__input"
              placeholder="clave"
              value={entry.key}
              onChange={event => setEntry(index, { key: event.target.value })}
            />
            <input
              className="sample__input"
              placeholder="valor"
              value={entry.value}
              onChange={event => setEntry(index, { value: event.target.value })}
            />
            <button
              type="button"
              className="sample__remove"
              onClick={() => removeEntry(index)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
