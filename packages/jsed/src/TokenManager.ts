import { isFocusable } from './lib/focus.js';
import { isToken, getNextLineSibling, tokenize, getLine } from './lib/token.js';
// import { findNextNode } from './lib/walk.js';

export class TokenManager {
  static create() {
    return new TokenManager();
  }

  constructor() {
    //
  }

  /**
   * Tokenize the line and return first token.
   */
  tokenize(el: HTMLElement): HTMLElement | null {
    if (isToken(el)) {
      return el;
    }
    if (!isFocusable(el)) {
      throw new Error('tokenize: expects an F_ELEM');
    }
    const line = getLine(el);
    tokenize(line);
    const sib = getNextLineSibling(line);
    if (sib) {
      return sib;
    }

    // TODO: review this with inline-block case
    // for (const next of findNextNode(el, el, {
    //   filter: isFocusable,
    //   ignoreDescendents
    // })) {
    //   tokenize(next as HTMLElement);
    //   const sib = getNextLineSibling(next as HTMLElement);
    //   if (sib) {
    //     return sib;
    //   }
    // }

    return null;
  }
}
