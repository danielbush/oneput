import { getParent } from './token.js';
import { isToken } from './taxonomy.js';
import { JSED_IGNORE_CLASS } from './constants.js';

const ANCHOR_NAME = '--jsed-element-indicator';

interface Deps {
  createElement: (tag: string) => HTMLElement;
  mount: (el: HTMLElement) => void;
}

/**
 * Indicator that uses CSS Anchor Positioning to track the focused element.
 *
 * The browser keeps the indicator span glued to the target through scrolls,
 * transforms (pan/zoom), and animations — no JS in the loop. Position-only:
 * the span stays at its intrinsic CSS pixel size regardless of any scaled
 * ancestor on the target.
 */
export class CSSElementIndicator {
  static create() {
    return new CSSElementIndicator({
      createElement: (tag) => document.createElement(tag),
      mount: (el) => document.body.appendChild(el)
    });
  }

  static createNull() {
    return new CSSElementIndicator({
      createElement: (tag) => document.createElement(tag),
      mount: () => {}
    });
  }

  #element: HTMLElement | null = null;
  #span: HTMLElement | null = null;
  #showIndicator = false;
  #cachedTag: string | null = null;

  constructor(private deps: Deps) {}

  destroy() {
    this.#clearAnchor(this.#element);
    this.#element = null;
    this.#span?.remove();
    this.#span = null;
    this.#cachedTag = null;
    this.#showIndicator = false;
  }

  setTarget(el: HTMLElement | null): void {
    const next = el ? (isToken(el) ? getParent(el) : el) : null;
    if (next === this.#element) return;
    this.#clearAnchor(this.#element);
    this.#element = next;
    if (next) this.#applyAnchor(next);
    if (this.#showIndicator) this.#refreshLabel();
  }

  showIndicator(bool: boolean) {
    this.#showIndicator = bool;
    if (bool) {
      this.#ensureSpan();
      this.#refreshLabel();
      if (this.#span) this.#span.style.display = '';
    } else if (this.#span) {
      this.#span.style.display = 'none';
    }
  }

  #ensureSpan() {
    if (this.#span) return;
    const span = this.deps.createElement('span');
    span.classList.add(JSED_IGNORE_CLASS);
    span.classList.add('jsed-tag-indicator');
    span.classList.add('jsed-tag-indicator-css');
    span.style.pointerEvents = 'none';
    this.deps.mount(span);
    this.#span = span;
  }

  #refreshLabel() {
    if (!this.#span || !this.#element) return;
    const tag = this.#element.tagName;
    if (this.#cachedTag !== tag) {
      this.#span.innerText = tag;
      this.#cachedTag = tag;
    }
  }

  #applyAnchor(el: HTMLElement) {
    el.style.setProperty('anchor-name', ANCHOR_NAME);
  }

  #clearAnchor(el: HTMLElement | null) {
    if (el) el.style.removeProperty('anchor-name');
  }
}
