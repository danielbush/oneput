import { JSED_IGNORE_CLASS } from '../core/taxonomy.js';

/** Remove ignored elements from all descendants of an element. */
export function removeIgnored(element: HTMLElement): void {
  const ignored = element.querySelectorAll(`.${JSED_IGNORE_CLASS}`);
  for (const child of ignored) {
    child.remove();
  }
}
