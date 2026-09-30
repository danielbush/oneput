import { JSED_FOCUS_CLASS, JSED_FOCUS_SIBLING } from '../core/taxonomy.js';

/** Add the active FOCUS marker to an element. */
export function addFocus(element: HTMLElement): void {
  element.classList.add(JSED_FOCUS_CLASS);
}

/** Remove the active FOCUS marker from an element. */
export function removeFocus(element: HTMLElement): void {
  element.classList.remove(JSED_FOCUS_CLASS);
}

/** Add the sibling FOCUS marker to an element. */
export function addFocusSibling(element: HTMLElement): void {
  element.classList.add(JSED_FOCUS_SIBLING);
}

/** Remove the sibling FOCUS marker from an element. */
export function removeSiblingFocus(element: HTMLElement): void {
  element.classList.remove(JSED_FOCUS_SIBLING);
}

/** Remove FOCUS markers from all descendants of an element. */
export function removeFocusAll(element: HTMLElement): void {
  const focused = element.querySelectorAll<HTMLElement>(
    `.${JSED_FOCUS_CLASS}, .${JSED_FOCUS_SIBLING}`
  );
  for (const child of focused) {
    removeFocus(child);
    removeSiblingFocus(child);
    if (child.classList.length === 0) {
      child.removeAttribute('class');
    }
  }
}
