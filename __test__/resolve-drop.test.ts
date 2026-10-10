import { describe, it, expect } from 'vitest';
import type { ComponentNode } from '@macropaytd/lib-front-fifo-message-manager';
import { resolveDrop } from '../src/lib/resolve-drop';
import { CONTAINER_COMPONENTS, isContainerComponent } from '../src/lib/palette';
import { getNodeAtPath } from '../src/lib/tree-ops';

/**
 * A Card (container) root with two leaf children and a nested Card container:
 *
 *   Card (root)                 []
 *   ├─ Alert    (leaf)          [0]
 *   ├─ Title    (leaf)          [1]
 *   └─ Card     (container)     [2]
 *      └─ Text  (leaf)          [2,0]
 */
const makeTree = (): ComponentNode => ({
  type: 'Card',
  children: [
    { type: 'Alert', props: { variant: 'info' } },
    { type: 'Title', children: 't' },
    { type: 'Card', children: [{ type: 'Text', children: 'x' }] },
  ],
});

const childTypes = (tree: ComponentNode | null, path: number[] = []) => {
  const node = getNodeAtPath(tree, path);
  return Array.isArray(node?.children) ? node.children.map((c) => c.type) : [];
};

describe('CONTAINER metadata sanity', () => {
  it('has at least one offerable container (header must be renderable)', () => {
    expect(
      CONTAINER_COMPONENTS.filter(isContainerComponent).length,
    ).toBeGreaterThan(0);
  });
});

describe('resolveDrop — palette source (create)', () => {
  it('creates the root when the tree is empty', () => {
    const result = resolveDrop(
      { source: 'palette', componentName: 'Card' },
      null,
      null,
    );
    expect(result).toMatchObject({ kind: 'create', select: [] });
    if (result.kind !== 'rejected') {
      expect(result.tree).toEqual({ type: 'Card' });
    }
  });

  it('appends as a child when dropped on a container node', () => {
    const result = resolveDrop(
      { source: 'palette', componentName: 'Alert' },
      { path: [2] }, // nested Card container
      makeTree(),
    );
    expect(result.kind).toBe('create');
    if (result.kind !== 'rejected') {
      expect(childTypes(result.tree, [2])).toEqual(['Text', 'Alert']);
      expect(result.select).toEqual([2, 1]);
    }
  });

  it('inserts a SIBLING (not a child) when dropped on a non-container leaf', () => {
    const result = resolveDrop(
      { source: 'palette', componentName: 'Badge' },
      { path: [0] }, // the Alert leaf at index 0
      makeTree(),
    );
    expect(result.kind).toBe('create');
    if (result.kind !== 'rejected') {
      // New node lands in the ROOT's children at the hovered index 0,
      // never nested under the Alert leaf.
      expect(childTypes(result.tree, [])).toEqual([
        'Badge',
        'Alert',
        'Title',
        'Card',
      ]);
      expect(childTypes(result.tree, [1])).toEqual([]); // Alert still a leaf
      expect(result.select).toEqual([0]);
    }
  });

  it('rejects a palette drop with no component name', () => {
    const result = resolveDrop({ source: 'palette' }, { path: [] }, makeTree());
    expect(result).toMatchObject({ kind: 'rejected', reason: 'no-target' });
  });
});

describe('resolveDrop — preview source (move)', () => {
  it('reorders among siblings when same parent', () => {
    const result = resolveDrop(
      { source: 'preview', path: [0] }, // Alert
      { path: [1] }, // onto Title (sibling leaf)
      makeTree(),
    );
    expect(result.kind).toBe('reorder');
    if (result.kind !== 'rejected') {
      expect(childTypes(result.tree, [])).toEqual(['Title', 'Alert', 'Card']);
      expect(result.select).toBeNull();
    }
  });

  it('reparents into a container (append as last child)', () => {
    const result = resolveDrop(
      { source: 'preview', path: [0] }, // Alert
      { path: [2] }, // into the nested Card container
      makeTree(),
    );
    expect(result.kind).toBe('reparent');
    if (result.kind !== 'rejected') {
      // Alert removed from root; appended under the nested Card.
      // After removing [0], the nested Card is now at [1].
      expect(childTypes(result.tree, [])).toEqual(['Title', 'Card']);
      expect(childTypes(result.tree, [1])).toEqual(['Text', 'Alert']);
      expect(result.select).toBeNull();
    }
  });

  it('treats a cross-parent drop on a non-container leaf as a sibling insert (not a child)', () => {
    // Move the nested Text [2,0] onto the Title leaf [1] (different parent) →
    // sibling insert into the ROOT (Title's parent), never a child of Title.
    const result = resolveDrop(
      { source: 'preview', path: [2, 0] },
      { path: [1] },
      makeTree(),
    );
    expect(result.kind).toBe('reparent');
    if (result.kind !== 'rejected') {
      // Title stays a leaf; the moved Text is now a root-level sibling.
      expect(childTypes(result.tree, [1])).toEqual([]); // Title still a leaf
      expect(childTypes(result.tree, [])).toContain('Text');
      // The nested Card lost its only child.
      const cardPath = childTypes(result.tree, []).indexOf('Card');
      expect(childTypes(result.tree, [cardPath])).toEqual([]);
    }
  });

  it('rejects moving a node into itself or its own subtree', () => {
    const result = resolveDrop(
      { source: 'preview', path: [2] }, // the nested Card
      { path: [2, 0] }, // its own child Text
      makeTree(),
    );
    expect(result).toMatchObject({
      kind: 'rejected',
      reason: 'self-or-subtree',
    });
  });

  it('rejects moving the root', () => {
    const result = resolveDrop(
      { source: 'preview', path: [] },
      { path: [1] },
      makeTree(),
    );
    expect(result).toMatchObject({
      kind: 'rejected',
      reason: 'root-immovable',
    });
  });

  it('rejects a preview move with no drop target', () => {
    const result = resolveDrop(
      { source: 'preview', path: [0] },
      null,
      makeTree(),
    );
    expect(result).toMatchObject({ kind: 'rejected', reason: 'no-target' });
  });
});

