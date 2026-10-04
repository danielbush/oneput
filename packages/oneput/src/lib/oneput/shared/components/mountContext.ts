/**
 * Carries the {@link MountContext} of one Oneput instance down to `FChild` and
 * `Flex`, which pass it to each `onMount` handler.
 *
 * `OneputController.svelte` sets it. `setMountContext` and `getMountContext`
 * use Svelte context, so call them while a component initialises, not inside
 * `onMount`.
 */
import { getContext, setContext } from 'svelte';
import { notifier } from '../../lib/pull.js';
import type { MountContext } from '../../types.js';

const KEY = Symbol('oneput.mountContext');

export function setMountContext(ctx: MountContext): void {
  setContext(KEY, ctx);
}

/**
 * The context of the enclosing Oneput instance.
 *
 * A bare `<Oneput>` (no controller) has none. Then each caller gets a notifier
 * of its own: widgets still paint on mount and from their source, but no
 * controller can reach them.
 */
export function getMountContext(): MountContext {
  return getContext<MountContext | undefined>(KEY) ?? { pull: notifier() };
}
