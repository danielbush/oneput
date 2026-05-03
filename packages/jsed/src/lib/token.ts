import {
  JSED_ANCHOR_CHAR,
  JSED_ANCHOR_CLASS,
  JSED_TOKEN_CLASS,
  JSED_TOKEN_COLLAPSED,
  JSED_TOKEN_PADDED
} from './constants.js';
import { canCreateWithAnchor, getAllowableChildTags } from './dom-rules.js';
import { getNextSiblingNode, getPreviousSiblingNode } from './walk.js';
import {
  isIgnorable,
  isToken,
  isAnchor,
  isImplicitLine,
  isLine,
  isLineSibling,
  isWhitespaceTextNode
} from './taxonomy.js';
import { getLine, getPreviousTokenSibling, getNextTokenSibling } from './line.js';
import {
  ensureSeparatorAfter,
  ensureSeparatorBefore,
  getSeparatorAfter,
  getSeparatorBefore,
  removeSeparatorAfter,
  removeSeparatorBefore
} from './space.js';

export function getValue(token: HTMLElement): string {
  validate(token);
  if (isAnchor(token)) {
    return JSED_ANCHOR_CHAR;
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
 * Create an ANCHOR
 *
 * This is a token that contains text that represents a text anchor.  We add an
 * additional class to help detect it.
 */
export function createAnchor(): HTMLElement {
  // const el = createToken(JSED_ANCHOR_CHAR);
  const el = createToken();
  el.classList.add(JSED_ANCHOR_CLASS);
  return el;
}

/**
 * It's easier to replaceText on an ANCHOR (we don't have to call focus and trigger a select-all in jsed-ui).
 */
function anchor2Token(token: HTMLElement): HTMLElement {
  token.classList.remove(JSED_ANCHOR_CLASS);
  return token;
}

/**
 * Assumes `isToken` is true, but checks for weird invalid states that might occur
 */
function validate(token: HTMLElement): void {
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

// #region Anchors

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

  const next = getNextSiblingNode(focus, focus.parentNode, {
    visit: (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return true;
      }
      return !(node instanceof Element && isIgnorable(node));
    }
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

  const next = getNextSiblingNode(focus, focus.parentNode, {
    visit: (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return true;
      }
      return !(node instanceof Element && isIgnorable(node));
    }
  });

  if (next instanceof HTMLElement && isAnchor(next)) {
    return next;
  }

  if (next instanceof Text && isWhitespaceTextNode(next)) {
    const nextAfterWhitespace = getNextSiblingNode(next, focus.parentNode, {
      visit: (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return true;
        }
        return !(node instanceof Element && isIgnorable(node));
      }
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

  const previous = getPreviousSiblingNode(focus, focus.parentNode, {
    visit: (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return true;
      }
      return !(node instanceof Element && isIgnorable(node));
    }
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

  const previous = getPreviousSiblingNode(focus, focus.parentNode, {
    visit: (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return true;
      }
      return !(node instanceof Element && isIgnorable(node));
    }
  });

  if (previous instanceof HTMLElement && isAnchor(previous)) {
    return previous;
  }

  if (previous instanceof Text && isWhitespaceTextNode(previous)) {
    const previousBeforeWhitespace = getPreviousSiblingNode(previous, focus.parentNode, {
      visit: (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return true;
        }
        return !(node instanceof Element && isIgnorable(node));
      }
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

// #endregion

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

/**
 * Remove the token and return the nearest token in the same LINE_SEGMENT. If no
 * tokens left we provide just an empty token with an anchor symbol to display
 * it.
 *
 * @param params.keepAnchor If the token has no immediate siblings around it under the same parent element, then insert a ANCHOR .
 */
export function remove(token: HTMLElement): { next: HTMLElement } {
  const parentNode = token.parentNode;
  if (!parentNode) {
    throw new Error('remove: token has no parentNode');
  }

  // An anchor exists once we've exhausted the LINE_SEGMENT of non-empty
  // TOKEN's. Operations that inject text back in should de-anchor the token.

  if (isAnchor(token)) {
    return { next: token };
  }

  const prevTok = getPreviousTokenSibling(token);
  const nextTok = getNextTokenSibling(token);
  const separatorBefore = getSeparatorBefore(token);
  const separatorAfter = getSeparatorAfter(token);

  // Collapse paired separators down to one by dropping the trailing one.
  // The leading separator stays as either the previous TOKEN's trailing
  // space or as an edge space — both are visually harmless.
  if (separatorBefore && separatorAfter) {
    separatorAfter.parentNode?.removeChild(separatorAfter);
  }

  // Capture neighbours BEFORE detaching — once `token` is removed,
  // `previousElementSibling` / `nextElementSibling` return null.
  const prevEl = token.previousElementSibling;
  const nextEl = token.nextElementSibling;

  parentNode.removeChild(token);

  const nextFocus = nextTok || prevTok;

  if (nextFocus) {
    return { next: nextFocus };
  }

  // We're out of text, we need to add a ANCHOR to this LINE_SEGMENT .

  const anchor = createAnchor();

  if (prevEl) {
    insertAfter(anchor, prevEl as HTMLElement);
    return { next: anchor };
  }

  if (nextEl) {
    insertBefore(anchor, nextEl as HTMLElement);
    return { next: anchor };
  }
  parentNode.appendChild(anchor);

  return { next: anchor };
}

/**
 * Add ANCHOR's where applicable to the FOCUSABLE.
 *
 * Existing ANCHOR's are unchanged.  Only direct descendant ANCHOR's of
 * the FOCUSABLE are inserted (no recursion).
 *
 * If the user has deleted an anchor with the intention of never adding text to the related LINE_SEGMENT, this function will put it back.
 */
export function addAnchors(el: HTMLElement): HTMLElement[] {
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

// #region Split

function createSplitPeer(parent: HTMLElement): HTMLElement {
  if (isImplicitLine(parent)) {
    return document.createElement('p');
  }

  const peer = parent.cloneNode(false) as HTMLElement;
  if (peer.id) {
    peer.removeAttribute('id');
  }
  return peer;
}

function movePreviousSiblings(from: Node, to: HTMLElement): void {
  for (let sib: ChildNode | null = from.previousSibling; sib; ) {
    const prevSib: ChildNode | null = sib.previousSibling;
    to.insertBefore(sib, to.firstChild);
    sib = prevSib;
  }
}

function moveNextSiblings(from: Node, to: HTMLElement): void {
  for (let sib: ChildNode | null = from.nextSibling; sib; ) {
    const nextSib: ChildNode | null = sib.nextSibling;
    to.appendChild(sib);
    sib = nextSib;
  }
}

function ensureAnchorIfEmpty(el: HTMLElement): void {
  if (el.childNodes.length > 0) {
    return;
  }
  if (canCreateWithAnchor(el.tagName)) {
    addAnchors(el);
  }
}

function isRootTextLine(line: HTMLElement): boolean {
  return line.tagName === 'DIV' && line.parentElement === line.ownerDocument.body;
}

function convertImplicitLineToParagraph(line: HTMLElement): HTMLElement {
  if (!isImplicitLine(line)) {
    return line;
  }

  const paragraph = document.createElement('p');
  while (line.firstChild) {
    paragraph.appendChild(line.firstChild);
  }
  line.replaceWith(paragraph);
  return paragraph;
}

/**
 * Move anything before `token` to a new parent before the current parent (SPLIT_BY_TOKEN).
 */
export function splitBefore(token: HTMLElement): HTMLElement[] {
  let par = getParent(token);
  par = convertImplicitLineToParagraph(par);
  const line = getLine(token);

  if (par === line && isRootTextLine(line)) {
    const br = document.createElement('br');
    token.parentNode?.insertBefore(br, token);
    return [br, line];
  }

  const prevPar = createSplitPeer(par);
  par.insertAdjacentElement('beforebegin', prevPar);
  movePreviousSiblings(token, prevPar);
  ensureAnchorIfEmpty(prevPar);

  for (let current = par; current !== line; current = current.parentElement as HTMLElement) {
    const parent = current.parentElement;
    if (!parent) {
      break;
    }
    const prevParent = createSplitPeer(parent);
    parent.insertAdjacentElement('beforebegin', prevParent);
    movePreviousSiblings(current, prevParent);
  }

  return [prevPar, par];
}

/**
 * Move anything after `token` to a new parent after the current parent (SPLIT_BY_TOKEN).
 */
export function splitAfter(token: HTMLElement): HTMLElement[] {
  let par = getParent(token);
  par = convertImplicitLineToParagraph(par);
  const line = getLine(token);

  if (par === line && isRootTextLine(line)) {
    const br = document.createElement('br');
    token.after(br);
    return [line, br];
  }

  const nextPar = createSplitPeer(par);
  par.insertAdjacentElement('afterend', nextPar);
  moveNextSiblings(token, nextPar);
  ensureAnchorIfEmpty(nextPar);

  for (let current = par; current !== line; current = current.parentElement as HTMLElement) {
    const parent = current.parentElement;
    if (!parent) {
      break;
    }
    const nextParent = createSplitPeer(parent);
    parent.insertAdjacentElement('afterend', nextParent);
    moveNextSiblings(current, nextParent);
  }

  return [par, nextPar];
}

// #endregion
