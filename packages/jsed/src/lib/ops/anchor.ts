import { getNextSibling, getPreviousSibling } from '../core/sibling';
import {
  isAnchor,
  isFocusable,
  isIgnorable,
  isImplicitLine,
  isInline,
  isIsland,
  isLine,
  isLineSibling,
  isToken,
  isTokenizableTextNode,
  isWhitespaceTextNode,
  JSED_ANCHOR_CLASS,
  JSED_TOKEN_CLASS
} from '../core/taxonomy';
import { findNextNode } from '../core/walk2';

/**
 * Create an ANCHOR
 *
 * This is a token that contains text that represents a text anchor.  We add an
 * additional class to help detect it.
 */
export function createAnchor(): HTMLElement {
  const el = document.createElement('span');
  el.classList.add(JSED_ANCHOR_CLASS);
  return el;
}

/**
 * Get the immediate editable boundary after a focused tag where an ANCHOR can
 * be inserted.
 *
 * IGNORABLE siblings are skipped. A whitespace text node remains a valid
 * insertion boundary: inserting "after tag" places the ANCHOR before that
 * space node so the user can type text on the tag-side of the space.
 *
 * Returns null when the boundary is already represented by a non-whitespace
 * text node, a TOKEN, or an IMPLICIT_LINE.
 */
export function getAnchorAfterTagInsertionPoint(
  focus: HTMLElement
): { parent: Node; next: Node | null } | null {
  if (isToken(focus) || isLine(focus) || !focus.parentNode) {
    return null;
  }

  const next = getNextSibling(focus, (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return true;
    }
    return !(node instanceof Element && isIgnorable(node));
  });

  if (next?.nodeType === Node.TEXT_NODE) {
    return isWhitespaceTextNode(next) ? { parent: focus.parentNode, next } : null;
  }

  if (next && !(next instanceof HTMLElement)) {
    return null;
  }

  if (next && (isToken(next) || isImplicitLine(next))) {
    return null;
  }

  return { parent: focus.parentNode, next };
}

/**
 * Insert an ANCHOR at the immediate boundary after `focus`.
 *
 * Returns the inserted ANCHOR, or null if that boundary is already represented
 * and no anchor should be created.
 */
export function insertAnchorAfterTag(focus: HTMLElement): HTMLElement | null {
  const insertionPoint = getAnchorAfterTagInsertionPoint(focus);
  if (!insertionPoint) {
    return null;
  }

  const anchor = createAnchor();
  insertionPoint.parent.insertBefore(anchor, insertionPoint.next);
  return anchor;
}

export function getRemovableAnchorAfterTag(focus: HTMLElement): HTMLElement | null {
  if (isToken(focus) || isLine(focus) || !focus.parentNode) {
    return null;
  }

  const next = getNextSibling(focus, (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return true;
    }
    return !(node instanceof Element && isIgnorable(node));
  });

  if (next instanceof HTMLElement && isAnchor(next)) {
    return next;
  }

  if (next instanceof Text && isWhitespaceTextNode(next)) {
    const nextAfterWhitespace = getNextSibling(next, (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return true;
      }
      return !(node instanceof Element && isIgnorable(node));
    });
    return nextAfterWhitespace instanceof HTMLElement && isAnchor(nextAfterWhitespace)
      ? nextAfterWhitespace
      : null;
  }

  return null;
}

export function removeAnchorAfterTag(focus: HTMLElement): HTMLElement | null {
  const anchor = getRemovableAnchorAfterTag(focus);
  if (!anchor) {
    return null;
  }
  anchor.remove();
  return anchor;
}

/**
 * Get the immediate editable boundary before a focused tag where an ANCHOR can
 * be inserted.
 *
 * IGNORABLE siblings are skipped. A whitespace text node remains a valid
 * insertion boundary: inserting "before tag" places the ANCHOR after that
 * space node and immediately before the focused tag.
 *
 * Returns null when the boundary is already represented by a non-whitespace
 * text node, a TOKEN, or an IMPLICIT_LINE.
 */
export function getAnchorBeforeTagInsertionPoint(
  focus: HTMLElement
): { parent: Node; previous: Node | null } | null {
  if (isToken(focus) || isLine(focus) || !focus.parentNode) {
    return null;
  }

  const previous = getPreviousSibling(focus, (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return true;
    }
    return !(node instanceof Element && isIgnorable(node));
  });

  if (previous?.nodeType === Node.TEXT_NODE) {
    return isWhitespaceTextNode(previous) ? { parent: focus.parentNode, previous } : null;
  }

  if (previous && !(previous instanceof HTMLElement)) {
    return null;
  }

  if (previous && (isToken(previous) || isImplicitLine(previous))) {
    return null;
  }

  return { parent: focus.parentNode, previous };
}

/**
 * Insert an ANCHOR at the immediate boundary before `focus`.
 *
 * Returns the inserted ANCHOR, or null if that boundary is already represented
 * and no anchor should be created.
 */
export function insertAnchorBeforeTag(focus: HTMLElement): HTMLElement | null {
  const insertionPoint = getAnchorBeforeTagInsertionPoint(focus);
  if (!insertionPoint) {
    return null;
  }

  const anchor = createAnchor();
  insertionPoint.parent.insertBefore(anchor, focus);
  return anchor;
}

