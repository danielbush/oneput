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
    document.addEventListener('scrollend', this.#scrollEndHandler, true);
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
  #observer: IntersectionObserver | null = null;
  #isVisible = true;

  #scrollHandler = () => {
    if (this.#indicator) {
      this.#indicator.style.display = 'none';
    }
  };

  #scrollEndHandler = () => {
    if (this.#showIndicator && this.#element && this.#isVisible) {
      this.#addIndicator();
    }
  };

  destroy() {
    document.removeEventListener('scroll', this.#scrollHandler, true);
    document.removeEventListener('scrollend', this.#scrollEndHandler, true);
    this.#observer?.disconnect();
    this.#observer = null;
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
      this.#observer?.disconnect();
      this.#isVisible = true;
      return;
    }
    this.#element = isToken(el) ? getParent(el) : el;
    this.#setupObserver(this.#element);
    if (this.#showIndicator) {
      this.#addIndicator();
    }
  }

  #setupObserver(el: HTMLElement): void {
    this.#observer?.disconnect();
    this.#observer = new IntersectionObserver(
      ([entry]) => {
        this.#isVisible = entry.isIntersecting;
        if (!this.#isVisible) {
          this.#removeIndicator();
        } else if (this.#showIndicator) {
          this.#addIndicator();
        }
      },
      { threshold: 0 }
    );
    this.#observer.observe(el);
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
    span.style.left = `${rect.right}px`;
    span.style.pointerEvents = 'none';
    span.style.zIndex = '999999';
    span.innerText = tagn;

    // Temporarily add to measure height
    span.style.visibility = 'hidden';
    document.body.appendChild(span);
    const indicatorHeight = span.offsetHeight;
    span.remove();
    span.style.visibility = '';

    // Check if indicator would be cut off at top of viewport
    const spaceAbove = rect.top - 5;
    if (spaceAbove < indicatorHeight) {
      // Position below the element instead
      span.style.top = `${rect.bottom + 5}px`;
      span.style.transform = 'translateX(-100%)';
    } else {
      // Position above the element (default)
      span.style.top = `${rect.top - 5}px`;
      span.style.transform = 'translateY(-100%) translateX(-100%)';
    }

    return span;
  }

  #removeIndicator(): void {
    if (this.#indicator) {
      this.#indicator.remove();
      this.#indicator = null;
    }
  }
}
