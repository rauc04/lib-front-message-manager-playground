# Rediseño del Playground — Notas para retomar

> Documento de contexto. Resume lo acordado y lo analizado del código real.
> **Nada de esto está implementado todavía** — es la propuesta cerrada lista para construir.

## Objetivo general

Reorganizar el `Message Manager Playground` de un layout de 2 columnas a un
layout tipo **builder visual (estilo Figma)** de 3 columnas, conservando el modo
oscuro, mejorar el drag & drop, y previsualizar el resultado con el
**`AlertDialog` real** de `@macropaytd/lib-front-ui-components`.

## Decisiones acordadas con el usuario

1. **Layout de 3 columnas (opción A, sin barra de iconos):**
   - Izquierda: **Biblioteca** de componentes con buscador (Contenedores / Elementos).
   - Centro: **Lienzo** a pantalla completa (editable).
   - Derecha: **Inspector tipo Figma** (props del nodo seleccionado) + **Datos de ejemplo**.
2. **Sin topbar nueva** (la de la v2 no se quería) y **sin botones de acción**
   en el header (se eliminaron Elegir tipo / Crear raíz / Cargar ejemplo / Vaciar / Copiar JSON).
   - La raíz se crea **arrastrando** el primer componente al lienzo (ya no hay "Crear raíz").
3. **JSON del componente**: panel **flotante colapsable** anclado abajo del
   lienzo (colapsado por defecto, para que el lienzo ocupe todo el centro). Con
   un **ícono discreto de copiar** dentro de ese panel (no botón destacado).
4. **Modo oscuro conservado** (tokens `--pg-*`, claro/oscuro/alto contraste).
5. **Inspector por esquema CURADO (punto 2):**
   - Al seleccionar un nodo se muestran **todas sus props configurables** con
     control tipado (enum → select, boolean → toggle, number → input, string → texto).
   - **Sin campo de texto libre** para inventar props. **"Añadir hijo"** solo en
     contenedores y con **lista cerrada** de tipos válidos → imposible crear
     props/nodos inexistentes.
   - Catálogo nuevo `src/lib/prop-schemas.ts` escrito a mano pero **derivado de
     los typings reales** de la librería UI (interfaces `*Props` + enums de `*Variants`).
   - Componentes sin esquema aún: muestran solo las props que el nodo ya tiene (sin campo libre).
   - **Primer lote sugerido:** Button, Alert, Badge, Text, Title, Card,
     CardHeader, CardContent, CardFooter, Input, Checkbox, Switch.
6. **Drag & drop mejorado:** `DragOverlay` con chip-fantasma que sigue el cursor,
   línea de inserción, zona de drop resaltada (borde accent + wash), origen
   atenuado, transiciones suaves.

## CAMBIO DE PLAN (lo último que se revisó): usar `AlertDialog`, no `Modal`

- Se descarta el `Modal`. El preview del mensaje usará **`AlertDialog`** de
  `@macropaytd/lib-front-ui-components`.
- **`AlertDialog` NO tiene prop `type`** todavía (otro dev la está agregando). No se usa.
- Se diseñará con **`layout="centered"`** y el **árbol de componentes irá en la
  prop `media`** (zona hero full-width de arriba), como en la imagen de referencia
  (banner azul + check + título + descripción + botón "Entendido").

### Firma real de `AlertDialogProps` (verificada en los typings)

```ts
interface AlertDialogProps {
  isOpen: boolean;
  title: string;                       // REQUERIDO
  description?: string | React.ReactNode;
  confirmLabel?: string;               // default "Continue"
  cancelLabel?: string;                // default "Cancel"
  variant?: "default" | "destructive";
  layout?: "default" | "centered";
  media?: React.ReactNode;             // solo en layout "centered" — hero full-width arriba
  icon?: IconProp;                     // alternativa a media, solo "centered"
  isCloseable?: boolean;               // muestra X; requiere onCancel. Solo "centered"
  onConfirm?: () => void;
  onCancel?: () => void;
  onEvent?: (event: { type: string; payload: unknown }) => void;
}
```

### Qué renderiza `layout="centered"` (análisis del JS compilado)

Content con `rounded-2xl overflow-hidden`, en orden vertical:
1. **media/icon**: si hay `media` → `<div class="w-full overflow-hidden">{media}</div>`
   (ancho completo, sin padding) = el banner hero. Si no hay media pero sí icon →
   ícono en cajita centrada.
2. **Botón cerrar (X)** flotante arriba-derecha, solo si `isCloseable` (usa `onCancel`).
3. Bloque centrado con padding: **title** (xl semibold), **description** (sm muted),
   y botones **full-width apilados**: confirmLabel (Button lg, variant según `variant`)
   y, si hay cancelLabel, botón ghost.

