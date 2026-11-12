/**
 * Chrome icons are registered geometry or checked geometry data, never SVG text
 * or executable renderers. Registration stores a checked, immutable copy.
 * Rendering checks again at the DOM boundary. Invalid names or data use one
 * fixed fallback. See icons/geometry.ts for the policy and input limits.
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

/** Refused registrations replace any prior value with the fixed fallback. */
export function registerIcon(name: string, definition: IconDefinition): Result<void, Error> {
  const result = checkIconGeometry(definition);
  iconRegistry.set(name, result.isOk() ? result.value : fallback);
  return result.map(() => undefined);
}

/** Register Lucide or custom geometry and return the names for UI builders. */
export function registerIcons<const Icons extends Record<string, IconDefinition>>(
  icons: Icons
): RegisteredIconNames<Icons> {
  for (const [name, definition] of Object.entries(icons)) registerIcon(name, definition);
  return Object.fromEntries(
    Object.keys(icons).map((name) => [name, name])
  ) as RegisteredIconNames<Icons>;
}

/** Render a registered name or geometry. Check data even after a type bypass. */
export function renderIcon(icon: string | IconDefinition, target: HTMLElement): void {
  const input = typeof icon === 'string' ? iconRegistry.get(icon) : icon;
  const checked = checkIconGeometry(input).orElse(() => checkIconGeometry(fallback));
  if (checked.isOk()) drawIcon(checked.value, target);
}
