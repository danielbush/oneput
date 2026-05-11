import { getNextVisibleSibling, getPreviousVisibleSibling } from './line.js';
import {
  isIgnorable,
  isImplicitLine,
  isInlineFlow,
  isLine,
  isToken,
  isWhitespaceTextNode
} from './taxonomy.js';
import { getNextSiblingNode, getPreviousSiblingNode } from './walk.js';

// #region Separator (Space) utils
export function getSeparatorBefore(token: HTMLElement): Text | null {
  const prev = token.previousSibling;
  return isWhitespaceTextNode(prev) ? prev : null;
}

export function getSeparatorAfter(token: HTMLElement): Text | null {
  const next = token.nextSibling;
  return isWhitespaceTextNode(next) ? next : null;
}

/**
 * Ensure there is a whitespace separator immediately before the TOKEN.
 */
export function ensureSeparatorBefore(token: HTMLElement, value = ' '): Text {
  const existing = getSeparatorBefore(token);
  if (existing) {
    return existing;
  }
  const separator = document.createTextNode(value);
  token.parentNode?.insertBefore(separator, token);
  return separator;
}

/**
 * Ensure there is a whitespace separator immediately after the TOKEN.
 *
 * Used for default inter-TOKEN spacing.
 */
export function ensureSeparatorAfter(token: HTMLElement, value = ' '): Text {
  const existing = getSeparatorAfter(token);
  if (existing) {
    return existing;
  }
  const separator = document.createTextNode(value);
  token.parentNode?.insertBefore(separator, token.nextSibling);
  return separator;
}

/**
 * Remove the whitespace separator immediately before the TOKEN, if present.
 */
export function removeSeparatorBefore(token: HTMLElement): void {
  const separator = getSeparatorBefore(token);
  separator?.parentNode?.removeChild(separator);
}

/**
 * Remove the whitespace separator immediately after the TOKEN, if present.
 */
export function removeSeparatorAfter(token: HTMLElement): void {
  const separator = getSeparatorAfter(token);
  separator?.parentNode?.removeChild(separator);
}

// #endregion

// #region Leading / Trailing Space (tokens)

function subtreeEndsWithWhitespace(node: Node): boolean {
  if (node instanceof Text) {
    return /\s$/.test(node.nodeValue ?? '');
  }

  if (!(node instanceof Element) || isIgnorable(node)) {
    return false;
  }

  const children = Array.from(node.childNodes).reverse();
  for (const child of children) {
    if (child instanceof Element && isIgnorable(child)) {
      continue;
    }
    return subtreeEndsWithWhitespace(child);
  }

  return false;
}

function subtreeStartsWithWhitespace(node: Node): boolean {
  if (node instanceof Text) {
    return /^\s/.test(node.nodeValue ?? '');
  }

  if (!(node instanceof Element) || isIgnorable(node)) {
    return false;
  }

  for (const child of node.childNodes) {
    if (child instanceof Element && isIgnorable(child)) {
      continue;
    }
    return subtreeStartsWithWhitespace(child);
  }

  return false;
}

function removeLeadingSpaceNode(textNode: Text): Text | null {
  const value = textNode.nodeValue ?? '';
  if (!/^\s/.test(value)) {
    return null;
  }
  textNode.parentNode?.removeChild(textNode);
  return textNode;
}

function removeTrailingSpaceNode(textNode: Text): Text | null {
  const value = textNode.nodeValue ?? '';
  if (!/\s$/.test(value)) {
    return null;
  }
  textNode.parentNode?.removeChild(textNode);
  return textNode;
}

/**
 * Ensure normal boundary spacing before a TOKEN.
 */
export function ensureSpaceBefore(token: HTMLElement, value = ' '): Text {
  return ensureSeparatorBefore(token, value);
}

/**
 * Ensure normal boundary spacing after a TOKEN.
 */
export function ensureSpaceAfter(token: HTMLElement, value = ' '): Text {
  return ensureSeparatorAfter(token, value);
}

export function canInsertSpaceBeforeToken(token: HTMLElement): boolean {
  if (!isToken(token) || !token.parentNode || getSeparatorBefore(token)) {
    return false;
  }

  const previous = getPreviousVisibleSibling(token);
  if (
    !previous ||
    isToken(previous) ||
    (isInlineFlow(previous) && subtreeEndsWithWhitespace(previous))
  ) {
    return false;
  }

  return true;
}

export function insertSpaceBeforeToken(token: HTMLElement, value = ' '): Text | null {
  if (!canInsertSpaceBeforeToken(token) || !token.parentNode) {
    return null;
  }

  const space = document.createTextNode(value);
  token.parentNode.insertBefore(space, token);
  return space;
}

export function getRemovableSpaceBeforeToken(token: HTMLElement): Text | null {
  if (!isToken(token)) {
    return null;
  }

  const separator = getSeparatorBefore(token);
  if (!separator) {
    return null;
  }

  const previous = getPreviousVisibleSibling(token);
  if (!previous || isToken(previous)) {
    return null;
  }

  return separator;
}

