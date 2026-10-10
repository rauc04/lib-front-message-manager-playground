import { useState } from "react"

export interface CopyJsonButtonProps {
  /** The current tree serialized as pretty JSON (the store's projection). */
  jsonText: string
}

/**
 * Export = copy the current ComponentNode tree as pretty JSON to the clipboard.
 * Shows a brief "Copiado" confirmation. Falls back gracefully when the
 * Clipboard API is unavailable (older/insecure contexts).
 */
export const CopyJsonButton = ({ jsonText }: CopyJsonButtonProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button type="button" className="copy-json" onClick={handleCopy}>
      {copied ? "Copiado ✓" : "Copiar JSON"}
    </button>
  )
}
