/**
 * Place caller-supplied elements relative to a target — the destination half of
 * cut/copy/paste.
 *
 * Each op has a `pasteCopy*` twin that clones first, so the same source can be
 * pasted repeatedly. None of these consult DOM_RULES; the caller decides what is
 * legal to paste where.
 *
 * `copyEmptyNext`/`copyEmptyPrevious` are the "new empty one like this" case:
 * clone the target's shell without its content, and ANCHOR it so it is
 * immediately editable.
 */
import { canCreateWithAnchor } from '../../core/dom-rules.js';
import { isInlineFlow, JSED_FOCUS_CLASS } from '../../core/taxonomy.js';
import { anchorize } from '../anchor.js';

export function pasteBefore(pasted: HTMLElement, before: HTMLElement): HTMLElement | null {
  return before.insertAdjacentElement('beforebegin', pasted) as HTMLElement | null;
}

export function pasteCopyBefore(pasted: HTMLElement, before: HTMLElement): HTMLElement | null {
  const copy = pasted.cloneNode(true) as HTMLElement;
  return before.insertAdjacentElement('beforebegin', copy) as HTMLElement | null;
}

export function pasteAfter(pasted: HTMLElement, after: HTMLElement): HTMLElement | null {
  return after.insertAdjacentElement('afterend', pasted) as HTMLElement | null;
}

export function pasteCopyAfter(pasted: HTMLElement, after: HTMLElement): HTMLElement | null {
  const copy = pasted.cloneNode(true) as HTMLElement;
  return after.insertAdjacentElement('afterend', copy) as HTMLElement | null;
}

export function pasteWithin(pasted: HTMLElement, within: HTMLElement): HTMLElement | null {
  return within.insertAdjacentElement('beforeend', pasted) as HTMLElement | null;
}

export function pasteCopyWithin(pasted: HTMLElement, within: HTMLElement): HTMLElement | null {
  const copy = pasted.cloneNode(true) as HTMLElement;
  return within.insertAdjacentElement('beforeend', copy) as HTMLElement | null;
}

export function copyEmptyNext(target: HTMLElement): HTMLElement | null {
  if (isInlineFlow(target)) {
    // Use cursor ops eg wrap text in em; copying empty after would be weird
    return null;
  }
  const empty = target.cloneNode(false) as HTMLElement;
  empty.classList.remove(JSED_FOCUS_CLASS);
  target.insertAdjacentElement('afterend', empty);
  if (canCreateWithAnchor(empty.tagName)) {
    anchorize(empty);
  }
  return empty;
}

export function copyEmptyPrevious(target: HTMLElement): HTMLElement | null {
  if (isInlineFlow(target)) {
    // Use cursor ops eg wrap text in em; copying empty after would be weird
    return null;
  }
  const empty = target.cloneNode(false) as HTMLElement;
  empty.classList.remove(JSED_FOCUS_CLASS);
  target.insertAdjacentElement('beforebegin', empty);
  if (canCreateWithAnchor(empty.tagName)) {
    anchorize(empty);
  }
  return empty;
}
