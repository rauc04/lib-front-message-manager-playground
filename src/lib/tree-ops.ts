import type {
  ComponentNode,
  SerializableValue,
} from '@macropaytd/lib-front-fifo-message-manager';

/**
 * A node address inside the ONE central tree, expressed as a path of child
 * indices from the root. The root itself is the empty path `[]`. A path
 * `[0, 2]` means "the 3rd child of the 1st child of the root".
 *
 * Selection in the visual editor is LOCAL UI state (a path); every structural
 * change is applied immutably against the central tree and committed through
 * the store so the JSON view stays a pure projection.
 */
export type NodePath = number[];

/** Serialize a path to a stable string id (used as dnd-kit sortable id / key). */
export const pathToId = (path: NodePath): string =>
  path.length === 0 ? 'root' : `root.${path.join('.')}`;

/**
 * Inverse of `pathToId`: parse a stable id back into a `NodePath`
 * (`'root' → []`, `'root.0.2' → [0, 2]`). Used by the preview selection layer
 * to resolve a clicked/dropped `data-node-path` back to a tree address.
 */
export const idToPath = (id: string): NodePath => {
  const parts = id.split('.');
  // Drop the leading `root` segment; the rest are child indices.
  return parts.slice(1).map((segment) => Number(segment));
};

/** True when two paths point at the same node. */
export const samePath = (a: NodePath, b: NodePath): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/** True when `ancestor` is a strict prefix of `path` (i.e. `path` is inside it). */
export const isAncestorPath = (ancestor: NodePath, path: NodePath): boolean =>
  ancestor.length < path.length && ancestor.every((v, i) => v === path[i]);

/** Return the array of child nodes for a node (empty when it has none/text). */
const childrenArray = (node: ComponentNode): ComponentNode[] =>
  Array.isArray(node.children) ? node.children : [];

/** Read the node at `path`, or `null` when the path does not resolve. */
export const getNodeAtPath = (
  tree: ComponentNode | null,
  path: NodePath,
): ComponentNode | null => {
  if (!tree) return null;
  let current: ComponentNode = tree;
  for (const index of path) {
    const kids = childrenArray(current);
    const next = kids[index];
    if (!next) return null;
    current = next;
  }
  return current;
};

/**
 * Return a NEW tree with the node at `path` replaced by `replacer(node)`.
 * When `replacer` returns `null` the node is removed from its parent (the root
 * cannot be removed this way — pass the root path to replace it entirely).
 */
const updateAtPath = (
  node: ComponentNode,
  path: NodePath,
  replacer: (node: ComponentNode) => ComponentNode | null,
): ComponentNode | null => {
  if (path.length === 0) return replacer(node);

  const [head, ...rest] = path;
  const kids = childrenArray(node);
  const target = kids[head];
  if (!target) return node;

  const nextChildArray: ComponentNode[] = [];
  kids.forEach((child, index) => {
    if (index !== head) {
      nextChildArray.push(child);
      return;
    }
    const updated = updateAtPath(target, rest, replacer);
    if (updated !== null) nextChildArray.push(updated);
  });

  return { ...node, children: nextChildArray };
};

/** Immutably replace the node at `path` (root path replaces the whole tree). */
export const replaceNodeAtPath = (
  tree: ComponentNode | null,
  path: NodePath,
  next: ComponentNode,
): ComponentNode | null => {
  if (!tree) return path.length === 0 ? next : tree;
  return updateAtPath(tree, path, () => next);
};

/** Immutably remove the node at `path`. Removing the root yields `null`. */
export const removeNodeAtPath = (
  tree: ComponentNode | null,
  path: NodePath,
): ComponentNode | null => {
  if (!tree) return null;
  if (path.length === 0) return null;
  return updateAtPath(tree, path, () => null);
};

/**
 * Immutably append `child` to the children of the node at `parentPath`.
 * If that node currently has a string child (or none), the string is dropped in
 * favor of an array of nodes (a node cannot have both text and element
 * children in this model).
 */
export const appendChildAtPath = (
  tree: ComponentNode | null,
  parentPath: NodePath,
  child: ComponentNode,
): ComponentNode | null => {
  if (!tree) return parentPath.length === 0 ? tree : tree;
  return updateAtPath(tree, parentPath, (parent) => {
    const kids = childrenArray(parent);
    return { ...parent, children: [...kids, child] };
  });
};

/** Create a fresh, minimal node for a palette component name. */
export const makeNode = (type: string): ComponentNode => ({ type });

