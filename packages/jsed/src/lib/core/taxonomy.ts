/**
 * Element classification predicates for the FOCUSABLE taxonomy.
 *
 * Primitives (`isFocusable`, `isOpaque`, `isInlineFlow`, `isToken`, etc.) are
 * independent checks that each answer one question. Derived predicates
 *
 * See docs/vocabulary.md for the full taxonomy.
 */

/**
 * CSS class for SIB_HIGHLIGHT.
 */
export const JSED_FOCUS_SIBLING = 'jsed-focus-sibling';
/**
 * The focus CSS class for FOCUSABLE's (not TOKEN's).
 */
export const JSED_FOCUS_CLASS = 'jsed-focus';

/**
 * Elements with this class will not respond to FOCUS .
 */
export const JSED_IGNORE_CLASS = 'jsed-ignore';
/**
 * CSS class for SELECTION_WRAPPER — a styling-neutral inline span that
 * wraps a contiguous run of LINE_SIBLING's to paint the selection
 * background without disturbing inherited styling.
 */
export const JSED_SELECTION_CLASS = 'jsed-selection';
/**
 * CSS class for IMPLICIT_LINE — applied to both block-level wrappers
 * (`tagImplicitLines` in `implicitLine.ts`) and inline span wrappers around
 * interstitial text (`tagImplicitLines` in `interstitial.ts`).
 */
export const JSED_IMPLICIT_CLASS = 'jsed-implicit-line';
/**
 * CSS class for tokens (text content that has been tokenized).
 */
export const JSED_TOKEN_CLASS = 'jsed-token';
export const JSED_TOKEN_COLLAPSED = 'jsed-token-collapsed';
export const JSED_TOKEN_PADDED = 'jsed-token-padded';
/**
 * CSS class for ANCHOR .
 */
export const JSED_ANCHOR_CLASS = 'jsed-anchor-token';
export const JSED_ANCHOR_CHAR = '\u00A4';

/**
 * Flags the DOM node as deleted.  Can be used on tokens and FOCUSABLE's.
 */
export const JSED_DELETED_CLASS = 'jsed-deleted';
/**
 * Spaces are text nodes when not deleted; when deleted, we use delete marker
 * (an element) to mark their position.
 */
export const JSED_DELETED_SPACE_CLASS = 'jsed-deleted-space';

/**
 * Where the jsed app mounts and renders.  It should not be part of the document
 * that is being edited.
 */
export const JSED_APP_ROOT_ID = 'jsed-app-root';

export const JSED_ELEMENT_INDICATOR = 'jsed-tag-indicator';
/**
 * The anchor-name value the CSS element indicator sets on the focused element.
 */
export const JSED_ELEMENT_INDICATOR_ANCHOR = '--jsed-element-indicator';
export const JSED_FOCUS_ATTR = 'data-jsed-focus';

// ============================================================================
// Primitives
// ============================================================================

const FORM_FOCUSABLE = [
  'input',
  'select',
  'textarea',
  'button',
  'optgroup',
  'option',
  'fieldset',
  'label'
];

export function isTextNode(node: Node): boolean {
  return node.nodeType === Node.TEXT_NODE;
}

export function isTokenizableTextNode(node: Node | null): boolean {
  if (!node) return false;
  if (node.nodeType !== Node.TEXT_NODE) return false;
  if (!node.nodeValue) return false;
  return /\S/.test(node.nodeValue);
}

/**
 * Detect a subclass of IGNORABLE's that are natively focusable elements.
 *
 * This was probably more important when FOCUS relied on messing with native
 * focus eg tabindex.
 *
 * @deprecated
 */
export function isAlreadyFocusable(el: Element): boolean {
  if (FORM_FOCUSABLE.indexOf(el.tagName.toLowerCase()) !== -1) {
    return true;
  }
  if (el.hasAttribute('contenteditable') && el.getAttribute('contenteditable') === 'true') {
    return true;
  }
  if (el.getAttribute('tabindex')) {
    return true;
  }
  return false;
}

