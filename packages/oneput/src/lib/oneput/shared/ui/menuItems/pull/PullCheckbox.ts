import type { Pull } from '../../../../lib/pull.js';
import { paintMounted, registerPainter } from './registry.js';

/**
 * Keeps the `checked` property of an input in step with a pull source.
 *
 * The widget writes the DOM property, not the Svelte `checked` attribute, so a
 * menu rebuild cannot put a stale tick back.
 */
export class PullCheckbox {
  /**
   * Handler for the `onMount` of the input with id `hostId`, plus a `paint()`
   * you can call after a click.
   *
   * `paint()` goes through `hostId`, not through this call's widget: a rebuilt
   * row must paint the widget that is on the node now. It does nothing when no
   * widget is mounted there.
   */
  static mount(hostId: string, source: Pull<boolean>) {
    return {
      onMount: (node: HTMLElement) => {
        const widget = new PullCheckbox(node as HTMLInputElement, source);
        const release = registerPainter(hostId, widget);
        return () => {
          release();
          widget.destroy();
        };
      },
      paint: () => paintMounted(hostId)
    };
  }

  private unsubscribe?: () => void;

  constructor(
    private input: HTMLInputElement,
    private source: Pull<boolean>
  ) {
    this.unsubscribe = this.source.subscribe?.(this.paint);
    this.paint();
  }

  paint = () => {
    this.input.checked = this.source.get();
  };

  destroy = () => {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  };
}
