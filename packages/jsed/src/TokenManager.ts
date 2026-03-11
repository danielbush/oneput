import { ignoreDescendents, isFocusable } from './lib/focus.js';
import { isToken, getNextLineSibling, getLine, tokenizeLine } from './lib/token.js';
import { findNextNode, findPreviousNode } from './lib/walk.js';

export class TokenManager {
  static create(docRoot: HTMLElement) {
    return new TokenManager(docRoot);
  }

  constructor(private docRoot: HTMLElement) {}

  /**
   * Tokenize the line and return first token.
   *
   * If the line is not really a line eg a div-tag but contains other LINE's eg
   * a p-tag, descend and tokenize the first one.
   */
  tokenize(el: HTMLElement): HTMLElement | null {
    if (isToken(el)) {
      return el;
    }
    if (!isFocusable(el)) {
      throw new Error('tokenize: expects an F_ELEM');
    }
    const line = getLine(el);
    tokenizeLine(line);
    const sib = getNextLineSibling(line);

    // Scan for next / previous LINE's
    for (const next of findNextNode(line, this.docRoot, {
      filter: isFocusable,
      ignoreDescendents
    })) {
      console.log('next', next);
      break;
    }
    for (const previous of findPreviousNode(line, this.docRoot, {
      filter: isFocusable,
      ignoreDescendents
    })) {
      // Recurse in the "previous" direction into the parents but don't visit
      // them. We only want anything that is in a different subtree previous to
      // us.
      if (previous.contains(line)) {
        continue;
      }
      console.log('previous', previous);
      break;
    }

    if (sib) {
      return sib;
    }

    // Example: el is a div containing a p-tag.  Walk down into the p-tag.
    // Also the p-tag will not be tokenized by the above call if this is virgin
    // territory because we tokenize by line.

    for (const next of findNextNode(el, el, {
      filter: isFocusable,
      ignoreDescendents
    })) {
      tokenizeLine(next as HTMLElement);
      const sib = getNextLineSibling(next as HTMLElement);
      if (sib) {
        return sib;
      }
    }

    return null;
  }
}
