import {
  JSED_IMPLICIT_CLASS,
  JSED_PLACEHOLDER_TOKEN_CLASS,
  JSED_TOKEN_CLASS,
} from './constants';
import { ignoreDescendents, isFocusable } from './focus';
import { findNextNode, findPreviousNode } from './walk';

// #region utils
/**
 * Detect if an F_ELEM is acting like an inline element eg an em-tag - such
 * elements are considered part of the visual line of text.
 */
export function isPartOfLine(
  el: Node | ChildNode | ParentNode | null,
): boolean {
  if (!el) {
    throw new Error(`isInline called on null or undefined`);
  }
  if (isToken(el)) return true;
  if (!isFocusable(el)) return false;

  // This is an implicit line, it may be inline, but we treat it like a separate LINE.
  if (el.classList.contains(JSED_IMPLICIT_CLASS)) return false;

  const styles = window.getComputedStyle(el);
  if (!['none', ''].includes(styles.float)) {
    return false;
  }
  if (styles.display === 'inline') return true;
  if (styles.display === 'inline flow') return true;
  return false;
}

export function isToken2(
  el: EventTarget | Element | null | undefined,
): el is HTMLElement {
  return isToken(el);
}

/**
 * Detect if the element is a TOKEN .
 */
export function isToken(el: EventTarget | Element | null | undefined): boolean {
  const isHTMLElement = el instanceof window.HTMLElement;
  if (isHTMLElement) {
    return (
      el.classList.contains(JSED_TOKEN_CLASS) ||
      el.classList.contains(JSED_PLACEHOLDER_TOKEN_CLASS)
    );
  }
  return false;
}

export function isPlaceholderToken(el: HTMLElement): boolean {
  const isHTMLElement = el instanceof window.HTMLElement;
  if (isHTMLElement) {
    return el.classList.contains(JSED_PLACEHOLDER_TOKEN_CLASS);
  }
  return false;
}

export function getParent(el: HTMLElement): HTMLElement {
  if (!isToken(el)) {
    throw new Error('getParent: called on non-token');
  }
  const par = el.parentElement;
  if (!par) {
    throw new Error(
      'getParent: token has no parentElement is it attached to the dom or is it an HTML element?',
    );
  }
  return par;
}
// #endregion

// #region Tokenization

/**
 * Create a TOKEN .
 *
 * @param text Should be non-whitespace
 */
export function createToken(text: string): HTMLElement {
  const el = document.createElement('span');
  el.classList.add(JSED_TOKEN_CLASS);
  el.appendChild(document.createTextNode(text));
  return el;
}

/**
 * Create a PLACEHOLDER_TOKEN
 */
export function createPlaceholderToken(): HTMLElement {
  const el = document.createElement('span');
  el.classList.add(JSED_PLACEHOLDER_TOKEN_CLASS);
  el.appendChild(document.createTextNode('§'));
  return el;
}

// function createSpace(): Text {
//   return document.createTextNode(' ');
// }

/**
 * Used by tokenizer to convert text nodes to TOKEN's.
 */
function replaceTextNode(child: ParentNode | ChildNode): boolean {
  const el = child.parentNode;
  if (isToken(el)) {
    throw new Error(
      'replaceTextNode: called on existing token - this should not happen we should track what has been tokenized.',
    );
  }
  if (child.nodeType === Node.TEXT_NODE) {
    const tokens = child
      .nodeValue!.split(/\s+/)
      .filter(Boolean)
      .map((s) => createToken(s));
    const frag = document.createDocumentFragment();
    for (const token of tokens) {
      frag.appendChild(token);
      // frag.appendChild(createSpace());
    }
    el?.insertBefore(frag, child);
    el?.removeChild(child);
    return true;
  }
  return false;
}

/**
 * Tokenize all the child text nodes in an F_ELEM .
 */
function tokenizeShallow(el: ParentNode | ChildNode): void {
  // el.normalize();
  // Record childNodes before we mutate and convert to array as the NodeList is
  // live!
  const childNodes = Array.from(el.childNodes);
  for (const child of childNodes) {
    if (isToken(el)) {
      continue;
    }
    // Recurse into inline tags eg em-tag.
    // Be aware of INLINE_COMPUTED_STYLE .
    if (isPartOfLine(child)) {
      tokenizeShallow(child);
    } else {
      replaceTextNode(child);
    }
  }
}

/**
 * Depth first traversal of F_ELEM's, each F_ELEM is horizontally tokenized with tokenizeShallow.
 */
function tokenizeLine(root: HTMLElement): void {
  if (!isFocusable(root)) {
    throw new Error('Can only tokenize an F_ELEM');
  }
  root.normalize();
  tokenizeShallow(root);
  // for (const el of findNextNode(root, ceiling, {
  //   filter: (el) => {
  //     if (!el) {
  //       return false;
  //     }
  //     if (isToken(el)) {
  //       return false;
  //     }
  //     return (
  //       // Allow text nodes to ensure we capture things like 'foo <em>bar</em> baz'.
  //       el.nodeType === Node.ELEMENT_NODE || el.nodeType === Node.TEXT_NODE
  //     );
  //   },
  // })) {
  //   tokenizeShallow(el);
  // }
}

/**
 * Tokenize the text of an F_ELEM.
 */
export function tokenize(el: HTMLElement): void {
  const line = getLine(el);
  tokenizeLine(line);
}

/**
 * Find and handle IMPLICIT_LINE's.
 *
 * Run this on the whole doc at the beginning BEFORE any tokenization occurs.
 */