/** True when two paths share the same parent (same length, same prefix). */
export const sameParent = (a: NodePath, b: NodePath): boolean =>
  a.length === b.length &&
  a.length > 0 &&
  a.slice(0, -1).every((v, i) => v === b[i]);

/**
 * Immutably reorder a child among its siblings: move the child at index
 * `fromIndex` to `toIndex` within the children of the node at `parentPath`.
 */
export const reorderChildAtPath = (
  tree: ComponentNode | null,
  parentPath: NodePath,
  fromIndex: number,
  toIndex: number,
): ComponentNode | null => {
  if (!tree || fromIndex === toIndex) return tree;
  return updateAtPath(tree, parentPath, (parent) => {
    const kids = childrenArray(parent);
    if (fromIndex < 0 || fromIndex >= kids.length) return parent;
    const next = [...kids];
    const [moved] = next.splice(fromIndex, 1);
    const clamped = Math.max(0, Math.min(toIndex, next.length));
    next.splice(clamped, 0, moved);
    return { ...parent, children: next };
  });
};

/** Collect the stable ids of every node in the tree (depth-first, root first). */
export const collectNodeIds = (
  tree: ComponentNode | null,
  path: NodePath = [],
): string[] => {
  if (!tree) return [];
  const ids = [pathToId(path)];
  if (Array.isArray(tree.children)) {
    tree.children.forEach((child, index) => {
      ids.push(...collectNodeIds(child, [...path, index]));
    });
  }
  return ids;
};

/**
 * Immutably set (or delete) a single prop on the node at `path`.
 * Passing `value === undefined` removes the key; removing the last prop drops
 * the `props` object entirely.
 */
export const setPropAtPath = (
  tree: ComponentNode | null,
  path: NodePath,
  key: string,
  value: SerializableValue | undefined,
): ComponentNode | null => {
  if (!tree) return tree;
  return updateAtPath(tree, path, (node) => {
    const nextProps: Record<string, SerializableValue> = {
      ...(node.props ?? {}),
    };
    if (value === undefined) delete nextProps[key];
    else nextProps[key] = value;
    const hasProps = Object.keys(nextProps).length > 0;
    const next: ComponentNode = { ...node };
    if (hasProps) next.props = nextProps;
    else delete next.props;
    return next;
  });
};

/** Immutably rename a prop key on the node at `path`, preserving its value. */
export const renamePropAtPath = (
  tree: ComponentNode | null,
  path: NodePath,
  oldKey: string,
  newKey: string,
): ComponentNode | null => {
  if (!tree || oldKey === newKey) return tree;
  return updateAtPath(tree, path, (node) => {
    if (!node.props || !(oldKey in node.props)) return node;
    const nextProps: Record<string, SerializableValue> = {};
    for (const key of Object.keys(node.props)) {
      if (key === oldKey) nextProps[newKey] = node.props[oldKey];
      else nextProps[key] = node.props[key];
    }
    return { ...node, props: nextProps };
  });
};

/**
 * Immutably set the TEXT child of the node at `path`. An empty string removes
 * the `children` entirely. No-op when the node currently has element children
 * (text and element children are mutually exclusive in this model).
 */
export const setTextChildAtPath = (
  tree: ComponentNode | null,
  path: NodePath,
  text: string,
): ComponentNode | null => {
  if (!tree) return tree;
  return updateAtPath(tree, path, (node) => {
    if (Array.isArray(node.children)) return node;
    const next: ComponentNode = { ...node };
    if (text.length > 0) next.children = text;
    else delete next.children;
    return next;
  });
};

/**
 * When a node is removed, a target path that lives under the SAME parent and
 * sits AFTER the removed index shifts left by one. This keeps reparenting
 * correct in that specific case; unrelated branches are unaffected.
 *
 * Lifted verbatim out of the retired `VisualTree.tsx` so the reparent index
 * math stays tested-adjacent and reusable by the preview drag layer.
 */
export const adjustPathAfterRemoval = (
  target: NodePath,
  removed: NodePath,
): NodePath => {
  if (removed.length === 0 || target.length < removed.length) return target;
  const parentLen = removed.length - 1;
  const shareParent = removed
    .slice(0, parentLen)
    .every((v, i) => v === target[i]);
  if (!shareParent) return target;
  const removedIndex = removed[parentLen];
  const targetIndex = target[parentLen];
  if (targetIndex > removedIndex) {
    const next = [...target];
    next[parentLen] = targetIndex - 1;
    return next;
  }
  return target;
};
