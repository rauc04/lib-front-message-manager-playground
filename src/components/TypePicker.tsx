import { PALETTE_COMPONENTS, isContainerComponent } from '../lib/palette';

export interface TypePickerProps {
  /** The currently chosen type, or "" for the placeholder option. */
  value: string;
  /** Called with the chosen component type name. */
  onPick: (type: string) => void;
  /** Accessible label for the native select. */
  ariaLabel?: string;
  /** Disable the picker (e.g. "Crear raíz" when a tree already exists). */
  disabled?: boolean;
}

/**
 * A small reusable component-type chooser: a native `<select>` of
 * `PALETTE_COMPONENTS` with containers grouped FIRST (design §6). Native
 * `<select>` is deliberate — the DS `Select` API diverges (string-only
 * onChange + `options`), and keeping it native inherits the §10 theme tokens.
 * Used by "Crear raíz" and "Añadir hijo".
 */
export const TypePicker = ({
  value,
  onPick,
  ariaLabel,
  disabled,
}: TypePickerProps) => {
  const containers = PALETTE_COMPONENTS.filter(isContainerComponent);
  const elements = PALETTE_COMPONENTS.filter(
    (name) => !isContainerComponent(name),
  );

  return (
    <select
      className="type-picker"
      aria-label={ariaLabel ?? 'Tipo de componente'}
      disabled={disabled}
      value={value}
      onChange={(event) => {
        const next = event.target.value;
        if (next) onPick(next);
      }}
    >
      <option value="">Elegir tipo…</option>
      {containers.length > 0 && (
        <optgroup label="Contenedores">
          {containers.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label="Elementos">
        {elements.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </optgroup>
    </select>
  );
};