`layout="default"` NO lee `media`/`icon`; title/description a la izquierda y
botones abajo-derecha (cancel outline + confirm).

### Conclusiones del análisis

- **Factible** meter el árbol diseñado en `media` con `layout="centered"`.
  `media` es `ReactNode` → se le pasa `<MessageComponentRenderer tree={...} />`.
- `media` es **mejor slot que `description`** para el árbol (description queda como
  texto chico centrado; media es el bloque visual grande full-width).
- Si se usa el enfoque "árbol en media", el AlertDialog del playground va **fijo en
  `layout="centered"`** (default no lee media).
- **`title` es obligatorio** y siempre se muestra bajo el media → decidir qué poner
  (sugerencia: `{{title}}` del bag de interpolación).
- **`variant`** solo cambia el color del botón confirmar (default/destructive). No
  hay color de banner por tipo hasta que exista `type`. Mapeo provisional del
  `level`: `error → destructive`, resto → `default`.
- **`isCloseable` requiere `onCancel`** para que aparezca la X.
- **Portal + backdrop full-screen**: `AlertDialog` usa `AlertDialogPrimitive.Portal`
  + `Overlay fixed inset-0` (Radix). Igual que el Modal → embeberlo en la columna
  del lienzo implica hackear Radix (el Portal NO expone `container`). **Decisión:**
  lienzo editable con `MessageComponentRenderer` real + botón **"Ver real"** que
  abre el `AlertDialog` real (centered, árbol en media) a pantalla completa.

## Hechos técnicos verificados de la librería

- `@macropaytd/lib-front-ui-components` **es dependencia directa** (package.json,
  `^0.11.0`) → se puede `import { AlertDialog, Modal, ... }` directamente.
- La librería message-manager **NO expone esquema de props** en runtime (ni
  `propTypes` ni `defaultProps`). Pero los **typings** de la UI lib sí declaran
  las interfaces `*Props` y los enums en `*Variants` (ej. `buttonVariants`:
  `variant: default|ghost|link|secondary|outline|destructive|success`,
  `size: icon|sm|md|lg|xl`). De ahí se CURA el catálogo `prop-schemas.ts`.
- `MessageComponentRenderer` es el renderer real del árbol (Layer 2). El ROOT no
  se auto-envuelve; antes `MessageModal` lo envolvía. Ahora se usa el renderer
  directo como contenido del `media` del AlertDialog.
- `levelToModalType` mapea level → `default|success|error|warning|info` (se usaba
  para el Modal `type`; con AlertDialog sin `type` queda en espera / se usa para
  derivar `variant`).
- 60 componentes renderizables disponibles (EMBEDDABLE ∩ con renderer).

## Alcance de archivos (cuando se implemente)

- Tocar: `src/App.tsx`, `src/App.css`, `src/components/ContextPanel.tsx`,
  `Palette.tsx`, `PropertiesPanel.tsx`, `Preview.tsx`.
- Nuevos: `src/lib/prop-schemas.ts` (catálogo curado), componente del preview con
  `AlertDialog` real.
- NO tocar: store `useComponentTree`, `tree-ops`, `interpolation`, `resolve-drop` (lógica), renderer de la librería.
- Verificación: `npm run build` (tsc -b + vite) + tests en `__test__/`
  (ajustar los que dependan de textos/estructura viejos).

## Pendientes de confirmar antes de implementar

- [ ] ¿`title` del AlertDialog = `{{title}}` del bag, o un campo fijo editable?
- [ ] ¿`layout` fijo en `centered`, o permitir alternar default/centered en el inspector?
- [ ] Confirmar mapeo provisional `level → variant` (`error→destructive`, resto→`default`).
- [ ] Confirmar primer lote de componentes a catalogar en `prop-schemas.ts`.
- [ ] Esperar a que el otro dev agregue `type` a `AlertDialog` para conectar el color por nivel.

## Historial de iteraciones de diseño (artefactos SVG en la sesión)

v1–v2: 3 columnas con/sin barra de iconos → elegida **A (sin barra)**.
v3: header sin botones.
v4: inspector por esquema (con selector de añadir prop — luego descartado).
v5: inspector tipo Figma + recuperado Datos de ejemplo.
v6: sin botones de acción.
v7: lienzo full + JSON flotante + idea de marco de modal.
v8: selector de level + ícono copiar + props reales (Button).
v9: **AlertDialog** sin `type`, variant por level (última versión del diseño).
Último ajuste analizado: árbol en **`media`** con **`layout="centered"`** (sin SVG nuevo).
