import { isFocusCandidate, isFocusable, isOpaque } from '../lib/core/taxonomy.js';
import { findNextNode } from '../lib/core/walk.js';
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

    const nextDown = this.getNextFocusDownCurrentChain(focus);
    if (nextDown) {
      this.nav.REQUEST_FOCUS(nextDown);
      return;
    }

    for (const next of findNextNode(focus, focus, {
      visit: isFocusable,
      descend: (node) => isFocusCandidate(node) && !isOpaque(node)
    })) {
      this.nav.REQUEST_FOCUS(next);
      return;
    }
  }

  private updateCurrentMark(focus: HTMLElement) {
    if (!this.currentMark) {
      this.currentMark = focus;
      return;
    }

    for (
      let current: HTMLElement | null = this.currentMark;
      current;
      current = current.parentElement
    ) {
      if (current === focus) {
        return;
      }
    }

    this.currentMark = focus;
  }

  private getNextFocusDownCurrentChain(focus: HTMLElement): HTMLElement | null {
    if (!this.currentMark) {
      return null;
    }

    // The remembered chain may pass through FOCUS_TRANSPARENT ancestors; keep
    // the nearest FOCUSABLE below them so DOWN_CHAIN can land past the tunnel.
    let focusableBelow = isFocusable(this.currentMark) ? this.currentMark : null;
    for (let parent = this.currentMark.parentElement; parent; parent = parent.parentElement) {
      if (parent === focus) {
        return focusableBelow;
      }
      if (isFocusable(parent)) {
        focusableBelow = parent;
      }
    }

    return null;
  }
}
