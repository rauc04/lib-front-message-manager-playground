import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { ComponentNode } from '@macropaytd/lib-front-fifo-message-manager';

/**
 * Mock the renderer so App's preview is deterministic under jsdom (no DS lazy
 * Font Awesome chunks). We assert structural outcomes via the projected
 * `store.jsonText` shown in the single JSON `role="textbox"`, which is the
 * single source of truth.
 */
vi.mock('@macropaytd/lib-front-fifo-message-manager', async () => {
  const actual = await vi.importActual<
    typeof import('@macropaytd/lib-front-fifo-message-manager')
  >('@macropaytd/lib-front-fifo-message-manager');
  return {
    ...actual,
    MessageComponentRenderer: ({ node }: { node: ComponentNode }) => (
      <div data-testid="rendered-node">{node.type}</div>
    ),
  };
});

import { App } from '../src/App';

/** Read the LEFT JSON editor textarea (scoped to `.app__json`). */
const getJson = () => {
  const area = document.querySelector(
    '.app__json textarea',
  ) as HTMLTextAreaElement;
  return area.value;
};

const parsedJson = () => JSON.parse(getJson()) as ComponentNode | null;

describe('App — start blank (#3)', () => {
  it('starts with an empty tree, placeholder, and Crear raíz enabled', () => {
    render(<App />);
    expect(getJson()).toBe('null');
    expect(screen.getByText('Sin componente')).toBeInTheDocument();
    expect(screen.getByLabelText('Crear raíz')).not.toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Cargar ejemplo' }),
    ).toBeInTheDocument();
    // With nothing selected, the context panel shows the palette.
    expect(screen.getByText('Componentes')).toBeInTheDocument();
  });
});

describe('App — Crear raíz / Añadir hijo / Eliminar (#2)', () => {
  it('creates a Card root then appends Alert and Title as ordered children', () => {
    render(<App />);

    // Crear raíz (Card)
    fireEvent.change(screen.getByLabelText('Crear raíz'), {
      target: { value: 'Card' },
    });
    expect(parsedJson()).toEqual({ type: 'Card' });

    // The new root is selected → properties panel open with Añadir hijo.
    // Añadir hijo selects the new child, so re-select the Card root before the
    // second add to place both as SIBLINGS under the Card.
    const addChild = () => screen.getByLabelText('Añadir hijo');
    fireEvent.change(addChild(), { target: { value: 'Alert' } });
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar raíz' }));
    fireEvent.change(addChild(), { target: { value: 'Title' } });

    const tree = parsedJson() as ComponentNode;
    expect(tree.type).toBe('Card');
    const kids = tree.children as ComponentNode[];
    expect(kids.map((c) => c.type)).toEqual(['Alert', 'Title']);
  });

  it('Eliminar removes the selected node', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Crear raíz'), {
      target: { value: 'Card' },
    });
    fireEvent.change(screen.getByLabelText('Añadir hijo'), {
      target: { value: 'Alert' },
    });
    // After add, the new child [0] is selected; delete it.
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    const tree = parsedJson() as ComponentNode;
    expect(tree.type).toBe('Card');
    // removeNodeAtPath leaves an empty children array (no pruning).
    expect(tree.children).toEqual([]);
  });
});

describe('App — editing a prop reflects in JSON + chip (#4)', () => {
  it('shows a String chip and reflects an edited scalar prop in the JSON', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Crear raíz'), {
      target: { value: 'Alert' },
    });

    // Add a string prop "variant".
    const panel = screen
      .getByText(/Propiedades ·/)
      .closest('.props') as HTMLElement;
    const scope = within(panel);
    fireEvent.change(scope.getByPlaceholderText('nueva prop'), {
      target: { value: 'variant' },
    });
    fireEvent.click(scope.getByRole('button', { name: 'Agregar' }));

    // A String-labeled type chip appears for the scalar prop.
    expect(scope.getByText('String')).toBeInTheDocument();

    // Edit its value; the row's value input is the text input next to the chip.
    const valueInput = panel.querySelector(
      '.props__row input.props__value-input',
    ) as HTMLInputElement;
    fireEvent.change(valueInput, { target: { value: 'info' } });

    const tree = parsedJson() as ComponentNode;
    expect(tree.props).toEqual({ variant: 'info' });
  });
});

