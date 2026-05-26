import { getAllowableChildTags } from '../core/dom-rules.js';
import {
  isIgnorable,
  isToken,
  isAnchor,
  isLine,
  isLineSibling,
  JSED_TOKEN_PADDED,
  JSED_TOKEN_CLASS,
  JSED_TOKEN_COLLAPSED,
  JSED_DELETED_CLASS,
  JSED_IGNORE_CLASS,
  JSED_ANCHOR_CLASS
} from '../core/taxonomy.js';
import {
  getPreviousTokenSibling,
  getNextTokenSibling,
  getNextNodeSibling,
  getPreviousNodeSibling
} from '../core/sibling.js';
import {
  ensureSeparatorAfter,
  ensureSeparatorBefore,
  getSeparatorAfter,
  getSeparatorBefore,
  removeSeparatorAfter,
  removeSeparatorBefore,
  removeSeparator,
  restoreSeparator
} from './space.js';
import type { DeleteToken, DeleteTokenAll } from '../undo/UndoOperation.js';
import { isLastLineSibling } from '../core/lineSegment.js';
import { createAnchor } from './anchor.js';

export function getValue(token: Node): string {
  validate(token);
  if (isAnchor(token)) {
    return '';
  }
  return token.firstChild!.nodeValue as string;
}

export function getParent(el: HTMLElement): HTMLElement {
  if (!isToken(el)) {
    throw new Error('getParent: called on non-token');
  }
  const par = el.parentElement;
  if (!par) {
    throw new Error(
      'getParent: token has no parentElement is it attached to the dom or is it an HTML element?'
    );
  }
  return par;
}

/**
 * Create a TOKEN .
 *
 * @param text Should be non-whitespace
 */
export function createToken(text?: string): HTMLElement {
  const el = document.createElement('span');
  el.classList.add(JSED_TOKEN_CLASS);
  if (text) {
    el.appendChild(document.createTextNode(text));
  }
  return el;
}

/**
 * Assumes `isToken` is true, but checks for weird invalid states that might occur
 */
function validate(token: Node): void {
  if (isAnchor(token)) {
    return;
  }
  if (!token.firstChild) {
    throw new Error('token has no text');
  }
  if (token.firstChild.nodeType !== Node.TEXT_NODE) {
    throw new Error('first child should be a text node');
  }
}

/**
 * It's easier to replaceText on an ANCHOR (we don't have to call focus and trigger a selectAll in jsed-ui).
 */
export function anchor2Token(token: HTMLElement): HTMLElement {
  token.classList.remove(JSED_ANCHOR_CLASS);
  token.classList.add(JSED_TOKEN_CLASS);
  return token;
}

// #region Insert / Remove

export function insertAfter(toInsert: HTMLElement, existing: HTMLElement): void {
  if (!existing.parentNode) {
    throw new Error('parentNode not found');
  }
  existing.insertAdjacentElement('afterend', toInsert);

  // Need to add an anchor?
  // const nexttok = getNextTokenSibling(toInsert);
  // if (!nexttok) {
  //   const anchor = createAnchor();
  //   toInsert.insertAdjacentElement('afterend', anchor);
  // }
}

export function insertBefore(toInsert: HTMLElement, existing: HTMLElement): void {
  if (!existing.parentNode) {
    throw new Error('parentNode not found');
  }
  existing.insertAdjacentElement('beforebegin', toInsert);

  // Need to add an anchor?
  // const prevtok = getPreviousTokenSibling(toInsert);
  // if (!prevtok) {
  //   const anchor = createAnchor();
  //   toInsert.insertAdjacentElement('beforebegin', anchor);
  // }
}

/**
 * Replaces the text of the existing token.
 *
 * If the token is an ANCHOR, we convert it in-place to a regular token.
 *
 * In the boundary-spacing model this only updates visible TOKEN text. Spacing
 * before / after the TOKEN is managed by adjacent separator text nodes.
 */
export function replaceText(token: HTMLElement, val: string): HTMLElement {
  validate(token);
  anchor2Token(token);
  if (token.firstChild) {
    token.firstChild.nodeValue = val.trim();
  } else {
    token.append(document.createTextNode(val.trim()));
  }
  return token;
}

function removeToken(token: HTMLElement, removeSeparators: boolean = true): DeleteToken {
  token.classList.add(JSED_DELETED_CLASS);
  token.classList.add(JSED_IGNORE_CLASS);
  let removedNextSeparator: HTMLElement | false = false;
  let removedPreviousSeparator: HTMLElement | false = false;

  if (removeSeparators) {
    // Scan space nodes
    const separatorBefore = getSeparatorBefore(token);
    const separatorAfter = getSeparatorAfter(token);
    const removeNextSeparator = !!separatorAfter;
    const removePreviousSeparator =
      !!separatorBefore &&
      (!getNextNodeSibling(separatorBefore) || !getPreviousNodeSibling(separatorBefore));

    // Collapse paired separators down to one.
    removedNextSeparator = removeNextSeparator && removeSeparator(separatorAfter);
    removedPreviousSeparator = removePreviousSeparator && removeSeparator(separatorBefore);
  }

  return {
    action: 'delete-token',
    token,
    removeNextSeparator: removedNextSeparator,
    removePreviousSeparator: removedPreviousSeparator
  };
}

/**
 * If token is last in LINE_SEGMENT, anchorize it and don't flip any
 * SEPARATOR's.
 *
 * Technical note: remove could remove an ANCHOR in which case we're treating
 * the ANCHOR as content.  At the time of doing this, the CURSOR checks if it's
 * on an ANCHOR and doesn't call remove.
 */
