import { DocumentContext } from './document';
import { walk } from './walk';

function isFocusable(element: Element) {
  if (
    (element.hasAttribute('tabindex') && element.getAttribute('tabindex')) ??
    -2 >= 0
  ) {
    return true;
  }
  if (
    [
      'input',
      'select',
      'textarea',
      'button',
      'optgroup',
      'option',
      'fieldset',
      'label',
    ].indexOf(element.tagName.toLowerCase()) !== -1
  ) {
    return true;
  }
  if (
    element.hasAttribute('contenteditable') &&
    element.getAttribute('contenteditable') === 'true'
  ) {
    return true;
  }
  if (
    element.hasAttribute('tabindex') &&
    element.getAttribute('tabindex') === '-1'
  ) {
    return true;
  }
  return false;
}

/**
 * Make an element focusable if it is not innately focusable.
 */
function tab(TABS: DocumentContext['TABS'], el: HTMLElement) {
  if (!isFocusable(el)) {
    TABS.add(el);
    el.setAttribute('tabindex', '0');
  }
}

/**
 * Make all focusable elements focusable.
 *
 * This is used to initialize the document.  But it can be used to recurse
 * through any subtree.
 */
export function tabrec(TABS: DocumentContext['TABS'], root: HTMLElement): void {
  tab(TABS, root);
  walk(root, (el) => {
    tab(TABS, el);
  });
}

/**
 * Remove all tabs
 */
export function untab(TABS: DocumentContext['TABS']): void {
  for (const el of TABS) {
    el.removeAttribute('tabindex');
  }
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
