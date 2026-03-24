import { JSED_IGNORE_CLASS } from './lib/constants.js';
import { getParent, isToken } from './lib/token.js';

// #region Types

interface MinimalObserver {
  observe(el: Element): void;
  disconnect(): void;
}

type ObserverFactory = (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) => MinimalObserver;

interface IndicatorDeps {
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
    createElement(tagName: string): HTMLElement;
    body: { appendChild(node: Node): Node };
  };
  createObserver: ObserverFactory;
}

// #endregion

// #region Embedded stubs

class NullObserver implements MinimalObserver {
  observe() {}
  disconnect() {}
}

class NullElement {
  classList = { add(..._classes: string[]) {} };
  style: Record<string, string> = {};
  innerText = '';
  offsetHeight = 0;
  remove() {}
}

// #endregion

/**
 * Provides a visual indicator for the focused element (non-tokens).
 */
export class ElementIndicator {
  static create() {
    return new ElementIndicator({
      doc: document,
      createObserver: (callback, options) => new IntersectionObserver(callback, options)
    });
  }

  static createNull() {
    return new ElementIndicator({
      doc: {
        addEventListener() {},
        removeEventListener() {},
        createElement(_tagName: string): HTMLElement {
          return new NullElement() as unknown as HTMLElement;
        },
        body: {
          appendChild(node: Node) {
            return node;
          }
        }
      },
      createObserver: () => new NullObserver()
    });
  }

  #deps: IndicatorDeps;

  /**
   * The indicator.
   */
  #indicator: HTMLElement | null = null;
  /**
   * The element we're indicating on.
   */
  #element: HTMLElement | null = null;
  #showIndicator = false;
  #observer: MinimalObserver | null = null;
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

  constructor(deps: IndicatorDeps) {
    this.#deps = deps;
    deps.doc.addEventListener('scroll', this.#scrollHandler, true);
    deps.doc.addEventListener('scrollend', this.#scrollEndHandler, true);
  }

  destroy() {
    this.#deps.doc.removeEventListener('scroll', this.#scrollHandler, true);
    this.#deps.doc.removeEventListener('scrollend', this.#scrollEndHandler, true);
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
    this.#deps.doc.body.appendChild(indic);
    this.#indicator = indic;
  }

  #makeIndicator(el: HTMLElement): HTMLElement {
    const tagn = el.tagName;
    const rect = el.getBoundingClientRect();

    const span = this.#deps.doc.createElement('span');
    span.classList.add(JSED_IGNORE_CLASS);
    span.classList.add('jsed-tag-indicator');
    span.style.position = 'fixed';
    span.style.left = `${rect.right}px`;
    span.style.pointerEvents = 'none';
    span.style.zIndex = '999999';
    span.innerText = tagn;

    // Temporarily add to measure dimensions
    span.style.visibility = 'hidden';
    this.#deps.doc.body.appendChild(span);
    const indicatorHeight = span.offsetHeight;
    const indicatorWidth = span.offsetWidth;
    span.remove();
    span.style.visibility = '';

    // Vertical: check if indicator would be cut off at top of viewport
    const spaceAbove = rect.top - 5;
    const positionBelow = spaceAbove < indicatorHeight;

    // Horizontal: check if right-aligned badge would clip off the left edge
    const leftAligned = rect.right - indicatorWidth < 0;

    if (leftAligned) {
      span.style.left = `${rect.left}px`;
    }

    if (positionBelow) {
      span.style.top = `${rect.bottom + 5}px`;
      span.style.transform = leftAligned ? '' : 'translateX(-100%)';
    } else {
      span.style.top = `${rect.top - 5}px`;
      span.style.transform = leftAligned ? 'translateY(-100%)' : 'translateY(-100%) translateX(-100%)';
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
