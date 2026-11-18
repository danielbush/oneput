/**
 * Icons for Oneput's own UI (menus, buttons, breadcrumbs). An icon is geometry
 * data, such as a Lucide icon export: a list of `[tag, attributes]` pairs. It is
 * never an SVG string or a function.
 *
 * Registration checks the data and stores a frozen copy. Rendering checks it
 * again and builds the SVG with DOM calls. An unknown name or invalid data draws
 * a fixed fallback: a square with a diagonal line. See `icons/geometry.ts` for
 * what the check allows.
 */
import { type Result } from 'neverthrow';
import { checkIconGeometry, type IconDefinition } from './icons/geometry.js';
import { drawIcon } from './icons/dom.js';

export { checkIconGeometry } from './icons/geometry.js';
export type { IconDefinition, IconNode } from './icons/geometry.js';

export type RegisteredIconNames<Icons extends Record<string, unknown>> = {
  readonly [Name in keyof Icons]: Name;
};

const iconRegistry = new Map<string, IconDefinition>();
const fallback: IconDefinition = [
  ['rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }],
  ['line', { x1: 3, y1: 3, x2: 21, y2: 21 }]
];

/**
 * Checks `definition` and stores it under `name`. It returns an error when the
 * check fails. In that case `name` draws the fallback icon, even if a valid icon
 * was registered under that name before.
 */
export function registerIcon(name: string, definition: IconDefinition): Result<void, Error> {
  const result = checkIconGeometry(definition);
  iconRegistry.set(name, result.isOk() ? result.value : fallback);
  return result.map(() => undefined);
}

/**
 * Registers each icon with `registerIcon` and returns an object of the names, for
 * use with `b.icon(name)`. For example, `registerIcons({ ChevronDown })` returns
 * `{ ChevronDown: 'ChevronDown' }`. Invalid icons draw the fallback.
 */
export function registerIcons<const Icons extends Record<string, IconDefinition>>(
  icons: Icons
): RegisteredIconNames<Icons> {
  for (const [name, definition] of Object.entries(icons)) registerIcon(name, definition);
  return Object.fromEntries(
    Object.keys(icons).map((name) => [name, name])
  ) as RegisteredIconNames<Icons>;
}

/**
 * Draws an icon into `target`, replacing its children. `icon` is a registered
 * name or geometry data.
 *
 * It checks the data again, because a caller can pass invalid data with a type
 * cast. An unknown name or invalid data draws the fallback icon.
 */
export function renderIcon(icon: string | IconDefinition, target: HTMLElement): void {
  const input = typeof icon === 'string' ? iconRegistry.get(icon) : icon;
  const checked = checkIconGeometry(input).orElse(() => checkIconGeometry(fallback));
  if (checked.isOk()) drawIcon(checked.value, target);
}
