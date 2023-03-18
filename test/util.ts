import { JSDOM } from 'jsdom';
import { DocumentContext } from '../src/lib/DocumentContext';
import * as load from '../src/lib/load';

/**
 * Make a div be the root of the document.
 *
 * It calls loadDoc which is part of the app we're testing but this is a
 * trade-off for convenience.
 */
export function makeDivRoot(
  html: string,
  document: Document = window.document,
): DocumentContext {
  const root = document.createElement('div');
  root.id = 'root';
  root.innerHTML = html;
  // Clear otherwise old jest test fixtures will hang around:
  document.body.innerHTML = '';
  document.body.appendChild(root);
  return load.loadDoc(root);
}

// const REC_DOWN_KEY = 'j';
// const REC_UP_KEY = 'k';
// const SIB_DOWN_KEY = '{ctrl>}{j}{/ctrl}';
// const SIB_DOWN_KEY = '{ctrl>}j{/ctrl}';
// const SIB_DOWN_KEY = '{ctrl>}{j}{/ctrl}';
// const FE_SIB_DOWN_KEY = {
//   key: 'j',
//   ctrlKey: true,
// };
// const FE_SIB_UP_KEY = {
//   key: 'k',
//   ctrlKey: true,
// };
export const HK_REC_DOWN_KEY = 'j';
export const HK_REC_UP_KEY = 'k';
export const HK_SIB_DOWN_KEY = 'ctrl+j';
export const HK_SIB_UP_KEY = 'ctrl+k';
export const HK_UP_KEY = 'ctrl+cmd+u';
export const UNLOADS: Array<() => void> = [];

export function makeDoc(content: string): string {
  return `<!DOCTYPE html><body id="body">${content}</body>`;
}

/**
 * globalThis.window.HTMLElement etc !== dom.window.HTMLElement (jsdom)
 * https://stackoverflow.com/questions/40449434/mocking-globals-in-jest
 */
export function mockWindow(dom: JSDOM): void {
  const jsdomWindow = dom.window;
  const jsdomDocument = dom.window.document;
  Object.defineProperty(global, 'window', {
    value: jsdomWindow,
    writable: true,
  });
  Object.defineProperty(global, 'document', {
    value: jsdomDocument,
    writable: true,
  });
}

export function unload(): void {
  let fun;
  while ((fun = UNLOADS.pop())) {
    fun();
  }
}

export function loadWithUnload(el: HTMLElement): void {
  // const unload = load(el);
  // UNLOADS.push(unload);
}