/**
 * Detect IGNORABLE's.
 *
 * An example might be an element indicator that floats next to the element and
 * shows its tag name.  The indicator is a visual aid and not a part of the
 * document.
 */
export function isIgnorable(el: Node) {
  for (let p: Node | null = el; p; p = p.parentNode) {
    if (isIgnorableNode(p)) {
      return true;
    }
  }
  return false;
}

export function isIgnorableNode(el: Node): boolean {
  if (el instanceof window.HTMLScriptElement) {
    return true;
  }
  if (el instanceof window.HTMLTemplateElement) {
    return true;
  }
  if (el.nodeType === Node.TEXT_NODE) {
    return el.textContent === '';
  }
  if (el instanceof Element && el.classList.contains(JSED_IGNORE_CLASS)) {
    return true;
  }
  return false;
}

/**
 * Detect if the element is a TOKEN .
 */
export function isToken(el: Node | null | undefined): boolean {
  const isHTMLElement = el instanceof window.HTMLElement;
  if (isHTMLElement) {
    if (isIgnorableNode(el)) {
      return false;
    }
    if (isAnchor(el)) {
      return true;
    }
    return el.classList.contains(JSED_TOKEN_CLASS);
  }
  return false;
}

export function isDeletedAnchor(el: Node | null | undefined): boolean {
  const isHTMLElement = el instanceof window.HTMLElement;
  if (isHTMLElement) {
    return el.classList.contains(JSED_ANCHOR_CLASS) && el.classList.contains(JSED_DELETED_CLASS);
  }
  return false;
}

export function isDeletedToken(el: Node | null | undefined): boolean {
  const isHTMLElement = el instanceof window.HTMLElement;
  if (isHTMLElement) {
    return el.classList.contains(JSED_TOKEN_CLASS) && el.classList.contains(JSED_DELETED_CLASS);
  }
  return false;
}

export function isDeletedSpace(el: Node | null | undefined): boolean {
  const isHTMLElement = el instanceof window.HTMLElement;
  if (isHTMLElement) {
    return el.classList.contains(JSED_DELETED_SPACE_CLASS);
  }
  return false;
}

export function isAnchor(el: Node | null): boolean {
  const isHTMLElement = el instanceof window.HTMLElement;
  if (isHTMLElement) {
    return el.classList.contains(JSED_ANCHOR_CLASS);
  }
  return false;
}

/**
 * Test if the element can participate in FOCUS traversal.
 *
 * A FOCUS_CANDIDATE is either a FOCUSABLE or a potential FOCUSABLE hidden by
 * FOCUS_TRANSPARENT. FOCUS can DESCEND through candidates but only VISIT
 * FOCUSABLE's.
 */
export function isFocusCandidate(el: EventTarget | Element | null | undefined): el is HTMLElement {
  const isHTMLElement = el instanceof window.HTMLElement;
  if (isHTMLElement) {
    if (el?.id === JSED_APP_ROOT_ID) {
      return false;
    }
    // Tokens (text) get a cursor and are not treated as focusable.
    if (isToken(el)) {
      return false;
    }
    if (isIgnorable(el)) {
      return false;
    }
  }
  return isHTMLElement;
}

/**
 * Test if the element is a FOCUSABLE.
 */
export function isFocusable(el: EventTarget | Element | null | undefined): el is HTMLElement {
  return isFocusCandidate(el) && !isFocusTransparent(el);
}

type FocusAttrValue = 'on' | 'off';

function getNearestFocusAttrValue(el: Node | null | undefined): FocusAttrValue | null {
  for (let p: Node | null | undefined = el; p; p = p.parentNode) {
    if (p instanceof window.HTMLElement) {
      const value = p.dataset.jsedFocus;
      if (value === 'on' || value === 'off') {
        return value;
      }
    }
  }
  return null;
}

/**
 * Detect FOCUS_TRANSPARENT's.
 *
 * FOCUS_TRANSPARENT means FOCUS should not VISIT the element, but traversal can
 * still DESCEND into it. The nearest `data-jsed-focus="on|off"` in the ancestor
 * chain wins, so descendants can opt back in under an opted-out ancestor.
 */
