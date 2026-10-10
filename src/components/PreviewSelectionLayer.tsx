import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  MessageComponentRenderer,
  type ComponentNode,
  type InterpolateLimits,
  type Meta,
} from '@macropaytd/lib-front-fifo-message-manager';
import { isContainerComponent } from '../lib/palette';
import { pathToId, samePath, type NodePath } from '../lib/tree-ops';

export interface PreviewSelectionLayerProps {
  /** The node to render at this position. */
  node: ComponentNode;
  /** This node's address inside the central tree. */
  path: NodePath;
  /** Interpolation bag resolving `{{...}}` tokens. */
  bag: Meta;
  /** Security limits for truncating interpolated strings. */
  limits: InterpolateLimits;
  /** Currently selected node path, or null. */
  selected: NodePath | null;
}

const noop = () => {
  /* no events editor in v2 */
};

/** Strip element children so the renderer draws ONLY this node's own output. */
const stripChildren = (node: ComponentNode): ComponentNode => {
  if (Array.isArray(node.children)) {
    const { children, ...rest } = node;
    void children;
    return rest;
  }
  return node;
};

/** A thin sibling-insertion droppable carrying the hovered sibling's path. */
const DropLine = ({ path }: { path: NodePath }) => {
  const id = `dropline:${pathToId(path)}`;
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { source: 'preview-dropline', path },
  });
  return (
    <div
      ref={setNodeRef}
      className={'pv-dropline' + (isOver ? ' pv-dropline--over' : '')}
      data-node-path={pathToId(path)}
      aria-hidden="true"
    />
  );
};

/**
 * The owned `data-node-path` selection + drag layer (design §7). Recurses the
 * SAME `ComponentNode` tree, wrapping each node in a zero-geometry
 * `display: contents` wrapper that carries `data-node-path` (so delegated click
 * resolution via `closest('[data-node-path]')` is deterministic and geometry
 * free). dnd-kit's `useDraggable` and keyboard focus bind to a REAL boxed
 * `.pv-node__handle` button — the two mechanisms are deliberately split because
 * a `display: contents` element has no rect for dnd-kit's sensors and no box for
 * a focus ring. Containers additionally expose a real `.pv-node--drop-target`
 * body box; non-container leaves get only sibling drop lines.
 */
export const PreviewSelectionLayer = ({
  node,
  path,
  bag,
  limits,
  selected,
}: PreviewSelectionLayerProps) => {
  const id = pathToId(path);
  const isRoot = path.length === 0;
  const isSelected = selected !== null && samePath(selected, path);
  const isContainer = isContainerComponent(node.type);
  const childNodes = Array.isArray(node.children) ? node.children : null;
  const hasRenderableChildren = !!childNodes && childNodes.length > 0;

  // Drag source — the root is NOT draggable (guarantee: root does not move).
  const draggable = useDraggable({
    id: `preview:${id}`,
    data: { source: 'preview', path },
    disabled: isRoot,
  });

  // Container body droppable (reparent / append target). Only containers expose
  // it, so a non-container leaf can never silently nest children.
  const containerDrop = useDroppable({
    id: `drop-target:${id}`,
    data: { source: 'preview-drop-target', path },
    disabled: !isContainer,
  });

  const strippedNode = stripChildren(node);

  // Empty node with no element children AND nothing meaningful to show: still
  // render the node's own output; the empty-container affordance is handled by
  // the container body zone below. A truly empty container shows a dashed box.
  const isEmptyContainer = isContainer && !hasRenderableChildren;

  return (
    <div
      className={'pv-node' + (isSelected ? ' is-selected' : '')}
      data-node-path={id}
      style={{ display: 'contents' }}
    >
      {!isRoot && (
        <button
          type="button"
          ref={draggable.setNodeRef}
          className="pv-node__handle"
          aria-label={`Seleccionar o mover ${node.type}`}
          {...draggable.listeners}
          {...draggable.attributes}
        >
          ⠿
        </button>
      )}

      <MessageComponentRenderer
        node={strippedNode}
        interpolation={bag}
        limits={limits}
        onAction={noop}
      />

      {isContainer && (
        <div
          ref={containerDrop.setNodeRef}
          className={
            'pv-node--drop-target' +
            (containerDrop.isOver ? ' pv-node--drop-target--over' : '')
          }
          data-node-path={id}
        >
          {isEmptyContainer ? (
            <span className="pv-node--empty">{node.type} (vacío)</span>
          ) : (
            <span className="pv-node--drop-hint">
              Soltar aquí para añadir hijo
            </span>
          )}
        </div>
      )}

      {hasRenderableChildren &&
        childNodes.map((child, index) => {
          const childPath = [...path, index];
          return (
            <div
              key={pathToId(childPath)}
              className="pv-node__slot"
              style={{ display: 'contents' }}
            >
              <DropLine path={childPath} />
              <PreviewSelectionLayer
                node={child}
                path={childPath}
                bag={bag}
                limits={limits}
                selected={selected}
              />
            </div>
          );
        })}
    </div>
  );
};

