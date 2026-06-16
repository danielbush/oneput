import { JsedDocument } from '../JsedDocument.js';
import type { ViewportScrollerNullOptions } from '../ui/lib/ViewportScroller.js';
import * as token from '../lib/ops/token.js';
import {
  isAnchor,
  isDeletedAnchor,
  isDeletedElement,
  isDeletedSpace,
  isDeletedToken,
  isImplicitLine,
  isIsland,
  isSelectionWrapper,
  isToken,
  JSED_ANCHOR_CLASS,
  JSED_DELETED_CLASS,
  JSED_ELEMENT_INDICATOR,
  JSED_IGNORE_CLASS,
  JSED_SELECTION_CLASS,
  JSED_TOKEN_CLASS
} from '../lib/core/taxonomy.js';

/**
 * Build a parent with arbitrary children directly — sidesteps `makeRoot`'s
 * load-time transforms (e.g. implicit-line wrapping)
 */
export function buildParent(...children: Node[]): HTMLElement {
  const parent = document.createElement('div');
  parent.append(...children);
  return parent;
}

/**
 * Make a div be the root of the document.
 *
 * It calls loadDoc which is part of the app we're testing but this is a
 * trade-off for convenience.
 */
export function makeRoot(
  html: string,
  opts?: { viewportScrollerOpts?: ViewportScrollerNullOptions; anchorize?: boolean }
): JsedDocument {
  document.body.innerHTML = `<div id="root">${html}</div>`;
  return JsedDocument.createNull(document.getElementById('root') as HTMLElement, {
    viewportScrollerOpts: opts?.viewportScrollerOpts,
    // TODO: Added anchorization of whole documnent late, and a lot of tests
    // fail.  So default to false.  We can enable progressively in tests and
    // update.
    anchorize: opts?.anchorize ?? false
  });
}

type Attr = { [key: string]: string };
const SELF_CLOSING = new Set(['input']);

function tag(tagName: string, attr: Attr, ...children: string[]): string {
  const attrStr = Object.entries(attr)
    .map(([key, val]) => `${key}="${val}"`)
    .join(' ');
  const content = children.join('');
  if (SELF_CLOSING.has(tagName)) {
    if (children.length > 0) {
      throw new Error(`Tag ${tagName} is self-closing but was given content: "${content}"`);
    }
    return `<${tagName} ${attrStr} />`;
  }
  return `<${tagName} ${attrStr}>${content}</${tagName}>`;
}

function makeTag(tagName: string) {
  return (first?: Attr | string, ...rest: string[]) => {
    if (!first) {
      return tag(tagName, {});
    }
    if (typeof first === 'string') {
      return tag(tagName, {}, ...[first].concat(rest));
    }
    return tag(tagName, first, ...rest);
  };
}

/**
 * Convenience to get an id or fail.
 */
export function byId(doc: JsedDocument, id: string): HTMLElement {
  const el = doc.document.getElementById(id);
  if (!el) {
    throw new Error(`byId: could not find id="${id}"`);
  }
  return el;
}

export const div = makeTag('div');
export const em = makeTag('em');
export const p = makeTag('p');
export const h1 = makeTag('h1');
export const h2 = makeTag('h2');
export const ul = makeTag('ul');
export const li = makeTag('li');
export function frag(...tags: string[]): string {
  return tags.join('');
}
export const span = makeTag('span');
export const strong = makeTag('strong');
export const section = makeTag('section');
export const script = makeTag('script');
export const input = makeTag('input');

/**
 * Create a TOKEN fixture.
 */
export function t(text: string, { deleted }: { deleted: boolean } = { deleted: false }): string {
  return span(
    {
      class: deleted
        ? `${JSED_TOKEN_CLASS} ${JSED_DELETED_CLASS} ${JSED_IGNORE_CLASS}`
        : JSED_TOKEN_CLASS
    },
    text
  );
}

/**
 * Create a text-node fixture.
 */
export function s(text = ' '): string {
  return text;
}

/**
 * Create an ANCHOR fixture. ANCHOR's are empty TOKEN's.
 */
export function a(): string {
  return span({ class: `${JSED_TOKEN_CLASS} ${JSED_ANCHOR_CLASS}` }, '');
}

/**
 * Create a SELECTION_WRAPPER fixture around a contiguous run of
 * LINE_SIBLING's — mirrors what `CursorSelection` inserts, so a test can
 * declare the wrapped state directly instead of driving a real selection.
 */
export function sel(...children: string[]): string {
  return span({ class: JSED_SELECTION_CLASS }, ...children);
}

/** Get a human-readable identifier for a LINE_SIBLING (TOKEN or non-TOKEN). */
export function identify(el: Node | undefined | null): string {
  if (!el) return `${el}`;
  if (isImplicitLine(el)) return `[implicit-line]`;
  if (isSelectionWrapper(el)) return `[selection]`;
  if (isDeletedSpace(el)) return `[deleted-space]`;
  if (isDeletedToken(el)) return `d("${token.getValue(el)}")`;
  if (isDeletedAnchor(el)) return `[deleted-anchor]`;
  if (isDeletedElement(el)) return `[deleted-element]`;
  if (isAnchor(el)) return '[anchor]';
  if (isToken(el)) return token.getValue(el);
  if (isIsland(el)) return `[island:${(el as HTMLElement).tagName.toLowerCase()}]`;
  if (el instanceof Element) {
    if (el.classList.contains(JSED_ELEMENT_INDICATOR)) {
      return '[element-indicator]';
    }
    const id = el.id;
    return `[element:${el.tagName.toLowerCase()}${id ? '#' + id : ''}]`;
  }
  return `[nodeType=${el.nodeType}:"${el.nodeValue}"]`;
}

export function identifyChildren(node: Node | undefined | null): string[] {
  if (!node) return [];
  return Array.from(node.childNodes).map((node) => identify(node));
}

/**
 * See INLINE_COMPUTED_STYLE
 */
export const inlineStyleHackVal = 'display:inline;';
/**
 * See INLINE_COMPUTED_STYLE
 */
export const inlineStyleHack = { style: inlineStyleHackVal };

export function findTokenByText(root: HTMLElement, text: string): HTMLElement {
  const tok = Array.from(root.querySelectorAll('.jsed-token')).find(
    (el) => el.textContent === text
  ) as HTMLElement | undefined;
  if (!tok) throw new Error(`token with text "${text}" not found`);
  return tok;
}

export function makeRawRoot(html: string): HTMLElement {
  document.body.innerHTML = `<div id="root">${html}</div>`;
  return document.getElementById('root') as HTMLElement;
}

export function rawById(root: HTMLElement, id: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(`#${id}`);
  if (!el) throw new Error(`rawById: could not find id="${id}"`);
  return el;
}
