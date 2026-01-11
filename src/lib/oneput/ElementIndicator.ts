import { JSED_IGNORE_CLASS } from '../jsed/lib/constants.js';
import { getParent, isToken } from '../jsed/lib/token.js';

/**
 * Provides a visual indicator for the focused element (non-tokens).
 */
export class ElementIndicator {
  static create() {
    return new ElementIndicator();
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
    if (!el.parentElement) {
      return;
    }
    const indic = this.#makeIndicator(el);
    el.insertBefore(indic, el.firstChild);
    this.#indicator = indic;
  }

  /**
   * We'll make a container that sits at the beginning of the element with no
   * dimensions and inline so it doesn't break any lines.  Then we add an
   * absolutely positioned tag indicator and try to position it above the
   * element.
   */
  #makeIndicator(el: HTMLElement): HTMLElement {
    const tagn = el.tagName;
    const offw = el.offsetWidth;
    const container = document.createElement('div');
    container.classList.add(JSED_IGNORE_CLASS);
    container.style.position = 'relative';
    container.style.display = 'inline';
    container.style.verticalAlign = 'top';
    container.style.height = '0';
    container.style.maxHeight = '0';
    container.style.width = '0';
    container.style.maxWidth = '0';
    const span = document.createElement('span');
    span.classList.add(JSED_IGNORE_CLASS);
    span.classList.add('jsed-tag-indicator');
    span.style.position = 'absolute';
    span.style.transform = `translateY(calc(-100% - 5px)) translateX(calc(${offw}px - 100%))`;
    span.innerText = tagn;
    container.appendChild(span);
    return container;
  }

  #removeIndicator(): void {
    if (this.#indicator) {
      this.#indicator.remove();
      this.#indicator = null;
    }
  }
}
