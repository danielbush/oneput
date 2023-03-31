import { JSDOM } from 'jsdom';
import { DocumentContext } from '../src/lib/DocumentContext';
import * as load from '../src/lib/load';

/**
 * Make a div be the root of the document.
 *
 * It calls loadDoc which is part of the app we're testing but this is a
 * trade-off for convenience.
 */
export function makeRoot(
  html: string,
  document: Document = window.document,
): DocumentContext {
  document.body.innerHTML = `<div id="root">${html}</div>`;
  return load.loadDoc(document.getElementById('root') as HTMLElement);
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
 * Convenience to get an id ro fail.
 */
export function byId(cx: DocumentContext, id: string): HTMLElement {
  const el = cx.document.getElementById(id);
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

export function spyOnAllIds(
  cx: DocumentContext,
  params: { focus: (id: string) => void },
): Element[] {
  const ids: string[] = [];
  const els: Element[] = [];
  cx.document.querySelectorAll('[id]').forEach((element) => {
    ids.push(element.id);
    els.push(element);
  });
  els.forEach((el) => spyOnElement(el, { focus: (el) => params.focus(el.id) }));
  return els;
}

function spyOnElement(
  el: Element,
  params: { focus: (el: HTMLElement) => void },
): void {
  if (el instanceof HTMLElement) {
    const focus = el.focus;
    el.focus = () => {
      params.focus(el);
      focus.call(el);
    };
  } else {
    console.warn(
      `${el.outerHTML} is an Element, not an HTMLElement, cannot spy on focus`,
    );
  }
}
