import type { Pull } from '../../../../lib/pull.js';
import { paintMounted, registerPainter } from './registry.js';

export type PullToggleLabelParams = {
  label: string;
  values: string[];
  source: Pull<number>;
};

/**
 * Paints `label: value` into a span that the widget owns.
 *
 * The host node stays empty as far as Svelte is concerned: the widget creates
 * the span, writes to it, and removes it on destroy. Do not put `textContent`
 * on the same host — see {@link pullToggleMenuItem}.
 */
export class PullToggleLabel {
  /**
   * Handler for the `onMount` of the `FChild` with id `hostId`, plus a
   * `paint()` you can call after a click.
   *
   * `paint()` goes through `hostId`, not through this call's widget: a rebuilt
   * row must paint the widget that is on the node now. It does nothing when no
   * widget is mounted there.
   */
  static mount(hostId: string, params: PullToggleLabelParams) {
    return {
      onMount: (node: HTMLElement) => {
        const widget = new PullToggleLabel(node, params);
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
    private params: PullToggleLabelParams
  ) {
    this.host = document.createElement('span');
    this.node.appendChild(this.host);
    this.unsubscribe = this.params.source.subscribe?.(this.paint);
    this.paint();
  }

  paint = () => {
    const { label, values, source } = this.params;
    this.host.textContent = `${label}: ${values[source.get()]}`;
  };

  destroy = () => {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.host.remove();
  };
}
