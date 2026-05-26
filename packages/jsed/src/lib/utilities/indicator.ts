import { JSED_ELEMENT_INDICATOR, JSED_IGNORE_CLASS } from '../core/taxonomy.js';

/**
 * Wraps the indicator span element — creation, positioning, hiding, and removal.
 */
export class Indicator {
  static create() {
    return new Indicator({ getHeight: () => window.innerHeight });
  }

  static createNull({
    createElement,
    viewportHeight
  }: {
    createElement?: (tagName: string) => HTMLElement;
    viewportHeight?: number;
  }) {
    return new Indicator(
      { getHeight: () => viewportHeight ?? 768 },
      createElement ?? ((tagName) => document.createElement(tagName))
    );
  }

  #el: HTMLElement | null = null;
  #cachedSize: { w: number; h: number } | null = null;
  #cachedTag: string | null = null;

  get element(): HTMLElement | null {
    return this.#el;
  }

  constructor(
    private viewport: { getHeight: () => number },
    private createElement = (tagName: string) => document.createElement(tagName)
  ) {}

  /**
   * Set up the indicator for a target and position it.
   *
   * Creates the span on first call; reuses it on subsequent calls and only
   * re-measures when the target's tagName changes. Use this when the focus
   * changes. Safe to call repeatedly with the same target.
   */
  show(target: HTMLElement): void {
    if (!this.#el) {
      const span = this.createElement('span');
      span.classList.add(JSED_IGNORE_CLASS);
      span.classList.add(JSED_ELEMENT_INDICATOR);
      span.style.position = 'fixed';
      span.style.top = '0';
      span.style.left = '0';
      span.style.pointerEvents = 'none';
      span.style.zIndex = '99999';
      document.body.appendChild(span);
      this.#el = span;
    }

    this.#el.style.display = '';

    const tag = target.tagName;
    if (this.#cachedTag !== tag || this.#cachedSize === null) {
      this.#el.innerText = tag;
      this.#cachedTag = tag;
      // Forced layout to measure — only when tag changes, not per frame.
      this.#cachedSize = { w: this.#el.offsetWidth, h: this.#el.offsetHeight };
    }

    this.position(target);
  }

  /**
   * Reposition the indicator over its current target. Cheap — pure math plus
   * one transform write. Safe to call on every animation frame.
   *
   * No-op if `show(target)` has not been called yet.
   */
  position(target: HTMLElement): void {
    if (!this.#el || !this.#cachedSize) return;

    const rect = target.getBoundingClientRect();
    const viewportHeight = this.viewport.getHeight();
    const { w: indicatorWidth, h: indicatorHeight } = this.#cachedSize;

    const leftAligned = rect.right - indicatorWidth < 0;
    const x = leftAligned ? rect.left : rect.right;

    const topVisible = rect.top >= 0;
    const fitsInViewport = rect.bottom <= viewportHeight;
    const canFitAbove = rect.top - 5 >= indicatorHeight;

    let y: number;
    let extra = '';

    if (topVisible && fitsInViewport && canFitAbove) {
      // Case 1: Small element fully in viewport with space above — position above
      y = rect.top - 5;
      extra = leftAligned ? 'translateY(-100%)' : 'translateY(-100%) translateX(-100%)';
    } else if (topVisible && fitsInViewport) {
      // Case 1b: Small element, not enough space above — position below
      y = rect.bottom + 5;
      extra = leftAligned ? '' : 'translateX(-100%)';
    } else if (topVisible) {
      // Case 2: Large element, top visible — anchor inside top-right corner
      y = rect.top + 5;
      extra = leftAligned ? '' : 'translateX(-100%)';
    } else {
      // Case 3: Top scrolled past viewport — pin to viewport top
      y = 5;
      extra = leftAligned ? '' : 'translateX(-100%)';
    }

    this.#el.style.transform = `translate(${x}px, ${y}px) ${extra}`;
  }

  hide(): void {
    if (this.#el) this.#el.style.display = 'none';
  }

  remove(): void {
    if (this.#el) {
      this.#el.remove();
      this.#el = null;
    }
    this.#cachedSize = null;
    this.#cachedTag = null;
  }
}
