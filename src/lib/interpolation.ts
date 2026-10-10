import {
  buildInterpolation,
  type InterpolateLimits,
  type Meta,
  type ProcessedMessage,
} from "@macropaytd/lib-front-fifo-message-manager"

/**
 * Sample fields the developer can tweak in the playground to drive the
 * `{{...}}` token resolution of the preview.
 */
export interface SampleMeta {
  code?: string
  title?: string
  message?: string
  statusCode?: string
  transactionId?: string
  level?: string
  meta?: Meta
}

/**
 * Build the interpolation bag the renderer consumes, from the editable sample
 * fields. Reuses the library's `buildInterpolation` (single source of truth) by
 * constructing a synthetic `ProcessedMessage`: missing text fields default to
 * empty strings, `level` defaults to "error", `meta` defaults to `{}`, and the
 * timestamp is filled with the current ISO time.
 */
export const buildBagFromSample = (sample: SampleMeta): Meta => {
  const processed: ProcessedMessage = {
    transactionId: sample.transactionId ?? "",
    level: (sample.level as ProcessedMessage["level"]) ?? "error",
    message: sample.message ?? "",
    title: sample.title ?? "",
    statusCode: sample.statusCode ?? "",
    code: sample.code ?? "",
    silent: false,
    timestamp: new Date().toISOString(),
    meta: sample.meta ?? {},
  }
  return buildInterpolation(processed)
}

/** Sane default security limits for the preview renderer. */
export const DEFAULT_LIMITS: InterpolateLimits = {
  maxMessageLength: 1000,
  truncationIndicator: "…[truncado]",
}