export function tokenizeImplicitLine(root: HTMLElement) {
  const buildImplicitLine = (node: Node): HTMLElement | null => {
    if (!node.parentNode) {
      throw new Error(`Expected node to have parent.`);
    }
    node.parentNode.normalize(); // ok, so really there is just one text node now...
    if (!node.nodeValue || /^\s+$/.test(node.nodeValue)) {
      // Space nodes are generated between tags as an artifact of the html source.
      // Ignore these.
      return null;
    }

    const implicitLine = document.createElement('span');
    implicitLine.className = JSED_IMPLICIT_CLASS;
    node.parentNode.insertBefore(implicitLine, node);

    for (let sib: Node | null = node; sib; ) {
      if (sib.nodeType === Node.TEXT_NODE || isPartOfLine(sib)) {
        const nextSib: ChildNode | null = sib.nextSibling;
        implicitLine.appendChild(sib);
        sib = nextSib;
      } else {
        break;
      }
    }
    return implicitLine;
  };
  for (const node of findNextNode(root, root, {
    filter: (node) => node?.nodeType === Node.ELEMENT_NODE,
  })) {
    for (let sib = node.firstChild; sib; ) {
      if (sib.nodeType === Node.TEXT_NODE || isPartOfLine(sib)) {
        const prev = sib.previousSibling;
        if (prev) {
          if (isFocusable(prev) && !isPartOfLine(prev)) {
            const implicitLine = buildImplicitLine(sib);
            if (implicitLine) {
              // An implicit line was created and sucked up continguous text tokens.
              sib = implicitLine.nextSibling;
              continue;
            }
          }
        }
      }
      sib = sib.nextSibling;
    }
  }
}

// #endregion

// #region Operations on tokenized F_ELEM's

/**
 * Get previous contiguous or inline TOKEN (ie get previous token in a LINE).
 */
export function getPreviousSibling(el: HTMLElement): HTMLElement | null {
  const line = getLine(el);
  for (const prev of findPreviousNode(el, line, {
    filter: isPartOfLine,
  })) {
    if (isToken2(prev)) {
      return prev;
    }
  }
  return null;
}

/**
 * Get next contiguous or inline TOKEN (ie get next token in a LINE).
 */
export function getNextSibling(el: HTMLElement): HTMLElement | null {
  const line = getLine(el);
  for (const next of findNextNode(el, line, {
    filter: isPartOfLine,
  })) {
    if (isToken2(next)) {
      return next;
    }
  }
  return null;
}

export function insertAfter(
  toInsert: HTMLElement,
  existing: HTMLElement,
): void {
  if (!existing.parentNode) {
    throw new Error('parentNode not found');
  }
  existing.parentNode.insertBefore(toInsert, existing.nextSibling);
  // const spc = createSpace();
  // existing.parentNode.insertBefore(spc, existing.nextSibling);
  // existing.parentNode.insertBefore(toInsert, spc.nextSibling);
}

/**
 * Assumes `isToken` is true, but checks for weird invalid states that might occur
 */
function validate(token: HTMLElement, allowPlaceholder: boolean = false): void {
  if (!allowPlaceholder && isPlaceholderToken(token)) {
    throw new Error('placeholder tokens not allowed');
  }
  if (allowPlaceholder && isPlaceholderToken(token)) {
    if (token.firstChild?.nodeValue !== '§') {
      throw new Error('placeholder token should be empty');
    }
    return;
  }
  if (!token.firstChild) {
    throw new Error('token has no text');
  }
  if (token.firstChild.nodeType !== Node.TEXT_NODE) {
    throw new Error('first child should be a text node');
  }
}

export function replaceText(token: HTMLElement, val: string): HTMLElement {
  validate(token, true);
  if (isPlaceholderToken(token)) {
    const tok = createToken(val);
    token.replaceWith(tok);
    return tok;
  }
  token.firstChild!.nodeValue = val;
  return token;
}

export function remove(token: HTMLElement) {
  const parentNode = token.parentNode;
  if (!parentNode) {
    throw new Error('remove: token has no parentNode');
  }
  let other = getPreviousSibling(token);
  if (!other) {
    other = getNextSibling(token);
  }
  parentNode.removeChild(token);
  if (other) {
    return other;
  }
  const pholder = createPlaceholderToken();
  parentNode.appendChild(pholder);
  return pholder;
}

export function getValue(token: HTMLElement): string {
  validate(token, true);
  if (isPlaceholderToken(token)) {
    return '';
  }
  return token.firstChild!.nodeValue as string;
}

/**
 * Find the LINE associated with `el`.  Usually `el` should be a text node, TOKEN or inline F_ELEM .  May return `el` itself if not.
 */
export function getLine(el: ChildNode): HTMLElement {
  if (!el) {
    throw new Error(`getLine: element is null`);
  }
  for (let p: ParentNode | ChildNode | null = el; ; p = p?.parentNode) {
    if (!p) {
      throw new Error(`getLine: expected parentNode to exist`);
    }
    if (isFocusable(p)) {
      if (isPartOfLine(p)) {
        continue;
      }
      return p;
    }
  }
  throw new Error(`getLine: end of for-loop`);
}

/**
 * Walks el (an F_ELEM usually) and looks for the first text token we can focus
 * on.  This will tokenize as it recurses down depth-first.
 */
export function getFirstToken(el: HTMLElement): HTMLElement | null {
  if (isToken(el)) {
    return el;
  }
  if (!isFocusable(el)) {
    throw new Error('getFirstToken: expects an F_ELEM');
  }
  const line = getLine(el);
  tokenize(line);
  const sib = getNextSibling(line);
  if (sib) {
    return sib;
  }
  for (const next of findNextNode(line, line, {
    filter: isFocusable,
    ignoreDescendents,
  })) {
    tokenize(next as HTMLElement);
    const sib = getNextSibling(next as HTMLElement);
    if (sib) {
      return sib;
    }
  }
  return null;
}

// #endregion
