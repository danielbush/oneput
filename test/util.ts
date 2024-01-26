import { type JsedDocument, makeDocument } from '../src/app/document';

/**
 * Make a div be the root of the document.
 *
 * It calls loadDoc which is part of the app we're testing but this is a
 * trade-off for convenience.
 */
export function makeRoot(
  html: string,
  document: Document = window.document,
): JsedDocument {
  document.body.innerHTML = `<div id="root">${html}</div>`;
  return makeDocument(document.getElementById('root') as HTMLElement);
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
      throw new Error(
        `Tag ${tagName} is self-closing but was given content: "${content}"`,
      );
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
export const p = makeTag('p');
export const h1 = makeTag('h1');
export const h2 = makeTag('h2');
export const ul = makeTag('ul');
export const li = makeTag('li');
export function frag(...tags: string[]): string {
  return tags.join('');
}
export const script = makeTag('script');
export const input = makeTag('input');
