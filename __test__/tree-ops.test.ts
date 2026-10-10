import { describe, it, expect } from 'vitest';
import type { ComponentNode } from '@macropaytd/lib-front-fifo-message-manager';
import {
  pathToId,
  idToPath,
  samePath,
  isAncestorPath,
  getNodeAtPath,
  replaceNodeAtPath,
  removeNodeAtPath,
  appendChildAtPath,
  makeNode,
  sameParent,
  reorderChildAtPath,
  collectNodeIds,
  setPropAtPath,
  renamePropAtPath,
  setTextChildAtPath,
  adjustPathAfterRemoval,
} from '../src/lib/tree-ops';

/**
 * Build a small deterministic tree. tree-ops does NO validation, so the `type`
 * strings are arbitrary labels used only to assert structural behavior.
 *
 *   Card (root)
 *   ├─ Text ("a")        [0]
 *   └─ Alert             [1]
 *      └─ Title ("t")    [1,0]
 */
const makeTree = (): ComponentNode => ({
  type: 'Card',
  children: [
    { type: 'Text', children: 'a' },
    {
      type: 'Alert',
      props: { variant: 'info' },
      children: [{ type: 'Title', children: 't' }],
    },
  ],
});

describe('pathToId', () => {
  it("maps the empty path to 'root'", () => {
    expect(pathToId([])).toBe('root');
  });

  it('joins indices onto the root prefix', () => {
    expect(pathToId([0, 2])).toBe('root.0.2');
  });
});

describe('idToPath', () => {
  it("maps 'root' to the empty path", () => {
    expect(idToPath('root')).toEqual([]);
  });

  it('parses child indices after the root prefix', () => {
    expect(idToPath('root.0.2')).toEqual([0, 2]);
  });

  it('round-trips with pathToId', () => {
    expect(idToPath(pathToId([]))).toEqual([]);
    expect(idToPath(pathToId([0, 2]))).toEqual([0, 2]);
    expect(pathToId(idToPath('root.1.3.0'))).toBe('root.1.3.0');
  });
});

describe('adjustPathAfterRemoval', () => {
  it('shifts a same-parent target that sits AFTER the removed index down by one', () => {
    expect(adjustPathAfterRemoval([0, 3], [0, 1])).toEqual([0, 2]);
  });

  it('leaves a same-parent target BEFORE the removed index unchanged', () => {
    expect(adjustPathAfterRemoval([0, 0], [0, 2])).toEqual([0, 0]);
  });

  it('leaves an unrelated branch untouched', () => {
    expect(adjustPathAfterRemoval([1, 0], [0, 1])).toEqual([1, 0]);
  });

  it('is a no-op when the removed path is the root ([])', () => {
    expect(adjustPathAfterRemoval([0, 1], [])).toEqual([0, 1]);
  });

  it('is a no-op when the target is shorter than the removed path', () => {
    expect(adjustPathAfterRemoval([0], [0, 1])).toEqual([0]);
  });
});

describe('samePath', () => {
  it('is true for equal paths', () => {
    expect(samePath([0, 1], [0, 1])).toBe(true);
    expect(samePath([], [])).toBe(true);
  });

  it('is false for different length or values', () => {
    expect(samePath([0], [0, 1])).toBe(false);
    expect(samePath([0, 1], [0, 2])).toBe(false);
  });
});

describe('isAncestorPath', () => {
  it('is true for a strict prefix', () => {
    expect(isAncestorPath([0], [0, 1])).toBe(true);
  });

  it('treats the empty path as ancestor of any non-empty path', () => {
    expect(isAncestorPath([], [0])).toBe(true);
    expect(isAncestorPath([], [3, 1, 2])).toBe(true);
  });

  it('is false for equal paths (not strict)', () => {
    expect(isAncestorPath([0, 1], [0, 1])).toBe(false);
    expect(isAncestorPath([], [])).toBe(false);
  });

  it('is false for a non-prefix path', () => {
    expect(isAncestorPath([1], [0, 1])).toBe(false);
  });
});

describe('getNodeAtPath', () => {
  it('returns null for a null tree', () => {
    expect(getNodeAtPath(null, [])).toBeNull();
    expect(getNodeAtPath(null, [0])).toBeNull();
  });

  it('returns the root for the empty path', () => {
    const tree = makeTree();
    expect(getNodeAtPath(tree, [])).toBe(tree);
  });

  it('resolves a nested node', () => {
    const tree = makeTree();
    expect(getNodeAtPath(tree, [1, 0])?.type).toBe('Title');
  });

  it('returns null for an out-of-range index', () => {
    expect(getNodeAtPath(makeTree(), [5])).toBeNull();
  });

  it('returns null when the path descends into a text-children node', () => {
    // [0] is the Text node whose children is the string "a".
    expect(getNodeAtPath(makeTree(), [0, 0])).toBeNull();
  });
});