export function remove(token: HTMLElement): DeleteTokenAll {
  const parentNode = token.parentNode;
  if (!parentNode) {
    throw new Error('remove: token has no parentNode');
  }

  if (isLastLineSibling(token)) {
    const anchor = createAnchor();
    token.before(anchor);
    const result = removeToken(token, false);
    return {
      action: 'anchorize-token',
      deletedToken: result,
      anchor
    };
  }

  return removeToken(token, true);
}

/**
 * Returns the TOKEN we restored.
 */
export function restore(op: DeleteTokenAll): HTMLElement {
  if (op.action === 'anchorize-token') {
    // Convert anchor back to token.
    const { anchor, deletedToken } = op;
    anchor.remove();
    restoreToken(deletedToken);
    return deletedToken.token;
  }
  restoreToken(op);
  return op.token;
}

export function restoreToken(op: DeleteToken) {
  const { token } = op;
  token.classList.remove(JSED_DELETED_CLASS);
  token.classList.remove(JSED_IGNORE_CLASS);
  if (op.removeNextSeparator) {
    restoreSeparator(op.removeNextSeparator);
  }
  if (op.removePreviousSeparator) {
    restoreSeparator(op.removePreviousSeparator);
  }
}

function hasNonIgnorableLineContent(node: Node): boolean {
  if (node instanceof Text) {
    return (node.textContent ?? '').trim() !== '';
  }

  if (!(node instanceof Element)) {
    return false;
  }

  if (isIgnorable(node)) {
    return false;
  }

  if (isToken(node)) {
    return true;
  }

  for (const child of Array.from(node.childNodes)) {
    if (hasNonIgnorableLineContent(child)) {
      return true;
    }
  }

  return false;
}

/**
 * Return true when a LINE is effectively empty for anchor insertion.
 *
 * IGNORABLE subtrees are treated as absent so element indicators and similar
 * UI aids do not block inserting an ANCHOR into an otherwise empty LINE.
 */
export function canInsertAnchorInLine(line: HTMLElement): boolean {
  if (!isLine(line)) {
    return false;
  }

  return !hasNonIgnorableLineContent(line);
}

// #endregion

// #region Wrapping (Selections)

export function canWrapElementChildrenWithTag(container: HTMLElement, tagName: string): boolean {
  if (!container.parentElement) {
    return false;
  }

  const normalized = tagName.toLowerCase();
  if (!normalized) {
    return false;
  }

  const parentAllowsWrapper = getAllowableChildTags(container.parentElement.tagName).includes(
    normalized
  );
  const allowedChildTags = getAllowableChildTags(normalized);
  const wrapperAllowsChildren = Array.from(container.children).every((child) =>
    allowedChildTags.includes(child.tagName.toLowerCase())
  );
  return parentAllowsWrapper && wrapperAllowsChildren;
}

export function wrapElementChildrenWithTag(
  container: HTMLElement,
  tagName: string
): HTMLElement | null {
  const normalized = tagName.toLowerCase();
  if (!normalized || !canWrapElementChildrenWithTag(container, normalized)) {
    return null;
  }

  const wrapper = container.ownerDocument.createElement(normalized);
  container.before(wrapper);
  wrapper.append(...Array.from(container.childNodes));
  container.remove();
  return wrapper;
}

export function canWrapLineSiblingWithTag(lineSibling: HTMLElement, tagName: string): boolean {
  if (!isLineSibling(lineSibling) || !lineSibling.parentElement) {
    return false;
  }

  const normalized = tagName.toLowerCase();
  if (!normalized) {
    return false;
  }

  const parentAllowsWrapper = getAllowableChildTags(lineSibling.parentElement.tagName).includes(
    normalized
  );
  const wrapperAllowsLineSibling = getAllowableChildTags(normalized).includes(
    lineSibling.tagName.toLowerCase()
  );
  return parentAllowsWrapper && wrapperAllowsLineSibling;
}

/**
 * Wrap a LINE_SIBLING in a new FOCUSABLE element while keeping the target itself
 * intact, so the active CURSOR can stay seated on the same LINE_SIBLING.
 */
export function wrapLineSiblingWithTag(
  lineSibling: HTMLElement,
  tagName: string
): HTMLElement | null {
  const normalized = tagName.toLowerCase();
  if (!normalized || !canWrapLineSiblingWithTag(lineSibling, normalized)) {
    return null;
  }

  const wrapper = lineSibling.ownerDocument.createElement(normalized);
  lineSibling.before(wrapper);
  wrapper.appendChild(lineSibling);
  return wrapper;
}

// #endregion

// #region Join

export function joinNext(token: HTMLElement): void {
  const next = getNextTokenSibling(token);
  if (!next) {
    return;
  }
  const nextSeparatorValue = getSeparatorAfter(next)?.nodeValue ?? null;
  const val = getValue(token);
  const nextVal = getValue(next);
  replaceText(token, val + nextVal);
  removeSeparatorAfter(token);
  remove(next);
  if (nextSeparatorValue) {
    ensureSeparatorAfter(token, nextSeparatorValue);
    token.classList.remove(JSED_TOKEN_COLLAPSED);
  } else {
    token.classList.add(JSED_TOKEN_COLLAPSED);
  }
}

export function joinPrevious(token: HTMLElement): void {
  const prev = getPreviousTokenSibling(token);
  if (!prev) {
    return;
  }
  const prevSeparatorValue = getSeparatorBefore(prev)?.nodeValue ?? null;
  const val = getValue(token);
  const prevVal = getValue(prev);
  replaceText(token, prevVal + val);
  removeSeparatorBefore(token);
  remove(prev);
  if (prevSeparatorValue) {
    ensureSeparatorBefore(token, prevSeparatorValue);
    token.classList.add(JSED_TOKEN_PADDED);
  } else {
    token.classList.remove(JSED_TOKEN_PADDED);
  }
}

// #endregion
