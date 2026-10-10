import { useCallback, useState } from 'react';
import {
  validateComponent,
  type ComponentNode,
} from '@macropaytd/lib-front-fifo-message-manager';

/** Pretty-print a tree the way the JSON projection should look. */
const pretty = (tree: ComponentNode | null): string =>
  JSON.stringify(tree, null, 2);

/** Result of attempting to commit JSON text into the tree. */
export type SetFromJsonResult = { ok: true } | { ok: false; error: string };

/** A small sample tree used to seed the editor on first load. */
export const SAMPLE_TREE: ComponentNode = {
  type: 'Alert',
  props: { variant: 'info', title: '{{title}}' },
  children: 'Código {{code}} — {{message}}',
};

export interface UseComponentTreeReturn {
  /** The single source of truth. */
  tree: ComponentNode | null;
  /** Projection of `tree` as pretty JSON text (or the last raw text on error). */
  jsonText: string;
  /**
   * Parse + validate JSON text and, when valid, commit it as the new tree.
   * On parse/validation failure the tree is left unchanged but `jsonText`
   * keeps the raw text so the JSON view can display it alongside the error.
   */
  setFromJson: (text: string) => SetFromJsonResult;
  /** Replace the tree directly (visual edits) and re-serialize the JSON view. */
  mutateTree: (nextTree: ComponentNode | null) => void;
  /** Seed the editor with the sample tree. */
  seedSample: () => void;
}

/**
 * The single source of truth for the editor: ONE `tree` state plus a `jsonText`
 * projection. The JSON view and the visual view are projections of the same
 * model — there are not two independently-synced states.
 */
export const useComponentTree = (
  initial: ComponentNode | null = null,
): UseComponentTreeReturn => {
  const [tree, setTree] = useState<ComponentNode | null>(initial);
  const [jsonText, setJsonText] = useState<string>(() => pretty(initial));

  const setFromJson = useCallback((text: string): SetFromJsonResult => {
    // Empty / whitespace / explicit `null` means "start from scratch": commit
    // an empty tree directly instead of routing it through validateComponent
    // (which treats `null` as a validation failure). This keeps the
    // create-from-scratch path working.
    const trimmed = text.trim();
    if (trimmed === '' || trimmed === 'null') {
      setTree(null);
      setJsonText(pretty(null));
      return { ok: true };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      setJsonText(text);
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'JSON inválido',
      };
    }

    const validated = validateComponent(parsed);
    if (!validated) {
      setJsonText(text);
      return {
        ok: false,
        error:
          'El árbol no pasó la validación (componente no permitido o estructura inválida).',
      };
    }

    setTree(validated);
    setJsonText(pretty(validated));
    return { ok: true };
  }, []);

  const mutateTree = useCallback((nextTree: ComponentNode | null) => {
    setTree(nextTree);
    setJsonText(pretty(nextTree));
  }, []);

  const seedSample = useCallback(() => {
    setTree(SAMPLE_TREE);
    setJsonText(pretty(SAMPLE_TREE));
  }, []);

  return { tree, jsonText, setFromJson, mutateTree, seedSample };
};

