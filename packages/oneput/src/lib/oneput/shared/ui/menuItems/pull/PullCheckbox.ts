import type { Notifier, Pull } from '../../../../lib/pull.js';
import type { MountContext } from '../../../../types.js';

/**
 * Keeps the `checked` property of an input in step with a pull source.
 *
 * The widget writes the DOM property, not the Svelte `checked` attribute, so a
 * menu rebuild cannot put a stale tick back.
 *
 * It paints on mount, when `source` notifies, and when the instance's `pull`
 * notifier fires. The row never holds the widget: a rebuilt row is a new
 * object, but the widget from the first build stays on the node, so the row
 * reaches it through `ctl.pull`.
 */
export class PullCheckbox {
  /** `onMount` handler for the input. The cleanup it returns unsubscribes. */
  static onMount(source: Pull<boolean>) {
    return (node: HTMLElement, ctx: MountContext) =>
      new PullCheckbox(node as HTMLInputElement, source, ctx.pull).destroy;
  }

  private unsubscribes: (() => void)[] = [];

  constructor(
    private input: HTMLInputElement,
    private source: Pull<boolean>,
    pull: Notifier
  ) {
    this.unsubscribes.push(pull.subscribe(this.paint));
    const offSource = this.source.subscribe?.(this.paint);
    if (offSource) this.unsubscribes.push(offSource);
    this.paint();
  }

  paint = () => {
    this.input.checked = this.source.get();
  };

  destroy = () => {
    for (const off of this.unsubscribes) off();
    this.unsubscribes = [];
  };
}
