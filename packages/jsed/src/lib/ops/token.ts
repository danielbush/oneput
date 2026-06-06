import { getAllowableChildTags } from '../core/dom-rules.js';
import {
  isToken,
  isAnchor,
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
  undoRemoveSeparator,
  type RemoveSeparator,
  redoRemoveSeparator,
  type InsertSeparatorAfter
} from './space.js';
import { isLastText } from '../core/lineSegment.js';
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

export type InsertTokenAfter = {
  action: 'insert-token-after';
  token: HTMLElement;
  after: HTMLElement;
  separatorAfter: InsertSeparatorAfter | null;
  removedToken?: RemoveToken;
  removedSeparatorAfter?: RemoveSeparator;
};

export type InsertTokenBefore = {
  action: 'insert-token-before';
  token: HTMLElement;
  after: HTMLElement;
  separatorAfter: InsertSeparatorAfter | null;
  removedToken?: RemoveToken;
  removedSeparatorAfter?: RemoveSeparator;
};

export function insertAfter(toInsert: HTMLElement, existing: HTMLElement): InsertTokenAfter {
  if (!existing.parentNode) {
    throw new Error('parentNode not found');
  }
  existing.after(toInsert);
  const result = ensureSeparatorAfter(existing);
  return {
    action: 'insert-token-after',
    token: toInsert,
    after: existing,
    separatorAfter: result
  };
}

export function undoInsertAfter(op: InsertTokenAfter) {
  const { separatorAfter, token } = op;
  op.removedToken = removeToken(token, false);
  if (separatorAfter) {
    op.removedSeparatorAfter = removeSeparator(separatorAfter?.separator);
  }
}

export function redoInsertAfter(op: InsertTokenAfter) {
  const { removedToken, removedSeparatorAfter } = op;
  if (removedToken) {
    undoRemoveToken(removedToken);
  }
  if (removedSeparatorAfter) {
    undoRemoveSeparator(removedSeparatorAfter);
  }
}

export function insertBefore(toInsert: HTMLElement, existing: HTMLElement): InsertTokenBefore {
  if (!existing.parentNode) {
    throw new Error('parentNode not found');
  }
  existing.before(toInsert);
  const result = ensureSeparatorAfter(toInsert);
  return {
    action: 'insert-token-before',
    token: toInsert,
    after: existing,
    separatorAfter: result
  };
}

export function undoInsertBefore(op: InsertTokenBefore) {
  const { separatorAfter, token } = op;
  op.removedToken = removeToken(token, false);
  if (separatorAfter) {
    op.removedSeparatorAfter = removeSeparator(separatorAfter?.separator);
  }
}

export function redoInsertBefore(op: InsertTokenBefore) {
  const { removedToken, removedSeparatorAfter } = op;
  if (removedToken) {
    undoRemoveToken(removedToken);
  }
  if (removedSeparatorAfter) {
    undoRemoveSeparator(removedSeparatorAfter);
  }
}

export type ReplaceText = {
  action: 'replace-text';
  token: HTMLElement;
  before: string;
  after: string;
};

/**
 * Replaces the text of the existing token.
 *
 * If the token is an ANCHOR, we convert it in-place to a regular token.
 *
 * In the boundary-spacing model this only updates visible TOKEN text. Spacing
 * before / after the TOKEN is managed by adjacent separator text nodes.
 */
export function replaceText(token: HTMLElement, val: string): ReplaceText {
  validate(token);
  const before = getValue(token);
  anchor2Token(token);
  const after = val.trim();
  if (token.firstChild) {
    token.firstChild.nodeValue = after;
  } else {
    token.append(document.createTextNode(val.trim()));
  }
  return {
    action: 'replace-text',
    token,
    before,
    after
  };
}

export function undoReplaceText(op: ReplaceText) {
  const { before, token } = op;
  token.firstChild!.nodeValue = before;
}

export function redoReplaceText(op: ReplaceText) {
  const { after, token } = op;
  token.firstChild!.nodeValue = after;
}

export type RemoveTokenAll = RemoveToken | AnchorizeToken;

export type RemoveToken = {
  action: 'delete-token';
  token: HTMLElement;
  nextSeparator: false | RemoveSeparator;
  previousSeparator: false | RemoveSeparator;
};

export type AnchorizeToken = {
  action: 'anchorize-token';
  removedToken: RemoveToken;
  anchor: HTMLElement;
};

