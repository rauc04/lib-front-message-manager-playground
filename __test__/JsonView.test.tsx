import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JsonView } from '../src/components/JsonView';
import { useComponentTree } from '../src/store/useComponentTree';

/**
 * Tiny host component so the JSON view is wired to a real store instance and
 * re-renders on every state change (the store is a hook, so it must live inside
 * a component). JsonView only depends on the store, which uses the REAL
 * `validateComponent`; no library mock is needed here.
 */
const Host = () => {
  const store = useComponentTree();
  return <JsonView store={store} />;
};

const getTextarea = () => screen.getByRole('textbox') as HTMLTextAreaElement;

/**
 * The textarea is CONTROLLED by the store's `jsonText`, so `user.type`/`paste`
 * append to the snapped-back value and race the re-render. Firing a single
 * change with the full value is the realistic way to replace the whole buffer
 * (as a paste-over-selection would) and exactly exercises `handleChange`.
 */
const setJson = (value: string) =>
  fireEvent.change(getTextarea(), { target: { value } });

describe('JsonView', () => {
  it('shows the hint (no alert) after entering valid allowlisted JSON', () => {
    render(<Host />);
    setJson('{"type":"Alert","props":{"variant":"info"},"children":"hi"}');

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText(/JSON válido/i)).toBeInTheDocument();
  });

  it('shows an inline error (and no hint) for invalid JSON', () => {
    render(<Host />);
    setJson('{ not valid json');

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/JSON válido/i)).toBeNull();
  });

  it("'Empezar de cero' commits null and shows 'null' with the hint", async () => {
    const user = userEvent.setup();
    render(<Host />);
    // Dirty the editor first so the reset is observable.
    setJson('{"type":"Alert"}');

    await user.click(screen.getByRole('button', { name: /Empezar de cero/i }));

    expect(getTextarea().value).toBe('null');
    expect(screen.getByText(/JSON válido/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it("'Cargar / Pegar JSON' unwraps a catalog entry to its inner component", async () => {
    const user = userEvent.setup();
    render(<Host />);
    setJson('{"component":{"type":"Alert"}}');

    await user.click(
      screen.getByRole('button', { name: /Cargar \/ Pegar JSON/i }),
    );

    expect(getTextarea().value).toBe(
      JSON.stringify({ type: 'Alert' }, null, 2),
    );
    expect(screen.getByText(/JSON válido/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it("'Cargar / Pegar JSON' keeps a bare valid ComponentNode committed", async () => {
    const user = userEvent.setup();
    render(<Host />);
    setJson('{"type":"Alert","children":"hola"}');

    await user.click(
      screen.getByRole('button', { name: /Cargar \/ Pegar JSON/i }),
    );

    expect(getTextarea().value).toBe(
      JSON.stringify({ type: 'Alert', children: 'hola' }, null, 2),
    );
    expect(screen.getByText(/JSON válido/i)).toBeInTheDocument();
  });
});

