import { JSED_ELEMENT_INDICATOR_ANCHOR } from '../core/taxonomy.js';

/** Remove the anchor-name style that the CSS element indicator adds. */
export function removeIndicators(element: HTMLElement): void {
  const anchored = element.querySelectorAll<HTMLElement>('[style*="anchor-name"]');
  for (const child of anchored) {
    if (child.style.getPropertyValue('anchor-name') === JSED_ELEMENT_INDICATOR_ANCHOR) {
      child.style.removeProperty('anchor-name');
      if (!child.getAttribute('style')) {
        child.removeAttribute('style');
      }
    }
  }
}
