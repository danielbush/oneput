import { DateDisplay } from './DateDisplay.js';
import { TimeDisplay } from './TimeDisplay.js';

/**
 * Click (or Enter/Space) to toggle between {@link DateDisplay} and
 * {@link TimeDisplay}. Starts on date.
 *
 * Date and time remain separate widgets — use their `onMount` helpers when
 * you want either one alone.
 */
export class DateTimeToggle {
  static onMount = (node: HTMLElement) => {
    const widget = new DateTimeToggle(node);
    return () => {
      widget.destroy();
    };
  };

  private mode: 'date' | 'time' = 'date';
  private unmountActive?: () => void;
  private host: HTMLSpanElement;

  constructor(private node: HTMLElement) {
    this.host = document.createElement('span');
    this.node.appendChild(this.host);
    this.node.addEventListener('click', this.onClick);
    this.node.addEventListener('keydown', this.onKeyDown);
    if (this.node.tagName !== 'BUTTON') {
      this.node.setAttribute('role', 'button');
      this.node.tabIndex = 0;
    }
    this.show();
  }

  private onClick = (e: Event) => {
    e.preventDefault();
    this.toggle();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.toggle();
    }
  };

  private toggle() {
    this.mode = this.mode === 'date' ? 'time' : 'date';
    this.show();
  }

  private show() {
    this.unmountActive?.();
    this.host.replaceChildren();
    this.unmountActive =
      this.mode === 'date' ? DateDisplay.onMount(this.host) : TimeDisplay.onMount(this.host);
    const label = this.mode === 'date' ? 'Show time' : 'Show date';
    this.node.title = label;
    this.node.setAttribute('aria-label', label);
  }

  destroy = () => {
    this.node.removeEventListener('click', this.onClick);
    this.node.removeEventListener('keydown', this.onKeyDown);
    this.unmountActive?.();
  };
}
