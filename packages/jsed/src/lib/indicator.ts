import { JSED_IGNORE_CLASS } from './constants.js';

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

  get element(): HTMLElement | null {
    return this.#el;
  }

  constructor(
    private viewport: { getHeight: () => number },
    private createElement = (tagName: string) => document.createElement(tagName)
  ) {}

  show(target: HTMLElement): void {
    this.remove();
    const tagn = target.tagName;
    const rect = target.getBoundingClientRect();
    const viewportHeight = this.viewport.getHeight();

    const span = this.createElement('span');
    span.classList.add(JSED_IGNORE_CLASS);
    span.classList.add('jsed-tag-indicator');
    span.style.position = 'fixed';
    span.style.left = `${rect.right}px`;
    span.style.pointerEvents = 'none';
    span.style.zIndex = '999999';
    span.innerText = tagn;

    // Temporarily add to measure dimensions
    span.style.visibility = 'hidden';
    document.body.appendChild(span);
    const indicatorHeight = span.offsetHeight;
    const indicatorWidth = span.offsetWidth;
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

    document.body.appendChild(span);
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
