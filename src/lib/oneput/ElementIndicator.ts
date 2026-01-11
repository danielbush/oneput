import { JSED_IGNORE_CLASS } from '../jsed/lib/constants.js';
import { getParent, isToken } from '../jsed/lib/token.js';

/**
 * Provides a visual indicator for the focused element (non-tokens).
 */
export class ElementIndicator {
  static create() {
    return new ElementIndicator();
  }

  constructor() {
    document.addEventListener('scroll', this.#scrollHandler, true);
  }

  /**
   * The indicator.
   */
  #indicator: HTMLElement | null = null;
  /**
   * The element we're indicating on.
   */
  #element: HTMLElement | null = null;
  #showIndicator = false;

  #scrollHandler = () => {
    if (this.#indicator) {
      this.#indicator.style.display = 'none';
    }
  };

  destroy() {
    document.removeEventListener('scroll', this.#scrollHandler, true);
    this.#removeIndicator();
  }

  showIndicator(bool: boolean) {
    this.#showIndicator = bool;
    if (bool) {
      this.#addIndicator();
    } else {
      this.#removeIndicator();
    }
  }

  /**
   * Update the focus around the F_ELEM that the user sees.
   *
   * If a token is passed, calculate the focus based on the token.
   */
  updateFocus(el: HTMLElement | null): void {
    if (!el) {
      this.#element = null;
      return;
    }
    this.#element = isToken(el) ? getParent(el) : el;
    if (this.#showIndicator) {
      this.#addIndicator();
    }
  }

  #addIndicator(): void {
    this.#removeIndicator();
    const el = this.#element;
    if (!el) {
      return;
    }
    const indic = this.#makeIndicator(el);
    document.body.appendChild(indic);
    this.#indicator = indic;
  }

  #makeIndicator(el: HTMLElement): HTMLElement {
    const tagn = el.tagName;
    const rect = el.getBoundingClientRect();

    const span = document.createElement('span');
    span.classList.add(JSED_IGNORE_CLASS);
    span.classList.add('jsed-tag-indicator');
    span.style.position = 'fixed';
    span.style.top = `${rect.top - 5}px`;
    span.style.left = `${rect.right}px`;
    span.style.transform = 'translateY(-100%) translateX(-100%)';
    span.style.pointerEvents = 'none';
    span.style.zIndex = '999999';
    span.innerText = tagn;
    return span;
  }

  #removeIndicator(): void {
    if (this.#indicator) {
      this.#indicator.remove();
      this.#indicator = null;
    }
  }
}
