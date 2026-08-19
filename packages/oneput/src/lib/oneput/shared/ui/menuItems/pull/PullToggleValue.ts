import type { Pull } from '../../../../lib/pull.js';
import { paintMounted, registerPainter } from './registry.js';

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
 */
export class PullToggleValue {
  /**
   * Handler for the `onMount` of the `FChild` with id `hostId`, plus a
   * `paint()` you can call after a click.
   *
   * `paint()` goes through `hostId`, not through this call's widget: a rebuilt
   * row must paint the widget that is on the node now. It does nothing when no
   * widget is mounted there.
   */
  static mount(hostId: string, params: PullToggleValueParams) {
    return {
      onMount: (node: HTMLElement) => {
        const widget = new PullToggleValue(node, params);
        const release = registerPainter(hostId, widget);
        return () => {
          release();
          widget.destroy();
        };
      },
      paint: () => paintMounted(hostId)
    };
  }

  private host: HTMLSpanElement;
  private unsubscribe?: () => void;

  constructor(
    private node: HTMLElement,
    private params: PullToggleValueParams
  ) {
    this.host = document.createElement('span');
    this.node.appendChild(this.host);
    this.unsubscribe = this.params.source.subscribe?.(this.paint);
    this.paint();
  }

  paint = () => {
    const { values, source } = this.params;
    this.host.textContent = values[source.get()];
  };

  destroy = () => {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.host.remove();
  };
}
