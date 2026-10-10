import { useState } from 'react';
import type {
  ComponentNode,
  SerializableValue,
} from '@macropaytd/lib-front-fifo-message-manager';
import type { UseComponentTreeReturn } from '../store/useComponentTree';
import {
  appendChildAtPath,
  getNodeAtPath,
  isAncestorPath,
  makeNode,
  removeNodeAtPath,
  renamePropAtPath,
  samePath,
  setPropAtPath,
  setTextChildAtPath,
  type NodePath,
} from '../lib/tree-ops';
import { isContainerComponent } from '../lib/palette';
import { TYPE_TAG_COLOR, valueType } from '../lib/value-types';
import { TypePicker } from './TypePicker';

export interface PropertiesPanelProps {
  /** The ONE central store instance (edits commit through it). */
  store: UseComponentTreeReturn;
  /** The selected node path, or null when nothing is selected. */
  selected: NodePath | null;
  /** Report a selection change (deselect, retarget after add/delete). */
  onSelect: (path: NodePath | null) => void;
}

/** The scalar prop types the generic editor supports in v1. */
type PropKind = 'string' | 'number' | 'boolean';

const kindOf = (value: SerializableValue): PropKind | 'other' => {
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'other';
};

/** Coerce a text input + chosen kind into a SerializableValue. */
const coerce = (raw: string, kind: PropKind): SerializableValue => {
  if (kind === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  if (kind === 'boolean') return raw === 'true';
  return raw;
};

/** A color-coded, text-labeled value-type chip (meaning never color-only). */
const TypeChip = ({ value }: { value: SerializableValue }) => {
  const type = valueType(value);
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  return (
    <span
      className="props__chip"
      data-color={TYPE_TAG_COLOR[type]}
      title={`Tipo: ${label}`}
    >
      {label}
    </span>
  );
};

/**
 * Generic, FLEXIBLE per-node editor shown in the right contextual panel when a
 * node is selected. Lets the developer add / edit / remove scalar props
 * (string | number | boolean), edit a node's text child, add a typed child, and
 * delete the node. Every edit is an immutable update committed through
 * `store.mutateTree`, so the preview and the JSON view both update.
 *
 * Complex (array/object) props are shown read-only; edit those via the JSON
 * view, which keeps the generic UI simple while never corrupting the tree.
 */
export const PropertiesPanel = ({
  store,
  selected,
  onSelect,
}: PropertiesPanelProps) => {
  const [newKey, setNewKey] = useState('');
  const [newKind, setNewKind] = useState<PropKind>('string');
  const [childType, setChildType] = useState('');

  const node: ComponentNode | null =
    selected !== null ? getNodeAtPath(store.tree, selected) : null;

  if (!selected || !node) {
    return (
      <div className="props">
        <h3 className="props__title">Propiedades</h3>
        <p className="props__hint">
          Selecciona un componente en la vista previa para editarlo.
        </p>
      </div>
    );
  }

  const props = node.props ?? {};
  const propKeys = Object.keys(props);
  const hasElementChildren = Array.isArray(node.children);
  const hasTextChild =
    typeof node.children === 'string' && node.children.length > 0;
  const textChild = typeof node.children === 'string' ? node.children : '';
  const isContainer = isContainerComponent(node.type);

  const updateProp = (key: string, value: SerializableValue | undefined) => {
    store.mutateTree(setPropAtPath(store.tree, selected, key, value));
  };

  const renameProp = (oldKey: string, nextKey: string) => {
    if (!nextKey || nextKey === oldKey || nextKey in props) return;
    store.mutateTree(renamePropAtPath(store.tree, selected, oldKey, nextKey));
  };

  const addProp = () => {
    const key = newKey.trim();
    if (!key || key in props) return;
    updateProp(key, coerce('', newKind));
    setNewKey('');
    setNewKind('string');
  };

  const updateTextChild = (text: string) => {
    store.mutateTree(setTextChildAtPath(store.tree, selected, text));
  };

  const addChild = (type: string) => {
    const parent = getNodeAtPath(store.tree, selected);
    const existing = Array.isArray(parent?.children)
      ? parent.children.length
      : 0;
    store.mutateTree(appendChildAtPath(store.tree, selected, makeNode(type)));
    onSelect([...selected, existing]);
    setChildType('');
  };

  const deleteNode = () => {
    const deleted = selected;
    store.mutateTree(removeNodeAtPath(store.tree, deleted));
    if (samePath(selected, deleted) || isAncestorPath(deleted, selected)) {
      onSelect(null);
    }
  };

  return (
    <div className="props">
      <div className="props__header">
        <h3 className="props__title">
          Propiedades · <code>{node.type}</code>
        </h3>
        <button
          type="button"
          className="props__deselect"
          onClick={() => onSelect(null)}
          title="Deseleccionar"
        >
          ✕ deseleccionar
        </button>
      </div>

      {isContainer && (
        <p className="props__container-hint">
          Este contenedor puede agrupar varios elementos.
        </p>
      )}

      <div className="props__structure">
        <div className="props__add-child">
          <TypePicker
            value={childType}
            onPick={addChild}
            ariaLabel="Añadir hijo"
          />
          <span className="props__add-child-label">+ Añadir hijo</span>
        </div>
        {hasTextChild && (
          <p className="props__hint">
            Añadir un hijo reemplazará el texto actual por hijos de tipo
            componente.
          </p>
        )}
        <button
          type="button"
          className="props__delete"
          onClick={deleteNode}
          title="Eliminar nodo"
        >
          Eliminar
        </button>
      </div>

      <div className="props__list">
        {propKeys.length === 0 && (
          <p className="props__hint">Sin propiedades. Agrega una abajo.</p>
        )}
        {propKeys.map((key) => {
          const value = props[key];
          const kind = kindOf(value);
          if (kind === 'other') {
            return (
              <div key={key} className="props__row">
                <span className="props__key">{key}</span>
                <TypeChip value={value} />
                <span className="props__complex">
                  (valor complejo — edítalo en la vista JSON)
                </span>
                <button
                  type="button"
                  className="props__remove"
                  onClick={() => updateProp(key, undefined)}
                >
                  ✕
                </button>
              </div>
            );
          }
          return (
            <div key={key} className="props__row">
              <input
                className="props__key-input"
                value={key}
                onChange={(event) => renameProp(key, event.target.value.trim())}
              />
              {kind === 'boolean' ? (
                <select
                  className="props__value-input"
                  value={String(value)}
                  onChange={(event) =>
                    updateProp(key, event.target.value === 'true')
                  }
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input
                  className="props__value-input"
                  type={kind === 'number' ? 'number' : 'text'}
                  value={String(value)}
                  onChange={(event) =>
                    updateProp(key, coerce(event.target.value, kind))
                  }
                />
              )}
              <TypeChip value={value} />
              <button
                type="button"
                className="props__remove"
                onClick={() => updateProp(key, undefined)}
                title="Eliminar propiedad"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <div className="props__add">
        <input
          className="props__key-input"
          placeholder="nueva prop"
          value={newKey}
          onChange={(event) => setNewKey(event.target.value)}
        />
        <select
          className="props__value-input"
          value={newKind}
          onChange={(event) => setNewKind(event.target.value as PropKind)}
        >
          <option value="string">string</option>
          <option value="number">number</option>
          <option value="boolean">boolean</option>
        </select>
        <button type="button" onClick={addProp}>
          Agregar
        </button>
      </div>

      <div className="props__text">
        <label className="props__text-label">
          Texto hijo
          {hasElementChildren && (
            <span className="props__hint">
              {' '}
              (deshabilitado: el nodo tiene hijos de tipo componente)
            </span>
          )}
        </label>
        <textarea
          className="props__text-input"
          disabled={hasElementChildren}
          value={textChild}
          placeholder="Texto (admite tokens {{code}}, {{meta.*}}…)"
          onChange={(event) => updateTextChild(event.target.value)}
        />
      </div>
    </div>
  );
};
