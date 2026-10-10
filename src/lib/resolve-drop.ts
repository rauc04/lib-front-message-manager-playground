import type { ComponentNode } from "@macropaytd/lib-front-fifo-message-manager"
import {
  adjustPathAfterRemoval,
  appendChildAtPath,
  getNodeAtPath,
  isAncestorPath,
  makeNode,
  removeNodeAtPath,
  reorderChildAtPath,
  samePath,
  sameParent,
  type NodePath,
} from "./tree-ops"
import { isContainerComponent } from "./palette"

/** Where a drag originated. */
export type DragSource = "preview" | "palette"

/** The active (dragged) descriptor passed to `resolveDrop`. */
export interface DropActive {
  source: DragSource
  /** Set for `source: 'preview'` — the path of the node being moved. */
  path?: NodePath
  /** Set for `source: 'palette'` — the component name to create. */
  componentName?: string
}

/** The droppable target (a resolved `data-node-path`), or null when none. */
export interface DropOver {
  path: NodePath
}

/**
 * The outcome of a drag, computed PURELY. `onDragEnd` is a thin adapter that
 * applies `tree`/`select` to the store; `resolveDrop` never touches the store.
 */
export type DropResult =
  | {
      kind: "reorder" | "reparent" | "create"
      tree: ComponentNode | null
      select: NodePath | null
    }
  | {
      kind: "rejected"
      reason: "self-or-subtree" | "root-immovable" | "no-target"
    }

/**
 * Classify a drop target by its RESOLVED node type (design §7.5):
 * - container node → the drop appends/reparents INTO it;
 * - non-container leaf → the drop is a SIBLING insert into the leaf's parent
 *   (never a silent child nesting under a leaf).
 * Returns the parent path and the insertion index to use for a sibling insert,
 * or `null` to signal "append into this container node".
 */
const classifyTarget = (
  tree: ComponentNode | null,
  targetPath: NodePath,
): { mode: "container" } | { mode: "sibling"; parentPath: NodePath; index: number } => {
  const node = getNodeAtPath(tree, targetPath)
  if (node && isContainerComponent(node.type)) return { mode: "container" }
  // Non-container leaf (or unresolved): sibling insert into its parent at the
  // hovered index. The root path has no parent, so a leaf root falls back to
  // "container" semantics only when it is actually a container (handled above);
  // otherwise there is no parent to insert into and we treat it as a container
  // target so the node is not silently dropped.
  if (targetPath.length === 0) return { mode: "container" }
  const parentPath = targetPath.slice(0, -1)
  const index = targetPath[targetPath.length - 1]
  return { mode: "sibling", parentPath, index }
}

/** Insert `child` into the node at `parentPath` at `index` (immutable). */
const insertChildAtIndex = (
  tree: ComponentNode | null,
  parentPath: NodePath,
  index: number,
  child: ComponentNode,
): ComponentNode | null => {
  // Append, then slide into place via reorder (reusing tree-ops as-is).
  const appended = appendChildAtPath(tree, parentPath, child)
  const parent = getNodeAtPath(appended, parentPath)
  const kids = Array.isArray(parent?.children) ? parent.children : []
  const from = kids.length - 1
  if (from < 0) return appended
  return reorderChildAtPath(appended, parentPath, from, index)
}

/**
 * Resolve a drag into the next tree + the selection to apply, PURELY.
 * Mirrors the retired `VisualTree.handleDragEnd` guards and mutations, but
 * centralized and testable (design §7.5).
 */
export const resolveDrop = (
  active: DropActive,
  over: DropOver | null,
  tree: ComponentNode | null,
): DropResult => {
  // ── Palette → create a new node ────────────────────────────────
  if (active.source === "palette") {
    const name = active.componentName
    if (!name) return { kind: "rejected", reason: "no-target" }

    // Empty tree (or no target) → the new node becomes the root.
    if (!tree || !over) {
      return { kind: "create", tree: makeNode(name), select: [] }
    }

    const target = classifyTarget(tree, over.path)
    if (target.mode === "container") {
      const next = appendChildAtPath(tree, over.path, makeNode(name))
      const parent = getNodeAtPath(next, over.path)
      const newIndex = (Array.isArray(parent?.children)
        ? parent.children.length
        : 1) - 1
      return { kind: "create", tree: next, select: [...over.path, newIndex] }
    }
    // Sibling insert into the leaf's parent at the hovered index.
    const next = insertChildAtIndex(
      tree,
      target.parentPath,
      target.index,
      makeNode(name),
    )
    return {
      kind: "create",
      tree: next,
      select: [...target.parentPath, target.index],
    }
  }

  // ── Preview → move an existing node (reorder / reparent) ───────
  const from = active.path
  if (!from) return { kind: "rejected", reason: "no-target" }
  if (from.length === 0) return { kind: "rejected", reason: "root-immovable" }
  if (!over) return { kind: "rejected", reason: "no-target" }

  const target = over.path

  // Guard: never drop a node into itself or its own subtree.
  if (samePath(from, target) || isAncestorPath(from, target)) {
    return { kind: "rejected", reason: "self-or-subtree" }
  }

  const classified = classifyTarget(tree, target)

  // Reorder among siblings: dropped onto a sibling under the same parent.
  if (
    classified.mode === "sibling" &&
    sameParent(from, target)
  ) {
    const parentPath = from.slice(0, -1)
    const next = reorderChildAtPath(
      tree,
      parentPath,
      from[from.length - 1],
      target[target.length - 1],
    )
    return { kind: "reorder", tree: next, select: null }
  }

  const moving = getNodeAtPath(tree, from)
  if (!moving) return { kind: "rejected", reason: "no-target" }

  if (classified.mode === "container") {
    // Reparent: nest the moving node as the last child of the container.
    const detached = removeNodeAtPath(tree, from)
    const reTarget = adjustPathAfterRemoval(target, from)
    const next = appendChildAtPath(detached, reTarget, moving)
    return { kind: "reparent", tree: next, select: null }
  }

  // Sibling insert into the leaf's parent at the hovered index.
  const detached = removeNodeAtPath(tree, from)
  const reParent = adjustPathAfterRemoval(classified.parentPath, from)
  // Clamp the destination index after removal may have shifted siblings.
  const adjustedTarget = adjustPathAfterRemoval(target, from)
  const index = adjustedTarget[adjustedTarget.length - 1]
  const next = insertChildAtIndex(detached, reParent, index, moving)
  return { kind: "reparent", tree: next, select: null }
}