describe('replaceNodeAtPath', () => {
  it('replaces the whole tree for the root path', () => {
    const next = makeNode('Alert');
    expect(replaceNodeAtPath(makeTree(), [], next)).toBe(next);
  });

  it('returns a new tree and leaves the original unchanged (immutability)', () => {
    const tree = makeTree();
    const snapshot = JSON.stringify(tree);
    const next = makeNode('Badge');
    const updated = replaceNodeAtPath(tree, [0], next);

    expect(updated).not.toBe(tree);
    expect(getNodeAtPath(updated, [0])?.type).toBe('Badge');
    expect(JSON.stringify(tree)).toBe(snapshot);
  });

  it('returns `next` when the tree is null and the path is root', () => {
    const next = makeNode('Text');
    expect(replaceNodeAtPath(null, [], next)).toBe(next);
  });

  it('returns the (null) tree when it is null and the path is non-root', () => {
    expect(replaceNodeAtPath(null, [0], makeNode('Text'))).toBeNull();
  });
});

describe('removeNodeAtPath', () => {
  it('removing the root yields null', () => {
    expect(removeNodeAtPath(makeTree(), [])).toBeNull();
  });

  it('drops a nested child from its parent', () => {
    const updated = removeNodeAtPath(makeTree(), [0]);
    const kids = updated?.children as ComponentNode[];
    expect(kids).toHaveLength(1);
    expect(kids[0].type).toBe('Alert');
  });

  it('returns null for a null tree', () => {
    expect(removeNodeAtPath(null, [0])).toBeNull();
  });
});

describe('appendChildAtPath', () => {
  it('appends to a node with existing array children', () => {
    const updated = appendChildAtPath(makeTree(), [], makeNode('Button'));
    const kids = updated?.children as ComponentNode[];
    expect(kids).toHaveLength(3);
    expect(kids[2].type).toBe('Button');
  });

  it('creates a children array on a node that has none', () => {
    const updated = appendChildAtPath(makeTree(), [1, 0], makeNode('Text'));
    const kids = getNodeAtPath(updated, [1, 0])?.children as ComponentNode[];
    expect(Array.isArray(kids)).toBe(true);
    expect(kids).toHaveLength(1);
    expect(kids[0].type).toBe('Text');
  });

  it('drops a text child when appending (mutual exclusivity)', () => {
    const updated = appendChildAtPath(makeTree(), [0], makeNode('Tag'));
    const node = getNodeAtPath(updated, [0]);
    expect(Array.isArray(node?.children)).toBe(true);
    expect((node?.children as ComponentNode[])[0].type).toBe('Tag');
  });

  it('leaves the original tree unchanged', () => {
    const tree = makeTree();
    const snapshot = JSON.stringify(tree);
    appendChildAtPath(tree, [], makeNode('Button'));
    expect(JSON.stringify(tree)).toBe(snapshot);
  });
});

describe('makeNode', () => {
  it('returns a node with only the type set', () => {
    expect(makeNode('Alert')).toEqual({ type: 'Alert' });
  });
});

describe('sameParent', () => {
  it('is true for siblings (same length, same prefix, differing last index)', () => {
    expect(sameParent([1, 0], [1, 2])).toBe(true);
  });

  it('is true for root-level siblings', () => {
    expect(sameParent([0], [1])).toBe(true);
  });

  it('is false for different parents', () => {
    expect(sameParent([0, 0], [1, 0])).toBe(false);
  });

  it('is false for empty paths', () => {
    expect(sameParent([], [])).toBe(false);
  });
});

describe('reorderChildAtPath', () => {
  const parent = (): ComponentNode => ({
    type: 'Card',
    children: [{ type: 'A' }, { type: 'B' }, { type: 'C' }],
  });
  const types = (tree: ComponentNode | null) =>
    (tree?.children as ComponentNode[]).map((c) => c.type);

  it('moves a child forward', () => {
    const updated = reorderChildAtPath(parent(), [], 0, 2);
    expect(types(updated)).toEqual(['B', 'C', 'A']);
  });

  it('moves a child backward', () => {
    const updated = reorderChildAtPath(parent(), [], 2, 0);
    expect(types(updated)).toEqual(['C', 'A', 'B']);
  });

  it('returns the same tree when fromIndex === toIndex', () => {
    const tree = parent();
    expect(reorderChildAtPath(tree, [], 1, 1)).toBe(tree);
  });

  it('leaves the parent unchanged for an out-of-range fromIndex', () => {
    const updated = reorderChildAtPath(parent(), [], 9, 0);
    expect(types(updated)).toEqual(['A', 'B', 'C']);
  });

  it('clamps toIndex above length', () => {
    const updated = reorderChildAtPath(parent(), [], 0, 99);
    expect(types(updated)).toEqual(['B', 'C', 'A']);
  });

  it('clamps toIndex below zero', () => {
    const updated = reorderChildAtPath(parent(), [], 2, -5);
    expect(types(updated)).toEqual(['C', 'A', 'B']);
  });
});

