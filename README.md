# @macropaytd/lib-front-message-manager-playground

Visual playground / dev tool for designing per-code modal `component` trees for
`@macropaytd/lib-front-fifo-message-manager`. A developer can author a
`{code}.component` tree as raw JSON **or** build it visually via drag & drop,
edit each node's props, feed sample interpolation data, and see the result
rendered live through the library's real `MessageComponentRenderer` inside the
design-system `Modal`.

Vite + React 18 + TypeScript single-page app. Private, unpublished. The UI is
plain React + CSS (no Node-only APIs), so it could later be hosted inside a VS
Code / Kiro webview.

## Prerequisites

The playground depends on the sibling library via a local `file:` path, and the
`@macropaytd` scope is served from GitHub Packages, so you need:

- Node.js 18+ and npm.
- A GitHub Personal Access Token with the `read:packages` scope.

```bash
export NODE_AUTH_TOKEN=<your GitHub PAT with read:packages>
npm install
```

The committed `.npmrc` expands `${NODE_AUTH_TOKEN}` — never commit a real token
(`.npmrc` is git-ignored; `.npmrc.example` is the template). The library is
resolved from `file:../lib-front-fifo-message-manager`, so keep the two folders
as siblings.

## Scripts

```bash
npm run dev        # start the Vite dev server (open the printed URL)
npm run build      # tsc -b && vite build → dist/
npm run typecheck  # tsc --noEmit
npm run preview    # preview the production build
npm run lint       # eslint .
```

## Using the editor

The window is split in two panes:

**Left pane — editor (JSON / Visual tabs)**

- **JSON tab**: a raw `ComponentNode` editor. Every keystroke runs the
  library's `validateComponent`; valid JSON commits to the central tree,
  invalid input shows an inline error and leaves the tree untouched. Errors
  cover parse failures, non-embeddable (overlay) components, non-serializable
  props, depth > 10, and > 200 nodes.
  - **Load existing**: paste either a bare `ComponentNode` or a full
    `{code}.component` catalog entry and press **Cargar / Pegar JSON** — a
    catalog entry (an object with a `component` property) is unwrapped to its
    `.component` before validating.
  - **Create from scratch**: press **Empezar de cero** (empties the tree —
    `null`) and build up from the Visual tab or by typing JSON. Clearing the
    textarea or typing `null` has the same effect; empty/whitespace/`null`
    input is treated as "start from scratch", not a validation error.
- **Visual tab**: a drag-and-drop tree builder (dnd-kit).
  - The **palette** lists only placeable components (allowlisted AND
    renderable — no overlays).
  - **Vaciar árbol** clears the tree back to the empty from-scratch state
    (disabled when the tree is already empty).
  - Drag a palette chip onto a node to **nest** it as a child; the first drop
    on an empty canvas becomes the root.
  - Drag an existing node onto a sibling to **reorder**, or onto another node to
    **reparent** (a node can't be dropped into itself or its own subtree).
  - Use the **✕** on a row to delete a node.
  - Click a row to **select** it; the **Properties** panel below edits the
    selected node: add/edit/remove `string | number | boolean` props and edit
    its text child. Complex (array/object) props are read-only here — edit them
    in the JSON tab. (No events editor in v1.)

**Right pane — preview & export**

- **Datos de ejemplo (interpolación)**: edit `code`, `title`, `message`,
  `statusCode`, `transactionId`, `level`, and an arbitrary `meta` key→value map.
  These feed `buildBagFromSample` (which reuses the library's
  `buildInterpolation`), so `{{code}}`, `{{title}}`, `{{meta.orderId}}`, etc.
  resolve live in the preview.
- **Vista previa**: the real `Modal` + `MessageComponentRenderer`, exactly how
  the library renders a modal `component` in production.
- **Copiar JSON**: copies the current tree as pretty JSON to the clipboard.

## Architecture

One source of truth: a single `ComponentNode` tree in React state
(`src/store/useComponentTree.ts`). The JSON view and the visual view are
projections of that one model — there are not two independently-synced states:

- JSON → state: `JSON.parse` + `validateComponent` (commit only if valid).
- Visual → state: immutable tree mutation via `src/lib/tree-ops.ts`, then
  re-serialize `jsonText` for the JSON view.

Selection in the visual builder is **local UI state** (a node path), not part of
the central model; all structural edits flow through `store.mutateTree`.

Other building blocks:

- `src/lib/palette.ts` — placeable components = `EMBEDDABLE_COMPONENTS` filtered
  by `getRenderComponent` (allowlisted AND renderable; no overlays).
- `src/lib/interpolation.ts` — `buildBagFromSample` wraps the library's
  `buildInterpolation` from editable sample fields; `DEFAULT_LIMITS` for
  truncation.
- `src/lib/tree-ops.ts` — pure, immutable path-addressed tree mutations
  (insert/remove/reorder/reparent, prop + text-child edits).
- `src/components/Preview.tsx` — live `Modal` + `MessageComponentRenderer`.

## v1 scope boundaries

- Modal `component` trees only (matches the library's Layer 2).
- No events / `onAction` editor (the preview wires `onAction` to a console log).
- No Figma import and no VS Code extension packaging yet — this is a standalone
  web app that is webview-ready.

