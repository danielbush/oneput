import { getParent } from '../../../lib/ops/token.js';
import { isToken } from '../../../lib/core/taxonomy.js';
import type { FloatingTagIndicator } from './FloatingTagIndicator.js';
import { CSSFloatingTagIndicator } from './CSSFloatingTagIndicator.js';
import { LegacyFloatingTagIndicator } from './LegacyFloatingTagIndicator.js';

/**
 * Which renderer draws the badge. The two are mutually exclusive; `none` hides
 * the badge entirely.
 */
export type FocusIndicatorMode = 'none' | 'legacy' | 'css';

/**
 * Shows the user where FOCUS is, as a badge floating over the focused element.
 *
 * This is the only layer that knows what the badge *means*. It resolves a TOKEN
 * to its parent FOCUSABLE, decides the label (currently the tag name), and picks
 * which {@link FloatingTagIndicator} renders it. The renderers know nothing about
 * FOCUS or the jsed taxonomy — they just glue a label to an element.
 *
 * MOTHBALLED. The FOCUS nav crumbs now show the tag name, and `.jsed-focus`
 * already outlines the focused element, so the badge has no job left. The mode
 * defaults to `none` and the menu toggles are gone. Everything still works —
 * call {@link setMode} to bring it back, or give it a label worth showing.
 */
export class FocusIndicator {
  static create() {
    return new FocusIndicator(
      LegacyFloatingTagIndicator.create(),
      CSSFloatingTagIndicator.create()
    );
  }

  static createNull(opts?: { viewportHeight?: number }) {
    return new FocusIndicator(
      LegacyFloatingTagIndicator.createNull({ viewportHeight: opts?.viewportHeight }),
      CSSFloatingTagIndicator.createNull()
    );
  }

  /** The FOCUSABLE we're indicating on. */
  #element: HTMLElement | null = null;
  #showIndicator = false;
  /** `none` while mothballed — see the class doc. */
  #mode: FocusIndicatorMode = 'none';

  constructor(
    private legacy: FloatingTagIndicator,
    private css: FloatingTagIndicator
  ) {}

  get mode(): FocusIndicatorMode {
    return this.#mode;
  }

  /**
   * Switch renderer. The outgoing renderer is hidden and detached so two badges
   * can never be on screen at once.
   */
  setMode(mode: FocusIndicatorMode): void {
    if (mode === this.#mode) return;
    this.#active?.showIndicator(false);
    this.#active?.setTarget(null);
    this.#mode = mode;
    this.#sync();
  }

  /**
   * Point the badge at a FOCUSABLE. Pass a TOKEN and it indicates the TOKEN's
   * parent instead; `null` detaches the badge.
   */
  setTarget(el: HTMLElement | null): void {
    this.#element = el ? (isToken(el) ? getParent(el) : el) : null;
    this.#sync();
  }

  showIndicator(bool: boolean): void {
    this.#showIndicator = bool;
    this.#sync();
  }

  destroy(): void {
    this.legacy.destroy();
    this.css.destroy();
    this.#element = null;
    this.#showIndicator = false;
  }

  get #active(): FloatingTagIndicator | null {
    switch (this.#mode) {
      case 'legacy':
        return this.legacy;
      case 'css':
        return this.css;
      case 'none':
        return null;
    }
  }

  /** Push the current target, label, and visibility at the active renderer. */
  #sync(): void {
    const active = this.#active;
    if (!active) return;
    active.setTarget(this.#element);
    if (this.#element) {
      active.setLabel(this.#element.tagName);
    }
    active.showIndicator(this.#showIndicator && !!this.#element);
  }
}
