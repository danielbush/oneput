import { getParent } from './lib/token.js';
import { isToken } from './lib/taxonomy.js';
import { Indicator } from './lib/indicator.js';

interface MinimalObserver {
  observe(el: Element): void;
  disconnect(): void;
}

type ObserverFactory = (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) => MinimalObserver;

/**
 * For embedded stubs.
 */
class NullObserver implements MinimalObserver {
  observe() {}
  disconnect() {}
}

/**
 * Provides a visual indicator for the focused element (non-tokens).
 */
export class ElementIndicator {
  static create() {
    return new ElementIndicator(Indicator.create(), {
      IntersectionObserver: (callback, options) => new IntersectionObserver(callback, options)
    });
  }

  static createNull(opts?: { viewportHeight?: number }) {
    return new ElementIndicator(
      Indicator.createNull({
        viewportHeight: opts?.viewportHeight
      }),
      {
        IntersectionObserver: () => new NullObserver()
      }
    );
  }

  /**
   * The element we're indicating on.
   */
  #element: HTMLElement | null = null;
  #showIndicator = false;
  #observer: MinimalObserver | null = null;
  #isVisible = true;

  #scrollHandler = () => {
    this.indicator.hide();
  };

  #scrollEndHandler = () => {
    if (this.#showIndicator && this.#element && this.#isVisible) {
      // TODO: scrollIntoView is not handled by scroll listeners so we add a
      // timeout.  Without this, the indicator may appear in the wrong place.
      setTimeout(() => {
        this.#addIndicator();
      }, 100);
    }
  };

  constructor(
    private indicator: Indicator,
    private create: {
      IntersectionObserver: ObserverFactory;
    }
  ) {
    document.addEventListener('scroll', this.#scrollHandler, true);
    document.addEventListener('scrollend', this.#scrollEndHandler, true);
  }

  destroy() {
    document.removeEventListener('scroll', this.#scrollHandler, true);
    document.removeEventListener('scrollend', this.#scrollEndHandler, true);
    this.#observer?.disconnect();
    this.#observer = null;
    this.indicator.remove();
  }

  showIndicator(bool: boolean) {
    this.#showIndicator = bool;
    if (bool) {
      this.#addIndicator();
    } else {
      this.indicator.remove();
    }
  }

  /**
   * Update the focus around the FOCUSABLE that the user sees.
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
    this.#observer = this.create.IntersectionObserver(
      ([entry]) => {
        this.#isVisible = entry.isIntersecting;
        if (!this.#isVisible) {
          this.indicator.remove();
        } else if (this.#showIndicator) {
          this.#addIndicator();
        }
      },
      { threshold: 0 }
    );
    this.#observer.observe(el);
  }

  #addIndicator(): void {
    if (!this.#element) return;
    this.indicator.show(this.#element);
  }
}
