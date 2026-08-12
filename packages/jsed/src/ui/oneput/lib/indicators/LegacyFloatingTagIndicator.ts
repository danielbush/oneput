/**
 * JS-driven {@link FloatingTagIndicator}.
 *
 * The badge is `position: fixed` and positioned by hand from the target's
 * bounding rect. Because nothing in the browser keeps it glued, this class owns
 * the machinery that compensates: an IntersectionObserver to drop the badge when
 * the target leaves the viewport, and scroll handlers to hide it mid-scroll and
 * restore it once scrolling ends.
 *
 * {@link CSSFloatingTagIndicator} needs none of that, which is why it lives here
 * rather than in {@link FocusIndicator}.
 */

import { JSED_ELEMENT_INDICATOR, JSED_IGNORE_CLASS } from '../../../../lib/core/taxonomy.js';
import type { FloatingTagIndicator } from './FloatingTagIndicator.js';

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

export class LegacyFloatingTagIndicator implements FloatingTagIndicator {
  static create() {
    return new LegacyFloatingTagIndicator(
      { getHeight: () => window.innerHeight },
      (tagName) => document.createElement(tagName),
      (callback, options) => new IntersectionObserver(callback, options)
    );
  }

  static createNull(opts?: { viewportHeight?: number }) {
    return new LegacyFloatingTagIndicator(
      { getHeight: () => opts?.viewportHeight ?? 768 },
      (tagName) => document.createElement(tagName),
      () => new NullObserver()
    );
  }

  /** The element we're indicating on. */
  #element: HTMLElement | null = null;
  #label = '';
  #showIndicator = false;
  #observer: MinimalObserver | null = null;
  #isVisible = true;

  /** The badge span itself. Created lazily on first show. */
  #span: HTMLElement | null = null;
  #cachedSize: { w: number; h: number } | null = null;
  #cachedLabel: string | null = null;

  #scrollHandler = () => {
    this.#hide();
  };

  #scrollEndHandler = () => {
    if (this.#showIndicator && this.#element && this.#isVisible) {
      // TODO: scrollIntoView is not handled by scroll listeners so we add a
      // timeout.  Without this, the indicator may appear in the wrong place.
      setTimeout(() => {
        this.#render();
      }, 100);
    }
  };

  constructor(
    private viewport: { getHeight: () => number },
    private createElement: (tagName: string) => HTMLElement,
    private createObserver: ObserverFactory
  ) {
    document.addEventListener('scroll', this.#scrollHandler, { capture: true, passive: true });
    document.addEventListener('scrollend', this.#scrollEndHandler, {
      capture: true,
      passive: true
    });
  }

  /** The badge span. Exposed for tests. */
  get element(): HTMLElement | null {
    return this.#span;
  }

  setTarget(el: HTMLElement | null): void {
    if (!el) {
      this.#element = null;
      this.#observer?.disconnect();
      this.#observer = null;
      this.#isVisible = true;
      return;
    }
    this.#element = el;
    this.#setupObserver(el);
    if (this.#showIndicator) {
      this.#render();
    }
  }

  setLabel(label: string): void {
    if (label === this.#label) return;
    this.#label = label;
    if (this.#showIndicator) {
      this.#render();
    }
  }

  showIndicator(bool: boolean): void {
    this.#showIndicator = bool;
    if (bool) {
      this.#render();
    } else {
      this.#remove();
    }
  }

  destroy(): void {
    document.removeEventListener('scroll', this.#scrollHandler, true);
    document.removeEventListener('scrollend', this.#scrollEndHandler, true);
    this.#observer?.disconnect();
    this.#observer = null;
    this.#remove();
  }

  #setupObserver(el: HTMLElement): void {
    this.#observer?.disconnect();
    this.#observer = this.createObserver(
      ([entry]) => {
        this.#isVisible = entry.isIntersecting;
        if (!this.#isVisible) {
          this.#remove();
        } else if (this.#showIndicator) {
          this.#render();
        }
      },
      { threshold: 0 }
    );
    this.#observer.observe(el);
  }

  /**
   * Set up the badge for the current target and position it.
   *
   * Creates the span on first call; reuses it afterwards and only re-measures
   * when the label changes.
   */
  #render(): void {
    const target = this.#element;
    if (!target) return;

    if (!this.#span) {
      const span = this.createElement('span');
      span.classList.add(JSED_IGNORE_CLASS);
      span.classList.add(JSED_ELEMENT_INDICATOR);
      span.style.position = 'fixed';
      span.style.top = '0';
      span.style.left = '0';
      span.style.pointerEvents = 'none';
      span.style.zIndex = '99999';
      document.body.appendChild(span);
      this.#span = span;
    }

    this.#span.style.display = '';

    if (this.#cachedLabel !== this.#label || this.#cachedSize === null) {
      this.#span.innerText = this.#label;
      this.#cachedLabel = this.#label;
      // Forced layout to measure — only when the label changes, not per frame.
      this.#cachedSize = { w: this.#span.offsetWidth, h: this.#span.offsetHeight };
    }

    this.#position(target);
  }

  /**
   * Reposition the badge over its target. Cheap — pure math plus one transform
   * write. Safe to call on every animation frame.
   */
  #position(target: HTMLElement): void {
    if (!this.#span || !this.#cachedSize) return;

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

    this.#span.style.transform = `translate(${x}px, ${y}px) ${extra}`;
  }

  #hide(): void {
    if (this.#span) this.#span.style.display = 'none';
  }

  #remove(): void {
    if (this.#span) {
      this.#span.remove();
      this.#span = null;
    }
    this.#cachedSize = null;
    this.#cachedLabel = null;
  }
}
