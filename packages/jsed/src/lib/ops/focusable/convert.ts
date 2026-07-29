/**
 * Change an element's tag while keeping its children, or dissolve it entirely.
 *
 * Both preserve the child nodes by identity rather than re-parsing markup, so
 * anything holding a reference to a descendant (FOCUS, CURSOR) survives.
 */
import * as domRules from '../../core/dom-rules.js';

export function unwrap(el: HTMLElement): void {
  el.replaceWith(...Array.from(el.childNodes));
}

export function convert(el: HTMLElement, toTagName: string): HTMLElement {
  const newEl = el.ownerDocument.createElement(toTagName);
  el.before(newEl);
  newEl.append(...Array.from(el.childNodes));
  el.remove();
  return newEl;
}

export function getConversionCandidates(el: HTMLElement | null, root: HTMLElement): string[] {
  if (!el) {
    return [];
  }
  if (!root.contains(el)) {
    return [];
  }
  return domRules.getConversionCandidates(el);
}
