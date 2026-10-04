import type { Notifier, Pull } from '../../../../lib/pull.js';
import type { MountContext } from '../../../../types.js';

export type PullToggleValueParams = {
  values: string[];
  source: Pull<number>;
};

/**
 * Paints the current value into a span that the widget owns.
 *
 * The host node stays empty as far as Svelte is concerned: the widget creates
 * the span, writes to it, and removes it on destroy. Do not put `textContent`
 * on the same host — see `pullToggleMenuItem`, which gives the widget its own
 * fchild on the right and leaves the title to Svelte.
 *
 * It paints on mount, when `source` notifies, and when the instance's `pull`
 * notifier fires (see `PullCheckbox`).
 */
export class PullToggleValue {
  /** `onMount` handler for the host. The cleanup it returns unsubscribes. */
  static onMount(params: PullToggleValueParams) {
    return (node: HTMLElement, ctx: MountContext) =>
      new PullToggleValue(node, params, ctx.pull).destroy;
  }

  private host: HTMLSpanElement;
  private unsubscribes: (() => void)[] = [];

  constructor(
    private node: HTMLElement,
    private params: PullToggleValueParams,
    pull: Notifier
  ) {
    this.host = document.createElement('span');
    this.node.appendChild(this.host);
    this.unsubscribes.push(pull.subscribe(this.paint));
    const offSource = this.params.source.subscribe?.(this.paint);
    if (offSource) this.unsubscribes.push(offSource);
    this.paint();
  }

  paint = () => {
    const { values, source } = this.params;
    this.host.textContent = values[source.get()];
  };

  destroy = () => {
    for (const off of this.unsubscribes) off();
    this.unsubscribes = [];
    this.host.remove();
  };
}
