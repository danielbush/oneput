import { JsedDocument } from '../JsedDocument.js';
import { JSED_ANCHOR_CLASS, JSED_TOKEN_CLASS } from '../lib/constants.js';
import type { ViewportScrollerNullOptions } from '../lib/ViewportScroller.js';
import * as token from '../lib/token.js';
import { isAnchor, isIsland, isToken } from '../lib/taxonomy.js';

/**
 * Make a div be the root of the document.
 *
 * It calls loadDoc which is part of the app we're testing but this is a
 * trade-off for convenience.
 */
export function makeRoot(
  html: string,
  opts?: { viewportScrollerOpts?: ViewportScrollerNullOptions }
): JsedDocument {
  document.body.innerHTML = `<div id="root">${html}</div>`;
  return JsedDocument.createNull(document.getElementById('root') as HTMLElement, opts);
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
export function t(text: string): string {
  return span({ class: JSED_TOKEN_CLASS }, text);
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

/** Get a human-readable identifier for a LINE_SIBLING (TOKEN or non-TOKEN). */
export function identify(el: Node): string {
  if (isAnchor(el)) return '[anchor]';
  if (isToken(el)) return token.getValue(el as HTMLElement);
  if (isIsland(el)) return `[island:${(el as HTMLElement).tagName.toLowerCase()}]`;
  if (el.nodeType === el.ELEMENT_NODE) {
    return `[${(el as HTMLElement).tagName.toLowerCase()}]`;
  }
  return `[nodeType=${el.nodeType}:{el.nodeValue}]`;
}

/**
 * See INLINE_COMPUTED_STYLE
 */
export const inlineStyleHackVal = 'display:inline;';
/**
 * See INLINE_COMPUTED_STYLE
 */
export const inlineStyleHack = { style: inlineStyleHackVal };