/**
 * If token is last in LINE_SEGMENT, anchorize it and don't flip any
 * SEPARATOR's.
 *
 * Technical note: remove could remove an ANCHOR in which case we're treating
 * the ANCHOR as content.  At the time of doing this, the CURSOR checks if it's
 * on an ANCHOR and doesn't call remove.
 */
export function remove(token: HTMLElement, anchorize = true): RemoveTokenAll {
  const parentNode = token.parentNode;
  if (!parentNode) {
    throw new Error('remove: token has no parentNode');
  }

  if (anchorize && isLastText(token)) {
    const anchor = createAnchor();
    token.before(anchor);
    const result = removeToken(token, false);
    return {
      action: 'anchorize-token',
      removedToken: result,
      anchor
    };
  }

  return removeToken(token, true);
}

export function undoRemove(op: RemoveTokenAll) {
  if (op.action === 'anchorize-token') {
    // Convert anchor back to token.
    const { anchor, removedToken } = op;
    anchor.remove();
    undoRemoveToken(removedToken);
    return;
  }
  undoRemoveToken(op);
}

/**
 * Similar to remove.
 */
export function redoRemove(op: RemoveTokenAll) {
  if (op.action === 'anchorize-token') {
    const { anchor, removedToken } = op;
    removedToken.token.before(anchor);
    redoRemoveToken(removedToken);
    return;
  }
  redoRemoveToken(op);
}

/**
 * Low-level utility for flipping tokens.
 */
function removeToken(token: HTMLElement, removeSeparators: boolean = true): RemoveToken {
  token.classList.add(JSED_DELETED_CLASS);
  token.classList.add(JSED_IGNORE_CLASS);
  let nextSeparator: RemoveSeparator | false = false;
  let previousSeparator: RemoveSeparator | false = false;

  if (removeSeparators) {
    // Scan space nodes
    const separatorBefore = getSeparatorBefore(token);
    const separatorAfter = getSeparatorAfter(token);
    const removeNextSeparator = !!separatorAfter;
    const removePreviousSeparator =
      !!separatorBefore &&
      (!getNextNodeSibling(separatorBefore) || !getPreviousNodeSibling(separatorBefore));

    // Collapse paired separators down to one.
    nextSeparator = removeNextSeparator && removeSeparator(separatorAfter);
    previousSeparator = removePreviousSeparator && removeSeparator(separatorBefore);
  }

  return {
    action: 'delete-token',
    token,
    nextSeparator,
    previousSeparator
  };
}

function undoRemoveToken(op: RemoveToken) {
  const { token } = op;
  token.classList.remove(JSED_DELETED_CLASS);
  token.classList.remove(JSED_IGNORE_CLASS);
  if (op.nextSeparator) {
    undoRemoveSeparator(op.nextSeparator);
  }
  if (op.previousSeparator) {
    undoRemoveSeparator(op.previousSeparator);
  }
}

/**
 * Similar to removeToken.
 */
function redoRemoveToken(op: RemoveToken) {
  const { token } = op;
  token.classList.add(JSED_DELETED_CLASS);
  token.classList.add(JSED_IGNORE_CLASS);
  if (op.nextSeparator) {
    redoRemoveSeparator(op.nextSeparator);
  }
  if (op.previousSeparator) {
    redoRemoveSeparator(op.previousSeparator);
  }
}

// #endregion

// #region Wrapping

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

export type WrapLineSibling = {
  action: 'wrap-line-sibling';
  lineSibling: HTMLElement;
  wrapper: HTMLElement;
};

/**
 * Wrap a LINE_SIBLING in a new FOCUSABLE element while keeping the target itself
 * intact, so the active CURSOR can stay seated on the same LINE_SIBLING.
 */
export function wrapLineSiblingWithTag(
  lineSibling: HTMLElement,
  tagName: string
): WrapLineSibling | void {
  const normalized = tagName.toLowerCase();
  if (!normalized || !canWrapLineSiblingWithTag(lineSibling, normalized)) {
    return;
  }

  const wrapper = lineSibling.ownerDocument.createElement(normalized);
  lineSibling.before(wrapper);
  wrapper.appendChild(lineSibling);
  return {
    action: 'wrap-line-sibling',
    lineSibling,
    wrapper: wrapper
  };
}

export function undoWrapLineSiblingWithTag(op: WrapLineSibling) {
  op.wrapper.before(op.lineSibling);
  op.wrapper.remove();
}

export function redoWrapLineSiblingWithTag(op: WrapLineSibling) {
  op.lineSibling.after(op.wrapper);
  op.wrapper.appendChild(op.lineSibling);
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
