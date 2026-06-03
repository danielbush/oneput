import { JSED_SELECTION_CLASS } from '../core/taxonomy.js';
import { isToken } from '../core/taxonomy';
import { containsOnly, deleteHighestEmpty } from '../ops/focusable';
import { remove, type RemoveTokenAll } from '../ops/token';

/**
 * Does `el` contain any SELECTION_WRAPPER? Used by the detokenizer's
 * keep-alive predicate so LINEs hosting an active selection are not
 * detokenized underneath CursorSelection's references.
 *
 * Lives here for now but may move if it grows a wider audience.
 */
export function containsSelection(el: HTMLElement): boolean {
  return el.querySelector(`.${JSED_SELECTION_CLASS}`) !== null;
}

export function unwrap(wrapper: HTMLElement): void {
  wrapper.replaceWith(...Array.from(wrapper.childNodes));
}

/**
 * Perform remove on all LINE_SIBLING content in `wrapper`.
 */
export function removeWrapper(wrapper: HTMLElement, ceiling?: HTMLElement) {
  const children = wrapper.childNodes;
  const removedTokens: RemoveTokenAll[] = [];
  for (const child of children) {
    if (isToken(child)) {
      // Whitespace should be handled by token `remove`.
      removedTokens.push(remove(child as HTMLElement, false));
    }
  }
  const deleteHighest =
    wrapper.parentElement &&
    containsOnly(wrapper.parentElement, wrapper) &&
    deleteHighestEmpty(wrapper.parentElement, ceiling, wrapper);

  unwrap(wrapper);

  return {
    action: 'remove-wrapper',
    deleteHighest,
    removedTokens
  };
}
