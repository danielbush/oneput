import { isAlreadyFocusable } from './focus';
import { walk } from './walk';

/**
 * Make an element focusable if it is not innately focusable.
 */
function tab(TABS: Set<HTMLElement>, el: HTMLElement) {
  if (!isAlreadyFocusable(TABS, el)) {
    TABS.add(el);
    el.setAttribute('tabindex', '0');
  }
}

/**
 * Make all focusable elements focusable.
 *
 * This can be used to initialize a document (TABS would be an empty set).  But
 * it can be used to recurse through any subtree.
 */
export function tabrec(TABS: Set<HTMLElement>, root: HTMLElement): void {
  tab(TABS, root);
  walk(root, (el) => {
    tab(TABS, el);
  });
}

/**
 * Remove all tabs
 */
export function untab(TABS: Set<HTMLElement>): void {
  for (const el of TABS) {
    el.removeAttribute('tabindex');
  }
}

export function serialize(TABS: Set<HTMLElement>, root: HTMLElement): string {
  if (TABS.has(root)) {
    root.removeAttribute('tabindex');
  }
  walk(root, (el) => {
    if (TABS.has(el)) {
      el.removeAttribute('tabindex');
    }
  });
  return root.outerHTML;
}
