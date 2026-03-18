import { isIsland, isFocusable } from './lib/focus.js';
import { isToken, getLine, getFirstLineSibling, tokenizeLine } from './lib/token.js';
import { findNextNode } from './lib/walk2.js';

export class TokenManager {
  static create(docRoot: HTMLElement) {
    return new TokenManager(docRoot);
  }

  constructor(private docRoot: HTMLElement) {}

  /**
   * Tokenize the line and return first TOKEN.  See SHALLOW_TOKENIZATION .
   *
   * If the LINE has no direct text (e.g. a div containing NESTED_LINE's),
   * descend into child FOCUSABLE's and tokenize the first one that yields a TOKEN.
   */
  tokenize(el: HTMLElement): HTMLElement | null {
    if (isToken(el)) {
      return el;
    }
    if (!isFocusable(el)) {
      throw new Error('tokenize: expects a FOCUSABLE');
    }
    const line = getLine(el);
    tokenizeLine(line);

    const first = getFirstLineSibling(line);
    if (first) {
      return first;
    }

    // LINE has no direct text — descend into child FOCUSABLE's (NESTED_LINE's)
    // and tokenize the first one that yields a LINE_SIBLING.
    for (const next of findNextNode(el, el, {
      visit: isFocusable,
      descend: (node) => !isIsland(node)
    })) {
      const nested = next as HTMLElement;
      tokenizeLine(nested);
      const nestedFirst = getFirstLineSibling(nested);
      if (nestedFirst) {
        return nestedFirst;
      }
    }

    return null;
  }
}
