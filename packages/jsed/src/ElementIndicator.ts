import { getParent } from './lib/token.js';
import { isToken } from './lib/taxonomy.js';
import { Indicator } from './lib/indicator.js';
import type { IndicatorConfig } from './lib/indicator.js';

// #region Types

interface MinimalObserver {
  observe(el: Element): void;
  disconnect(): void;
}

type ObserverFactory = (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) => MinimalObserver;

interface ElementIndicatorDeps {
  doc: {
    addEventListener(
      type: string,
      handler: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener(
      type: string,
      handler: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ): void;
  };
  indicator: Indicator;
  createObserver: ObserverFactory;
  viewportHeight: () => number;
}

// #endregion

// #region Embedded stubs

class NullObserver implements MinimalObserver {
  observe() {}
  disconnect() {}
}

// #endregion

/**
 * Provides a visual indicator for the focused element (non-tokens).
 */
export class ElementIndicator {
  static create() {
    return new ElementIndicator({
      doc: document,
      indicator: Indicator.create(document, document.body),
      createObserver: (callback, options) => new IntersectionObserver(callback, options),
      viewportHeight: () => window.innerHeight
    });
  }

  static createNull(opts?: { indicatorSize?: IndicatorConfig; viewportHeight?: number }) {
    const viewportHeight = opts?.viewportHeight ?? 768;
    return new ElementIndicator({
      doc: document,
      indicator: Indicator.createNull(opts?.indicatorSize),
      createObserver: () => new NullObserver(),
      viewportHeight: () => viewportHeight
    });
  }

  #deps: ElementIndicatorDeps;

  /**
   * The element we're indicating on.
   */
  #element: HTMLElement | null = null;
  #showIndicator = false;
  #observer: MinimalObserver | null = null;
  #isVisible = true;

  #scrollHandler = () => {
    this.#deps.indicator.hide();
  };

  #scrollEndHandler = () => {
    if (this.#showIndicator && this.#element && this.#isVisible) {
      this.#addIndicator();
    }
  };

  constructor(deps: ElementIndicatorDeps) {
    this.#deps = deps;
    deps.doc.addEventListener('scroll', this.#scrollHandler, true);
    deps.doc.addEventListener('scrollend', this.#scrollEndHandler, true);
  }

  destroy() {
    this.#deps.doc.removeEventListener('scroll', this.#scrollHandler, true);
    this.#deps.doc.removeEventListener('scrollend', this.#scrollEndHandler, true);
    this.#observer?.disconnect();
    this.#observer = null;
    this.#deps.indicator.remove();
  }

  showIndicator(bool: boolean) {
    this.#showIndicator = bool;
    if (bool) {
      this.#addIndicator();
    } else {
      this.#deps.indicator.remove();
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
    this.#observer = this.#deps.createObserver(
      ([entry]) => {
        this.#isVisible = entry.isIntersecting;
        if (!this.#isVisible) {
          this.#deps.indicator.remove();
        } else if (this.#showIndicator) {
          this.#addIndicator();
        }
      },
      { threshold: 0 }
    );
    this.#observer.observe(el);
  }

  #addIndicator(): void {
    const el = this.#element;
    if (!el) return;
    this.#deps.indicator.show(el, this.#deps.viewportHeight());
  }
}
