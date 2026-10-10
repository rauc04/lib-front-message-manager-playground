import type { MouseEvent } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  type ComponentNode,
  type InterpolateLimits,
  type Meta,
} from '@macropaytd/lib-front-fifo-message-manager';
import { idToPath, type NodePath } from '../lib/tree-ops';
import { PreviewSelectionLayer } from './PreviewSelectionLayer';

export interface PreviewProps {
  /** The current tree to render (or null → placeholder). */
  tree: ComponentNode | null;
  /** Interpolation bag resolving `{{...}}` tokens. */
  bag: Meta;
  /** Security limits for truncating interpolated strings. */
  limits: InterpolateLimits;
  /** Currently selected node path, or null. */
  selected: NodePath | null;
  /** Select a node (or null to deselect). */
  onSelect: (path: NodePath | null) => void;
}

/**
 * Live preview of the component tree, rendered through the REAL
 * `MessageComponentRenderer` as an INLINE card (NO DS Modal, NO fixed backdrop,
 * NO portal — hard constraint for the webview). The preview doubles as the
 * visual selector + drag canvas: it installs ONE delegated click handler that
 * maps the clicked element back to its `NodePath` via the owned
 * `data-node-path` selection layer (`PreviewSelectionLayer`). The single
 * `DndContext` lives in `App`, so this component only renders draggables /
 * droppables and reports selection.
 */
export const Preview = ({
  tree,
  bag,
  limits,
  selected,
  onSelect,
}: PreviewProps) => {
  // The empty-tree body is a droppable so a palette chip creates the root.
  const emptyDrop = useDroppable({
    id: 'preview-empty-root',
    data: { source: 'preview-empty', path: [] as NodePath },
  });

  const handleStageClick = (event: MouseEvent<HTMLDivElement>) => {
    const el = (event.target as HTMLElement).closest('[data-node-path]');
    if (!el) {
      onSelect(null);
      return;
    }
    const raw = el.getAttribute('data-node-path');
    if (raw === null) {
      onSelect(null);
      return;
    }
    onSelect(idToPath(raw));
  };

  return (
    <section className="preview-card">
      <header className="preview-card__header">
        <h2 className="preview-card__title">Vista previa</h2>
        <div className="preview-card__actions">
          {tree !== null && (
            <button
              type="button"
              className="preview-card__select-root"
              onClick={() => onSelect([])}
            >
              Seleccionar raíz
            </button>
          )}
        </div>
      </header>

      <div
        className="preview-card__stage"
        onClick={handleStageClick}
        role="presentation"
      >
        {tree ? (
          <PreviewSelectionLayer
            node={tree}
            path={[]}
            bag={bag}
            limits={limits}
            selected={selected}
          />
        ) : (
          <div
            ref={emptyDrop.setNodeRef}
            className={
              'preview-card__empty' +
              (emptyDrop.isOver ? ' preview-card__empty--over' : '')
            }
          >
            <em>Sin componente</em>
            <p className="preview-card__hint">
              Haz clic en un componente para editarlo, o arrastra uno nuevo
              desde la paleta.
            </p>
          </div>
        )}
      </div>

      <footer className="preview-card__footer">
        <button type="button" className="preview-card__ok">
          OK
        </button>
      </footer>
    </section>
  );
};
