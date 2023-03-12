import { DocumentContext } from './document';
import { walk } from './walk';

/**
 * Make all focusable elements focusable.
 *
 * This is used to initialize the document.  But it can be used to recurse
 * through any subtree.
 */
export function tabrec(TABS: DocumentContext['TABS'], root: HTMLElement): void {
  TABS.add(root);
  root.setAttribute('tabindex', '0');
  walk(root, (el) => {
    TABS.add(el);
    el.setAttribute('tabindex', '0');
  });
}

export function serialize(
  TABS: DocumentContext['TABS'],
  root: HTMLElement,
): string {
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
