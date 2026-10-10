import {
  EMBEDDABLE_COMPONENTS,
  getRenderComponent,
} from '@macropaytd/lib-front-fifo-message-manager';

/**
 * The single source of truth for which components can be placed in the editor:
 * names that are BOTH on the embeddable allowlist AND have a real renderer in
 * the render registry. Overlays and unmappable names are excluded automatically
 * because `getRenderComponent` returns undefined for them.
 */
export const PALETTE_COMPONENTS: string[] = EMBEDDABLE_COMPONENTS.filter(
  (name) => !!getRenderComponent(name),
);

/**
 * Allowlist of component names that can GROUP children (design §6). Additive
 * metadata layered on top of `PALETTE_COMPONENTS` — it does NOT alter the
 * `PALETTE_COMPONENTS` export or its filter (the `palette.test.ts` equality
 * depends on that staying untouched).
 */
export const CONTAINER_COMPONENTS: string[] = [
  'StaggerChildren',
  'Card',
  'CardHeader',
  'CardContent',
  'CardFooter',
  'Accordion',
  'Collapsible',
  'Tabs',
  'ScrollArea',
  'Carousel',
  'ResizablePanelGroup',
  'Table',
  'TableBody',
  'TableRow',
  'Form',
];

/**
 * True when `name` is a container (accepts children) AND is actually offerable
 * in the palette (has a renderer). The `&& PALETTE_COMPONENTS.includes(name)`
 * guard means a container that lacks a renderer is never treated as one.
 */
export const isContainerComponent = (name: string): boolean =>
  CONTAINER_COMPONENTS.includes(name) && PALETTE_COMPONENTS.includes(name);