export function isFocusTransparent(el: Node | null | undefined): boolean {
  return el instanceof window.HTMLElement && getNearestFocusAttrValue(el) === 'off';
}

/**
 * Delete marker for deleting FOCUSABLE's.
 */
export function isDeletedElement(el: EventTarget | Element | null | undefined): boolean {
  const isHTMLElement = el instanceof window.HTMLElement;
  if (isHTMLElement) {
    if (el.tagName.toLowerCase() !== 'template') {
      return false;
    }
    return el.classList.contains(JSED_DELETED_CLASS);
  }
  return false;
}

/**
 * Detect OPAQUE's.
 *
 * This can be used to FOCUS on things that may require special treatment such
 * as a katex element that has been generated by katex.
 */
export function isOpaque(el: Node | null | undefined): boolean {
  if (el instanceof Element) {
    if (el.classList.contains('katex')) {
      return true;
    }
    if (el.id === JSED_APP_ROOT_ID) {
      return true;
    }
  }
  return false;
}

/**
 * Pure display predicate: does this element have inline-flow display?
 *
 * Returns true when the element's computed display is `inline` or `inline flow`
 * AND the element is not floated (floated elements are pulled out of normal flow).
 *
 * This is a primitive — no FOCUSABLE, OPAQUE, or class checks. Use it when you
 * need just the CSS display-model answer. Callers combine it with other primitives
 * to derive taxonomy labels (e.g. INLINE_FLOW = `isFocusable && isInlineFlow && !isOpaque
 * && !isImplicitLine`).
 */
export function isInlineFlow(el: Node | null): boolean {
  if (!isFocusable(el)) return false;
  const styles = window.getComputedStyle(el);
  if (!['none', ''].includes(styles.float)) return false;
  if (styles.display === 'inline') return true;
  if (styles.display === 'inline flow') return true;
  return false;
}
export function isInline(el: Node | null): boolean {
  if (!isFocusable(el)) return false;
  const styles = window.getComputedStyle(el);
  if (!['none', ''].includes(styles.float)) return false;
  if (styles.display.startsWith('inline')) return true;
  return false;
}

/**
 * Detect IMPLICIT_LINE .
 */
export function isImplicitLine(node: Node) {
  return node instanceof Element && node.classList.contains(JSED_IMPLICIT_CLASS);
}

/**
 * Detect SELECTION_WRAPPER — a transient decoration inserted by
 * `CursorSelection` to paint the selection background around a
 * contiguous run of LINE_SIBLING's. Structurally invisible to the
 * CURSOR: descend-but-don't-visit, like CURSOR_TRANSPARENT, but
 * semantically distinct so other code can recognise and ignore it
 * (serialization, tokenization, etc.).
 */
export function isSelectionWrapper(node: Node | null): boolean {
  return node instanceof Element && node.classList.contains(JSED_SELECTION_CLASS);
}

// ============================================================================
// Derived
// ============================================================================

/**
 * Detect LINE.
 */
export function isLine(el: Node | null): boolean {
  if (!el) return false;
  if (!isFocusable(el)) return false;
  if (isImplicitLine(el)) return true;
  if (isToken(el)) return false;
  if (isInlineFlow(el)) return false;
  if (isOpaque(el)) return false;
  if (isSelectionWrapper(el)) return false;
  return true;
}

/** Predicate for LINE_SIBLING traversal. */
export function isLineSibling(el: Node | null): boolean {
  if (!el) {
    return false;
  }
  if (isToken(el) || isOpaque(el)) {
    return true;
  }
  return isFocusable(el) && !isCursorTransparent(el);
}

/** Descend predicate for LINE_SIBLING traversal. */
export function isCursorTransparent(n: Node): boolean {
  if (!isFocusable(n)) return false;
  if (isOpaque(n)) return false;
  return true;
}

export function isWhitespaceTextNode(node: Node | null | undefined): node is Text {
  return node instanceof window.Text && /^\s+$/.test(node.nodeValue ?? '');
}

export function isSpaceNode(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
    return /^\s*$/.test(node.nodeValue);
  }
  return false;
}
