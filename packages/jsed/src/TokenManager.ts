import { isIsland, isFocusable, isToken } from './lib/taxonomy.js';
import { getLine, getFirstLineSibling, getNextLineSibling } from './lib/traversal.js';
import { tokenizeLine } from './lib/token.js';

export class TokenManager {
  static create() {
    return new TokenManager();
  }

  constructor() {}

  /** Lazy tokenization callback for TRANSPARENT_BLOCK's encountered during traversal. */
  private lazyTokenize = (el: HTMLElement) => {
    tokenizeLine(el);
  };

  /**
   * Quick-descend: tokenize and find the first TOKEN within a FOCUSABLE.
   * See SHALLOW_TOKENIZATION.
   *
   * Tokenizes the LINE containing the element and looks for the first TOKEN
   * among its LINE_SIBLING's. If a LINE_SIBLING is an OPAQUE_BLOCK (not a
   * TOKEN or ISLAND), recurses into it. Returns null if no TOKEN is found —
   * the FOCUSABLE has no editable text content.
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

    // Walk LINE_SIBLING's looking for a TOKEN. If we hit an OPAQUE_BLOCK,
    // quick-descend into it to find TOKEN's inside.
    const opts = { onEnterBlockTransparent: this.lazyTokenize };
    let sib = getFirstLineSibling(line, opts);
    while (sib) {
      if (isToken(sib)) {
        return sib;
      }
      // OPAQUE_BLOCK — recurse to find TOKEN's within
      if (!isIsland(sib)) {
        const nested = this.tokenize(sib);
        if (nested) return nested;
      }
      // ISLAND or empty OPAQUE_BLOCK — skip, continue to next LINE_SIBLING
      sib = getNextLineSibling(sib, line, opts);
    }

    return null;
  }
}
