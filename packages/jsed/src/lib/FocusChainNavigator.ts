import { getLine } from './sibwalk.js';
import { isFocusable, isIsland } from './taxonomy.js';
import { findNextNode } from './walk.js';
import type { Nav } from '../Nav.js';

/**
 * Tracks CURRENT_MARK and applies chain-aware FOCUS navigation in view mode.
 */
export class FocusChainNavigator {
  static create(nav: Nav) {
    return new FocusChainNavigator(nav);
  }

  static createNull(nav: Nav) {
    return new FocusChainNavigator(nav);
  }

  private currentMark?: HTMLElement;

  constructor(private nav: Nav) {}

  handleFocusChange(focus: HTMLElement | null) {
    if (!focus) return;
    this.updateCurrentMark(focus);
  }

  moveUp() {
    this.nav.UP();
  }

  moveDown() {
    const focus = this.nav.getFocus();
    if (!focus) return;

    const nextDown = this.getNextFocusDownCurrentChain(focus);
    if (nextDown) {
      this.nav.REQUEST_FOCUS(nextDown);
      return;
    }

    for (const next of findNextNode(focus, getLine(focus), {
      visit: isFocusable,
      descend: (node) => isFocusable(node) && !isIsland(node)
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

    let child = this.currentMark;
    for (let parent = child.parentElement; parent; parent = parent.parentElement) {
      if (parent === focus) {
        return child;
      }
      child = parent;
    }

    return null;
  }
}
