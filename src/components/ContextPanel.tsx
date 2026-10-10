import type { UseComponentTreeReturn } from "../store/useComponentTree"
import type { NodePath } from "../lib/tree-ops"
import { Palette } from "./Palette"
import { PropertiesPanel } from "./PropertiesPanel"

export interface ContextPanelProps {
  /** The ONE central store instance. */
  store: UseComponentTreeReturn
  /** The selected node path, or null when nothing is selected. */
  selected: NodePath | null
  /** Report a selection change. */
  onSelect: (path: NodePath | null) => void
}

/**
 * The right-column CONTEXTUAL panel (design §6a): renders the `Palette` when
 * nothing is selected (always-visible draggable new-node source) and the
 * `PropertiesPanel` for the selected node otherwise. Driven solely by the one
 * `selected` flag — no second selection source.
 */
export const ContextPanel = ({ store, selected, onSelect }: ContextPanelProps) => (
  <div className="app__context">
    {selected === null ? (
      <Palette />
    ) : (
      <PropertiesPanel store={store} selected={selected} onSelect={onSelect} />
    )}
  </div>
)
