import { useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { Meta } from '@macropaytd/lib-front-fifo-message-manager';
import './App.css';
import { ContextPanel } from './components/ContextPanel';
import { CopyJsonButton } from './components/CopyJsonButton';
import { JsonView } from './components/JsonView';
import { Preview } from './components/Preview';
import { SampleMetaPanel } from './components/SampleMetaPanel';
import { TypePicker } from './components/TypePicker';
import { buildBagFromSample, DEFAULT_LIMITS } from './lib/interpolation';
import { makeNode, type NodePath } from './lib/tree-ops';
import {
  resolveDrop,
  type DragSource,
  type DropActive,
  type DropOver,
} from './lib/resolve-drop';
import { useComponentTree } from './store/useComponentTree';

/**
 * The playground: one `useComponentTree` instance is the single source of
 * truth. The JSON view (left) and the inline preview-selector (right) are both
 * PROJECTIONS/editors of that one tree; the sample-meta panel drives the
 * interpolation bag the preview consumes. Selection is local UI state (a node
 * path) and is the SINGLE flag that drives both the preview's selection outline
 * and the Palette↔Properties toggle in `ContextPanel`.
 */
export const App = () => {
  const store = useComponentTree(null);
  const [selected, setSelected] = useState<NodePath | null>(null);
  const [rootType, setRootType] = useState('');
  const [dropHint, setDropHint] = useState<string | null>(null);
  const [bag, setBag] = useState<Meta>(() =>
    buildBagFromSample({
      code: 'E001',
      title: 'Título de ejemplo',
      message: 'Mensaje de ejemplo',
      level: 'error',
      meta: { orderId: 'A-1024' },
    }),
  );

  const limits = useMemo(() => DEFAULT_LIMITS, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const createRoot = (type: string) => {
    store.mutateTree(makeNode(type));
    setSelected([]);
    setRootType('');
    setDropHint(null);
  };

  const loadSample = () => {
    store.seedSample();
    setSelected(null);
    setDropHint(null);
  };

  const clearAll = () => {
    store.mutateTree(null);
    setSelected(null);
    setDropHint(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDropHint(null);
    const activeData = event.active.data.current as
      | { source?: DragSource; path?: NodePath; componentName?: string }
      | undefined;
    if (!activeData?.source) return;

    const active: DropActive = {
      source: activeData.source,
      path: activeData.path,
      componentName: activeData.componentName,
    };
    const overData = event.over?.data.current as
      | { path?: NodePath }
      | undefined;
    const over: DropOver | null =
      overData && overData.path ? { path: overData.path } : null;

    const result = resolveDrop(active, over, store.tree);
    if (result.kind === 'rejected') {
      const message =
        result.reason === 'self-or-subtree'
          ? 'No se puede mover un nodo dentro de sí mismo.'
          : result.reason === 'root-immovable'
            ? 'La raíz no se puede mover.'
            : 'Suelta el componente sobre la vista previa.';
      setDropHint(message);
      return;
    }

    store.mutateTree(result.tree);
    setSelected(result.select);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="app">
        <header className="app__topbar">
          <div className="app__brand">
            <h1>Message Manager Playground</h1>
            <p>
              Diseña el <code>component</code> declarativo de un mensaje. Edita
              el JSON a la izquierda o selecciona/arrastra en la vista previa;
              el render usa el renderer real de la librería.
            </p>
          </div>
          <div className="app__actions">
            <div className="app__create-root">
              <TypePicker
                value={rootType}
                onPick={createRoot}
                ariaLabel="Crear raíz"
                disabled={store.tree !== null}
              />
              <span className="app__create-root-label">Crear raíz</span>
            </div>
            <button type="button" className="app__btn" onClick={loadSample}>
              Cargar ejemplo
            </button>
            <button
              type="button"
              className="app__btn"
              onClick={clearAll}
              disabled={store.tree === null}
            >
              Vaciar
            </button>
            <CopyJsonButton jsonText={store.jsonText} />
          </div>
        </header>

        <main className="app__grid">
          <section className="app__json">
            <JsonView store={store} />
          </section>

          <div className="app__right">
            <Preview
              tree={store.tree}
              bag={bag}
              limits={limits}
              selected={selected}
              onSelect={setSelected}
            />
            {dropHint && (
              <p className="app__drop-hint" role="status">
                {dropHint}
              </p>
            )}
            <ContextPanel
              store={store}
              selected={selected}
              onSelect={setSelected}
            />
            <SampleMetaPanel onBagChange={setBag} />
          </div>
        </main>
      </div>
    </DndContext>
  );
};
