import {
  JSED_ELEMENT_INDICATOR_ANCHOR,
  JSED_FOCUS_CLASS,
  JSED_FOCUS_SIBLING,
  JSED_IGNORE_CLASS
} from '../core/taxonomy';

/**
 * Most editing artifacts (like deleted tokens or delete placeholdres) are
 * flagged with jsed-ignore.  So we'll just remove these.
 *
 * Other dangling things we might want to consider: jsed-selection
 */
export function removeIgnored(el: HTMLElement) {
  const ignores = el.querySelectorAll(`.${JSED_IGNORE_CLASS}`);
  for (const i of ignores) {
    i.remove();
  }
}

/**
 * Remove the focus and element-indicator markers that editing adds to author
 * elements, leaving the element and its own classes and styles intact.
 *
 * Strips the jsed-focus and jsed-focus-sibling classes and the anchor-name
 * style the CSS element indicator sets on the focused element.
 */
export function removeEditingMarkers(el: HTMLElement) {
  const focused = el.querySelectorAll(`.${JSED_FOCUS_CLASS}, .${JSED_FOCUS_SIBLING}`);
  for (const element of focused) {
    element.classList.remove(JSED_FOCUS_CLASS, JSED_FOCUS_SIBLING);
    if (element.classList.length === 0) {
      element.removeAttribute('class');
    }
  }

  const anchored = el.querySelectorAll<HTMLElement>('[style*="anchor-name"]');
  for (const element of anchored) {
    if (element.style.getPropertyValue('anchor-name') === JSED_ELEMENT_INDICATOR_ANCHOR) {
      element.style.removeProperty('anchor-name');
      if (!element.getAttribute('style')) {
        element.removeAttribute('style');
      }
    }
  }
}