export function removeSpaceBeforeToken(token: HTMLElement): boolean {
  const separator = getRemovableSpaceBeforeToken(token);
  if (!separator) {
    return false;
  }

  return !!removeTrailingSpaceNode(separator);
}

export function canInsertSpaceAfterToken(token: HTMLElement): boolean {
  if (!isToken(token) || !token.parentNode || getSeparatorAfter(token)) {
    return false;
  }

  const next = getNextVisibleSibling(token);
  if (!next || isToken(next) || (isInlineFlow(next) && subtreeStartsWithWhitespace(next))) {
    return false;
  }

  return true;
}

export function insertSpaceAfterToken(token: HTMLElement, value = ' '): Text | null {
  if (!canInsertSpaceAfterToken(token) || !token.parentNode) {
    return null;
  }

  const space = document.createTextNode(value);
  token.parentNode.insertBefore(space, token.nextSibling);
  return space;
}

export function getRemovableSpaceAfterToken(token: HTMLElement): Text | null {
  if (!isToken(token)) {
    return null;
  }

  const separator = getSeparatorAfter(token);
  if (!separator) {
    return null;
  }

  const next = getNextVisibleSibling(token);
  if (!next || isToken(next)) {
    return null;
  }

  return separator;
}

export function removeSpaceAfterToken(token: HTMLElement): boolean {
  const separator = getRemovableSpaceAfterToken(token);
  if (!separator) {
    return false;
  }

  return !!removeLeadingSpaceNode(separator);
}

// #endregion

// #region Leading / Trailing Space (tags)

/**
 * Whether a whitespace text node can be inserted immediately after a focused
 * tag.
 *
 * IGNORABLE siblings are skipped. A non-whitespace text node is a valid
 * insertion target as long as it does not already begin with whitespace. A
 * TOKEN is also a valid insertion target when no separator already represents
 * the boundary.
 */
export function canInsertSpaceAfterTag(focus: HTMLElement): boolean {
  if (isToken(focus) || isLine(focus) || !focus.parentNode) {
    return false;
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
    const text = next.textContent ?? '';
    return !/^\s/.test(text);
  }

  if (next && !(next instanceof HTMLElement)) {
    return false;
  }

  if (next && isImplicitLine(next)) {
    return false;
  }

  return !!next;
}

export function insertSpaceAfterTag(focus: HTMLElement, value = ' '): Text | null {
  if (!canInsertSpaceAfterTag(focus) || !focus.parentNode) {
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

  const space = document.createTextNode(value);
  focus.parentNode.insertBefore(space, next);
  return space;
}

export function getRemovableSpaceAfterTag(focus: HTMLElement): Text | null {
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

  if (next instanceof Text) {
    return /^\s/.test(next.nodeValue ?? '') ? next : null;
  }

  if (next && !(next instanceof HTMLElement)) {
    return null;
  }

  if (next && isImplicitLine(next)) {
    return null;
  }

  return null;
}

export function removeSpaceAfterTag(focus: HTMLElement): boolean {
  const textNode = getRemovableSpaceAfterTag(focus);
  if (!textNode) {
    return false;
  }

  return !!removeLeadingSpaceNode(textNode);
}

/**
 * Whether a whitespace text node can be inserted immediately before a focused
 * tag.
 *
 * IGNORABLE siblings are skipped. A non-whitespace text node is a valid
 * insertion target as long as it does not already end with whitespace. A
 * TOKEN is also a valid insertion target when no separator already represents
 * the boundary.
 */
export function canInsertSpaceBeforeTag(focus: HTMLElement): boolean {
  if (isToken(focus) || isLine(focus) || !focus.parentNode) {
    return false;
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
    const text = previous.textContent ?? '';
    return !/\s$/.test(text);
  }

  if (previous && !(previous instanceof HTMLElement)) {
    return false;
  }

  if (previous && isImplicitLine(previous)) {
    return false;
  }

  return !!previous;
}

export function insertSpaceBeforeTag(focus: HTMLElement, value = ' '): Text | null {
  if (!canInsertSpaceBeforeTag(focus) || !focus.parentNode) {
    return null;
  }

  const space = document.createTextNode(value);
  focus.parentNode.insertBefore(space, focus);
  return space;
}

export function getRemovableSpaceBeforeTag(focus: HTMLElement): Text | null {
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

  if (previous instanceof Text) {
    return /\s$/.test(previous.nodeValue ?? '') ? previous : null;
  }

  if (previous && !(previous instanceof HTMLElement)) {
    return null;
  }

  if (previous && isImplicitLine(previous)) {
    return null;
  }

  return null;
}

export function removeSpaceBeforeTag(focus: HTMLElement): boolean {
  const textNode = getRemovableSpaceBeforeTag(focus);
  if (!textNode) {
    return false;
  }

  return !!removeTrailingSpaceNode(textNode);
}

// #endregion
