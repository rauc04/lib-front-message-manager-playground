import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import type { ComponentNode } from '@macropaytd/lib-front-fifo-message-manager';

/**
 * Mock the renderer so each node produces a recognizable marker. The owned
 * `data-node-path` selection layer wraps this output, so clicking the marker
 * still resolves to the node's path via `closest('[data-node-path]')`.
 *
 * v2 note: Preview no longer imports the DS `Modal`, so the previous
 * whole-module `Modal` mock is dropped. Preview renders an inline card with
 * plain DOM (title "Vista previa", a plain "OK" button, "Sin componente"
 * placeholder), so no DS module stub is required for these assertions.
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

// Import AFTER the mock so Preview binds to the stubbed renderer.
import { Preview } from '../src/components/Preview';
import { DEFAULT_LIMITS } from '../src/lib/interpolation';
import type { NodePath } from '../src/lib/tree-ops';

const renderPreview = (
  ui: Parameters<typeof render>[0],
): ReturnType<typeof render> =>
  render(<DndContext>{ui as ReactNode}</DndContext>);

const noop = () => {};

describe('Preview', () => {
  it('renders the title and OK button', () => {
    renderPreview(
      <Preview
        tree={null}
        bag={{}}
        limits={DEFAULT_LIMITS}
        selected={null}
        onSelect={noop}
      />,
    );
    expect(screen.getByText('Vista previa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
  });

  it('shows the placeholder and no renderer when the tree is null', () => {
    renderPreview(
      <Preview
        tree={null}
        bag={{}}
        limits={DEFAULT_LIMITS}
        selected={null}
        onSelect={noop}
      />,
    );
    expect(screen.getByText('Sin componente')).toBeInTheDocument();
    expect(screen.queryByTestId('rendered-node')).toBeNull();
  });

  it('renders the renderer stub and no placeholder for a non-null tree', () => {
    const tree: ComponentNode = { type: 'Alert', children: 'hi' };
    renderPreview(
      <Preview
        tree={tree}
        bag={{}}
        limits={DEFAULT_LIMITS}
        selected={null}
        onSelect={noop}
      />,
    );

    const rendered = screen.getAllByTestId('rendered-node')[0];
    expect(rendered).toBeInTheDocument();
    expect(rendered).toHaveTextContent('Alert');
    expect(screen.queryByText('Sin componente')).toBeNull();
  });

  it('selects a node when a data-node-path element is clicked (#1)', () => {
    const picked: Array<NodePath | null> = [];
    const tree: ComponentNode = {
      type: 'Card',
      children: [{ type: 'Alert', children: 'hi' }],
    };
    const { container } = renderPreview(
      <Preview
        tree={tree}
        bag={{}}
        limits={DEFAULT_LIMITS}
        selected={null}
        onSelect={(p) => picked.push(p)}
      />,
    );

    const childWrapper = container.querySelector(
      '[data-node-path="root.0"]',
    ) as HTMLElement;
    expect(childWrapper).not.toBeNull();
    fireEvent.click(childWrapper);
    expect(picked).toContainEqual([0]);
  });

  it('deselects when an empty area of the stage is clicked', () => {
    const picked: Array<NodePath | null> = [];
    renderPreview(
      <Preview
        tree={null}
        bag={{}}
        limits={DEFAULT_LIMITS}
        selected={null}
        onSelect={(p) => picked.push(p)}
      />,
    );
    fireEvent.click(screen.getByText('Sin componente'));
    expect(picked).toContainEqual(null);
  });

  it('renders an empty-container placeholder and the Seleccionar raíz button (#6)', () => {
    const picked: Array<NodePath | null> = [];
    // An empty Card container (no children) → placeholder with its path.
    const tree: ComponentNode = { type: 'Card' };
    const { container } = renderPreview(
      <Preview
        tree={tree}
        bag={{}}
        limits={DEFAULT_LIMITS}
        selected={null}
        onSelect={(p) => picked.push(p)}
      />,
    );

    expect(screen.getByText('Card (vacío)')).toBeInTheDocument();
    const dropTarget = container.querySelector(
      '.pv-node--drop-target[data-node-path="root"]',
    );
    expect(dropTarget).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar raíz' }));
    expect(picked).toContainEqual([]);
  });
});

