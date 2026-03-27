import { JSED_IGNORE_CLASS } from './constants.js';

// #region Types

export interface IndicatorConfig {
  indicatorHeight?: number;
  indicatorWidth?: number;
}

interface IndicatorMount {
  appendChild(node: Node): Node;
}

interface IndicatorDeps {
  doc: Document;
  mount: IndicatorMount;
}

// #endregion

/**
 * Wraps the indicator span element — creation, positioning, hiding, and removal.
 *
 * INFRASTRUCTURE_WRAPPER: the OUTSIDE_WORLD boundary is real DOM layout
 * (offsetHeight/offsetWidth, getBoundingClientRect). createNull() uses
 * happy-dom for everything else and only patches layout measurements via
 * CONFIGURABLE_RESPONSE.
 */
export class Indicator {
  static create(doc: Document, mount: IndicatorMount) {
    return new Indicator({ doc, mount });
  }

  static createNull(config?: IndicatorConfig & { mount?: IndicatorMount }) {
    return new Indicator(
      { doc: document, mount: config?.mount ?? { appendChild: (n) => n } },
      config
    );
  }

  #deps: IndicatorDeps;
  #el: HTMLElement | null = null;
  #config?: IndicatorConfig;

  private constructor(deps: IndicatorDeps, config?: IndicatorConfig) {
    this.#deps = deps;
    this.#config = config;
  }

  show(target: HTMLElement, viewportHeight: number): void {
    this.remove();
    const tagn = target.tagName;
    const rect = target.getBoundingClientRect();

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
    this.#deps.mount.appendChild(span);
    const indicatorHeight = this.#config?.indicatorHeight ?? span.offsetHeight;
    const indicatorWidth = this.#config?.indicatorWidth ?? span.offsetWidth;
    span.remove();
    span.style.visibility = '';

    // Horizontal: check if right-aligned badge would clip off the left edge
    const leftAligned = rect.right - indicatorWidth < 0;
    if (leftAligned) {
      span.style.left = `${rect.left}px`;
    }

    const topVisible = rect.top >= 0;
    const fitsInViewport = rect.bottom <= viewportHeight;
    const spaceAbove = rect.top - 5;
    const canFitAbove = spaceAbove >= indicatorHeight;

    if (topVisible && fitsInViewport && canFitAbove) {
      // Case 1: Small element fully in viewport with space above — position above
      span.style.top = `${rect.top - 5}px`;
      span.style.transform = leftAligned
        ? 'translateY(-100%)'
        : 'translateY(-100%) translateX(-100%)';
    } else if (topVisible && fitsInViewport) {
      // Case 1b: Small element, not enough space above — position below
      span.style.top = `${rect.bottom + 5}px`;
      span.style.transform = leftAligned ? '' : 'translateX(-100%)';
    } else if (topVisible) {
      // Case 2: Large element, top visible — anchor inside top-right corner
      span.style.top = `${rect.top + 5}px`;
      span.style.transform = leftAligned ? '' : 'translateX(-100%)';
    } else {
      // Case 3: Top scrolled past viewport — pin to viewport top
      span.style.top = '5px';
      span.style.transform = leftAligned ? '' : 'translateX(-100%)';
    }

    this.#deps.mount.appendChild(span);
    this.#el = span;
  }

  hide(): void {
    if (this.#el) this.#el.style.display = 'none';
  }

  remove(): void {
    if (this.#el) {
      this.#el.remove();
      this.#el = null;
    }
  }
}
