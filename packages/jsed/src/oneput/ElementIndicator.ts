import { JSED_IGNORE_CLASS } from '../jsed/lib/constants.js';
import { getParent, isToken } from '../jsed/lib/token.js';

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
    addEventListener(type: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, handler: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
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

function createNullDeps(): IndicatorDeps {
  return {
    doc: {
      addEventListener() {},
      removeEventListener() {},
      createElement(_tagName: string): HTMLElement {
        throw new Error('ElementIndicator.createNull: createElement should not be called');
      },
      body: { appendChild(node: Node) { return node; } },
    },
    createObserver: () => new NullObserver(),
  };
}

// #endregion

/**
 * Provides a visual indicator for the focused element (non-tokens).
 */
export class ElementIndicator {
  static create() {
    return new ElementIndicator({
      doc: document,
      createObserver: (callback, options) => new IntersectionObserver(callback, options),
    });
  }

  static createNull() {
    return new ElementIndicator(createNullDeps(), { isNull: true });
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
  #isNull: boolean;

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

  constructor(deps: IndicatorDeps, options?: { isNull?: boolean }) {
    this.#deps = deps;
    this.#isNull = options?.isNull ?? false;
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
    if (this.#isNull) return;
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

    // Temporarily add to measure height
    span.style.visibility = 'hidden';
    this.#deps.doc.body.appendChild(span);
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
