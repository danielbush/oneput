import type { JsedDocument } from '../../types.js';
import { PHRASING_CONTENT } from './dom-rules/html-content.js';

export { getAllowableChildTags } from './dom-rules/html-content.js';
export type { ElementInsertOption, ElementSpec } from './dom-rules/element-templates.js';
export {
  getAllowableChildOptions,
  getAllowableInsertAfterTags,
  getAllowableInsertAfterOptions,
  getAllowableInsertBeforeTags,
  getAllowableInsertBeforeOptions
} from './dom-rules/insert-rules.js';

/**
 * Return true if newly created tagName should have an ANCHOR.
 */
export function canCreateWithAnchor(tagName: string): boolean {
  tagName = tagName.toLowerCase();
  if (PHRASING_CONTENT.includes(tagName)) {
    return true;
  }
  if (['p', 'li', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
    return true;
  }
  return false;
}

export function canDelete(el: HTMLElement, doc: JsedDocument): boolean {
  if (el === doc.root) {
    return false;
  }
  if (el === doc.document.body) {
    return false;
  }
  if (el.contains(doc.document.body)) {
    return false;
  }
  return true;
}

export function getConversionCandidates(_el: HTMLElement): string[] {
  return ['p', 'div', 'section'];
}

/**
 * Every tag the CURSOR or a SELECTION can be wrapped with. The menu offers
 * these; {@link canWrapWith} is the same rule as a predicate.
 */
export function getWrapCandidates(): string[] {
  return [...PHRASING_CONTENT];
}

/**
 * Is `tagName` a legal wrapper for LINE_SIBLING's?
 *
 * We only ever wrap TOKEN's and INLINE_OPAQUE's, and those already sit in a
 * phrasing context — so any inline tag is legal wherever they are. The wrap
 * rule reduces to the tag alone; the surrounding DOM never has to be consulted.
 */
export function canWrapWith(tagName: string): boolean {
  return PHRASING_CONTENT.includes(tagName.toLowerCase());
}
