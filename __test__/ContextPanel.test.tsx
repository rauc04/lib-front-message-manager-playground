import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { useEffect, useRef } from 'react';
import { ContextPanel } from '../src/components/ContextPanel';
import { useComponentTree } from '../src/store/useComponentTree';
import type { NodePath } from '../src/lib/tree-ops';

/**
 * Host wiring the panel to a REAL store (seeded once with a single-child Card so
 * index [0] resolves to a node), inside a DndContext (the palette chips use
 * dnd-kit). Selection is driven by props so we can toggle the two states.
 */
const Host = ({
  selected,
  onSelect = () => {},
}: {
  selected: NodePath | null;
  onSelect?: (p: NodePath | null) => void;
}) => {
  const store = useComponentTree(null);
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current) {
      seeded.current = true;
      store.mutateTree({
        type: 'Card',
        children: [{ type: 'Alert', props: { variant: 'info' } }],
      });
    }
  }, [store]);
  return (
    <DndContext>
      <ContextPanel store={store} selected={selected} onSelect={onSelect} />
    </DndContext>
  );
};

describe('ContextPanel (§6a toggle)', () => {
  it('renders the palette (with group headers) when nothing is selected', () => {
    render(<Host selected={null} />);
    expect(screen.getByText('Componentes')).toBeInTheDocument();
    expect(screen.getByText('CONTENEDORES')).toBeInTheDocument();
    expect(screen.getByText('ELEMENTOS')).toBeInTheDocument();
    expect(screen.queryByText(/Propiedades ·/)).toBeNull();
  });

  it('renders the PropertiesPanel for the selected node (not the palette)', () => {
    render(<Host selected={[0]} />);
    const title = screen.getByText(/Propiedades ·/);
    expect(title).toBeInTheDocument();
    // The node type is shown in the title's <code>.
    expect(title.querySelector('code')).toHaveTextContent('Alert');
    expect(screen.queryByText('CONTENEDORES')).toBeNull();
  });

  it('calls onSelect(null) when ✕ deseleccionar is clicked', () => {
    const calls: Array<NodePath | null> = [];
    render(<Host selected={[0]} onSelect={(p) => calls.push(p)} />);
    fireEvent.click(screen.getByRole('button', { name: /deseleccionar/i }));
    expect(calls).toContainEqual(null);
  });
});

