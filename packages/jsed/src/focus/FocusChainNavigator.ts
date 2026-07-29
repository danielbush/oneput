import { findNextFocusable, findNextFocusableOnAncestorPath } from '../lib/ops/focus.js';
import type { Nav } from './Nav.js';

/**
 * Tracks CURRENT_MARK and applies chain-aware FOCUS navigation in view mode.
 */
export class FocusChainNavigator {
  static create(nav: Nav) {
    return new FocusChainNavigator(nav);
  }

  private currentMark?: HTMLElement;

  constructor(private nav: Nav) {}

  handleFocusChange(focus: HTMLElement | null) {
    if (!focus) return;
    this.updateCurrentMark(focus);
  }

  /**
   * Move FOCUS to the nearest FOCUSABLE ancestor.
   *
   * FOCUS_TRANSPARENT ancestors stay in the chain but are skipped as landing
   * targets.
   */
  moveUp() {
    this.nav.UP();
  }

  /**
   * Move FOCUS back down the remembered chain, or into the current subtree.
   *
   * FOCUS_TRANSPARENT nodes are traversed as FOCUS_CANDIDATE's, but DOWN_CHAIN
   * lands on the next FOCUSABLE below them.
   */
  moveDown() {
    const focus = this.nav.getFocus();
    if (!focus) {
      return;
    }

    const next = this.currentMark
      ? (findNextFocusableOnAncestorPath(focus, this.currentMark) ??
        findNextFocusable(focus, focus))
      : findNextFocusable(focus, focus);
    if (next) {
      this.nav.REQUEST_FOCUS(next);
    }
  }

  private updateCurrentMark(focus: HTMLElement) {
    if (!this.currentMark || !focus.contains(this.currentMark)) {
      this.currentMark = focus;
    }
  }
}