describe('collectNodeIds', () => {
  it('returns an empty array for a null tree', () => {
    expect(collectNodeIds(null)).toEqual([]);
  });

  it('returns a single id for a leaf node', () => {
    expect(collectNodeIds({ type: 'Text' })).toEqual(['root']);
  });

  it('collects ids depth-first, root first', () => {
    const tree: ComponentNode = {
      type: 'Card',
      children: [{ type: 'A', children: [{ type: 'A0' }] }, { type: 'B' }],
    };
    expect(collectNodeIds(tree)).toEqual([
      'root',
      'root.0',
      'root.0.0',
      'root.1',
    ]);
  });
});

describe('setPropAtPath', () => {
  it('creates the props object when setting a new prop', () => {
    const updated = setPropAtPath({ type: 'Text' }, [], 'variant', 'info');
    expect(updated?.props).toEqual({ variant: 'info' });
  });

  it('overwrites an existing prop', () => {
    const updated = setPropAtPath(
      { type: 'Alert', props: { variant: 'info' } },
      [],
      'variant',
      'error',
    );
    expect(updated?.props).toEqual({ variant: 'error' });
  });

  it('deletes a prop when value is undefined', () => {
    const updated = setPropAtPath(
      { type: 'Alert', props: { variant: 'info', title: 'x' } },
      [],
      'variant',
      undefined,
    );
    expect(updated?.props).toEqual({ title: 'x' });
  });

  it('drops the props object when the last prop is removed', () => {
    const updated = setPropAtPath(
      { type: 'Alert', props: { variant: 'info' } },
      [],
      'variant',
      undefined,
    );
    expect(updated).not.toBeNull();
    expect('props' in (updated as ComponentNode)).toBe(false);
  });

  it('returns the tree unchanged when it is null', () => {
    expect(setPropAtPath(null, [], 'k', 'v')).toBeNull();
  });
});

describe('renamePropAtPath', () => {
  it('renames preserving the value and key order', () => {
    const updated = renamePropAtPath(
      { type: 'Alert', props: { a: '1', variant: 'info', b: '2' } },
      [],
      'variant',
      'kind',
    );
    expect(updated?.props).toEqual({ a: '1', kind: 'info', b: '2' });
    expect(Object.keys(updated?.props ?? {})).toEqual(['a', 'kind', 'b']);
  });

  it('returns the tree unchanged when oldKey === newKey', () => {
    const tree: ComponentNode = { type: 'Alert', props: { variant: 'info' } };
    expect(renamePropAtPath(tree, [], 'variant', 'variant')).toBe(tree);
  });

  it('leaves a node without props untouched', () => {
    const updated = renamePropAtPath({ type: 'Text' }, [], 'a', 'b');
    expect(updated).toEqual({ type: 'Text' });
  });

  it('leaves a node without the oldKey untouched', () => {
    const node: ComponentNode = { type: 'Alert', props: { variant: 'info' } };
    const updated = renamePropAtPath(node, [], 'missing', 'b');
    expect(updated?.props).toEqual({ variant: 'info' });
  });

  it('returns the tree unchanged when it is null', () => {
    expect(renamePropAtPath(null, [], 'a', 'b')).toBeNull();
  });
});

describe('setTextChildAtPath', () => {
  it('sets text on a node with no children', () => {
    const updated = setTextChildAtPath({ type: 'Text' }, [], 'hola');
    expect(updated?.children).toBe('hola');
  });

  it('removes children when the text is empty', () => {
    const updated = setTextChildAtPath(
      { type: 'Text', children: 'hola' },
      [],
      '',
    );
    expect(updated).not.toBeNull();
    expect('children' in (updated as ComponentNode)).toBe(false);
  });

  it('is a no-op when the node has element (array) children', () => {
    const node: ComponentNode = {
      type: 'Card',
      children: [{ type: 'Text' }],
    };
    const updated = setTextChildAtPath(node, [], 'ignored');
    expect(Array.isArray(updated?.children)).toBe(true);
    expect((updated?.children as ComponentNode[])[0].type).toBe('Text');
  });

  it('returns the tree unchanged when it is null', () => {
    expect(setTextChildAtPath(null, [], 'x')).toBeNull();
  });
});

