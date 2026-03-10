import { ignoreDescendents, isFocusable } from './lib/focus.js';
import { isToken, tokenize, getNextLineSibling } from './lib/token.js';
import { findNextNode } from './lib/walk.js';

export class TokenManager {
  static create() {
    return new TokenManager();
  }

  constructor() {
    //
  }

  /**
   * Walks el (an F_ELEM usually) and looks for the first text token we can
   * focus on. This will tokenize as it recurses down depth-first.
   */
  tokenizeFirst(el: HTMLElement): HTMLElement | null {
    if (isToken(el)) {
      return el;
    }
    if (!isFocusable(el)) {
      throw new Error('tokenizeFirst: expects an F_ELEM');
    }
    const line = el;
    // const line = getLine(el);
    tokenize(line);
    const sib = getNextLineSibling(line);
    if (sib) {
      return sib;
    }
    for (const next of findNextNode(line, line, {
      filter: isFocusable,
      ignoreDescendents
    })) {
      tokenize(next as HTMLElement);
      const sib = getNextLineSibling(next as HTMLElement);
      if (sib) {
        return sib;
      }
    }
    return null;
  }
}