export function getRemovableAnchorBeforeTag(focus: HTMLElement): HTMLElement | null {
  if (isToken(focus) || isLine(focus) || !focus.parentNode) {
    return null;
  }

  const previous = getPreviousSibling(focus, (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return true;
    }
    return !(node instanceof Element && isIgnorable(node));
  });

  if (previous instanceof HTMLElement && isAnchor(previous)) {
    return previous;
  }

  if (previous instanceof Text && isWhitespaceTextNode(previous)) {
    const previousBeforeWhitespace = getPreviousSibling(previous, (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return true;
      }
      return !(node instanceof Element && isIgnorable(node));
    });
    return previousBeforeWhitespace instanceof HTMLElement && isAnchor(previousBeforeWhitespace)
      ? previousBeforeWhitespace
      : null;
  }

  return null;
}

export function removeAnchorBeforeTag(focus: HTMLElement): HTMLElement | null {
  const anchor = getRemovableAnchorBeforeTag(focus);
  if (!anchor) {
    return null;
  }
  anchor.remove();
  return anchor;
}

/**
 * Add ANCHOR's where applicable to the FOCUSABLE.
 *
 * Existing ANCHOR's are unchanged.  Only direct descendant ANCHOR's of
 * the FOCUSABLE are inserted (no recursion).
 *
 * If the user has deleted an anchor with the intention of never adding text to the related LINE_SEGMENT, this function will put it back.
 */
export function addAnchorsToTag(el: HTMLElement): HTMLElement[] {
  if (el.classList.contains(JSED_TOKEN_CLASS)) {
    throw new Error('addAnchors: expects an FOCUSABLE');
  }
  let segment = { hasTokens: false };
  const anchors: HTMLElement[] = [];
  const children = Array.from(el.children); // avoid infinite loops
  for (const child of children) {
    if (isIgnorable(child)) {
      // eg element indicator in jsed-ui
      continue;
    }
    if (isToken(child)) {
      segment.hasTokens = true;
      continue;
    }
    // We've hit a non-token...
    if (!segment.hasTokens) {
      const anchor = createAnchor();
      anchors.push(anchor);
      child.insertAdjacentElement('beforebegin', anchor);
    }
    // Start new segment...
    segment = { hasTokens: false };
  }
  if (!segment.hasTokens) {
    const anchor = createAnchor();
    anchors.push(anchor);
    el.appendChild(anchor);
  }
  return anchors;
}

export function anchorize(el: Node): HTMLElement[] {
  const anchors: HTMLElement[] = [];
  findNextNode(el, {
    ceiling: el,
    visitStart: true,
    // ISLAND's are OPAQUE: never DESCEND or anchorize their internals.
    shouldDescend: (node) => isFocusable(node) && !isIsland(node),
    pre: (node) => {
      // Returning void keeps the walk going; a returned Node would stop it.
      const anchor = anchorizeLeadingSegment(node);
      if (anchor) anchors.push(anchor);
    },
    post: (node) => {
      const anchor = anchorizeAfter(node);
      if (anchor) anchors.push(anchor);
    }
  });
  return anchors;
}

/**
 * Maybe insert ANCHOR at the beginning of the children of node.
 *
 * - Covers leading LINE_SEGMENT's for a line.
 * - Covers the case where the parent is empty, in which case we effectively append an ANCHOR.
 */
function anchorizeLeadingSegment(node: Node) {
  if (isFocusable(node) && !isIsland(node)) {
    const firstRealSib = getNextSibling(
      node.firstChild,
      (sib) => isFocusable(sib) || isTokenizableTextNode(sib) || isLineSibling(sib),
      true
    );
    if (!firstRealSib) {
      const anchor = createAnchor();
      // Make anchor the very first thing.
      node.insertBefore(anchor, node.firstChild);
      return anchor;
    }
    if (isFocusable(firstRealSib) && isInline(firstRealSib)) {
      if (isImplicitLine(firstRealSib)) {
        // Don't anchorize before an IMPLICIT_LINE.
        return null;
      }
      const anchor = createAnchor();
      firstRealSib.before(anchor);
      return anchor;
    }
  }
  return null;
}

/**
 * Maybe insert anchor next to node.
 *
 * - covers interstitial LINE_SEGMENT's for a LINE.
 * - covers trailing LINE_SEGMENT's for a LINE.
 */
function anchorizeAfter(node: Node) {
  if (isFocusable(node) && !isIsland(node) && isInline(node)) {
    if (isImplicitLine(node)) {
      // Don't anchorize after an IMPLICIT_LINE.
      return null;
    }
    const nextSib = getNextSibling(
      node,
      (sib) => isFocusable(sib) || isTokenizableTextNode(sib) || isLineSibling(sib),
      false
    );
    if (!nextSib) {
      const anchor = createAnchor();
      // Make anchor the very last thing.
      node.parentNode?.lastChild?.after(anchor);
      return anchor;
    }
    if (isFocusable(nextSib)) {
      const anchor = createAnchor();
      nextSib.before(anchor);
      return anchor;
    }
  }
  return null;
}
