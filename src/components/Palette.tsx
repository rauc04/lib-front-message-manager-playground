import { useDraggable } from '@dnd-kit/core';
import { PALETTE_COMPONENTS, isContainerComponent } from '../lib/palette';

/** dnd-kit id prefix marking a drag that originates from the palette. */
export const PALETTE_DRAG_PREFIX = 'palette:';

/** A single draggable palette chip for a component name. */
const PaletteItem = ({
  name,
  isContainer,
}: {
  name: string;
  isContainer: boolean;
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${PALETTE_DRAG_PREFIX}${name}`,
    data: { source: 'palette', componentName: name },
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      className={
        'palette__item' + (isContainer ? ' palette__item--container' : '')
      }
      style={{ opacity: isDragging ? 0.4 : 1 }}
      {...listeners}
      {...attributes}
    >
      {name}
    </button>
  );
};

/**
 * The palette: the no-selection state of the right contextual panel and the
 * ONLY place new nodes originate. It lists `PALETTE_COMPONENTS` (embeddable AND
 * renderable) split into TWO visible, labeled groups (user "v3" decision):
 * "CONTENEDORES" (components that accept children, listed first and highlighted)
 * and "ELEMENTOS" (the rest). The "CONTENEDORES" header renders ONLY when that
 * partition is non-empty. Each chip is a dnd-kit draggable whose drop target is
 * the preview.
 */
export const Palette = () => {
  const containers = PALETTE_COMPONENTS.filter(isContainerComponent);
  const elements = PALETTE_COMPONENTS.filter(
    (name) => !isContainerComponent(name),
  );

  if (PALETTE_COMPONENTS.length === 0) {
    return (
      <div className="palette">
        <h3 className="palette__title">Componentes</h3>
        <p className="palette__empty">
          No hay componentes renderizables disponibles en la librería instalada.
        </p>
      </div>
    );
  }

  return (
    <div className="palette">
      <h3 className="palette__title">Componentes</h3>
      <p className="palette__hint">
        Arrastra un componente hacia la vista previa para añadirlo.
      </p>

      {containers.length > 0 && (
        <div className="palette__group palette__group--containers">
          <h4 className="palette__group-label">CONTENEDORES</h4>
          <div className="palette__grid">
            {containers.map((name) => (
              <PaletteItem key={name} name={name} isContainer />
            ))}
          </div>
        </div>
      )}

      <div className="palette__group palette__group--elements">
        <h4 className="palette__group-label">ELEMENTOS</h4>
        <div className="palette__grid">
          {elements.map((name) => (
            <PaletteItem key={name} name={name} isContainer={false} />
          ))}
        </div>
      </div>
    </div>
  );
};
