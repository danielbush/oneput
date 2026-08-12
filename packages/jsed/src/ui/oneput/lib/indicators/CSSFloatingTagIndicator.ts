/**
 * CSS Anchor Positioning {@link FloatingTagIndicator}.
 *
 * The browser keeps the badge glued to the target through scrolls, transforms
 * (pan/zoom), and animations — no JS in the loop, so unlike
 * {@link LegacyFloatingTagIndicator} there is no observer or scroll handling
 * here. Position-only: the span stays at its intrinsic CSS pixel size regardless
 * of any scaled ancestor on the target.
 *
 * KNOWN ISSUE: the badge does not currently track scroll or resize. Anchor
 * positioning should handle both with no JS, so this is a bug rather than a
 * missing feature.
 */

import {
  JSED_ELEMENT_INDICATOR,
  JSED_ELEMENT_INDICATOR_ANCHOR,
  JSED_IGNORE_CLASS
} from '../../../../lib/core/taxonomy.js';
import type { FloatingTagIndicator } from './FloatingTagIndicator.js';

const ANCHOR_NAME = JSED_ELEMENT_INDICATOR_ANCHOR;

interface Deps {
  createElement: (tag: string) => HTMLElement;
  mount: (el: HTMLElement) => void;
}

export class CSSFloatingTagIndicator implements FloatingTagIndicator {
  static create() {
    return new CSSFloatingTagIndicator({
      createElement: (tag) => document.createElement(tag),
      mount: (el) => document.body.appendChild(el)
    });
  }

  static createNull() {
    return new CSSFloatingTagIndicator({
      createElement: (tag) => document.createElement(tag),
      mount: () => {}
    });
  }

  #element: HTMLElement | null = null;
  #span: HTMLElement | null = null;
  #label = '';
  #showIndicator = false;
  #cachedLabel: string | null = null;

  constructor(private deps: Deps) {}

  destroy(): void {
    this.#clearAnchor(this.#element);
    this.#element = null;
    this.#span?.remove();
    this.#span = null;
    this.#cachedLabel = null;
    this.#showIndicator = false;
  }

  setTarget(el: HTMLElement | null): void {
    if (el === this.#element) return;
    this.#clearAnchor(this.#element);
    this.#element = el;
    if (el) this.#applyAnchor(el);
    if (this.#showIndicator) this.#refreshLabel();
  }

  setLabel(label: string): void {
    if (label === this.#label) return;
    this.#label = label;
    if (this.#showIndicator) this.#refreshLabel();
  }

  showIndicator(bool: boolean): void {
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
    span.classList.add(JSED_ELEMENT_INDICATOR);
    span.classList.add('jsed-tag-indicator-css');
    span.style.pointerEvents = 'none';
    this.deps.mount(span);
    this.#span = span;
  }

  #refreshLabel() {
    if (!this.#span || !this.#element) return;
    if (this.#cachedLabel !== this.#label) {
      this.#span.innerText = this.#label;
      this.#cachedLabel = this.#label;
    }
  }

  #applyAnchor(el: HTMLElement) {
    el.style.setProperty('anchor-name', ANCHOR_NAME);
  }

  #clearAnchor(el: HTMLElement | null) {
    if (el) el.style.removeProperty('anchor-name');
  }
}
