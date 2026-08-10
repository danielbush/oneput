/**
 * Map {@link Nav.getAncestors} into the view model {@link navCrumbsInner} needs.
 *
 * Input order is FOCUS-first (as Nav returns). Output is root-first for the trail.
 */

import { isFocusable } from '../../../lib/core/taxonomy.js';

export type FocusAncestorStep = {
  element: HTMLElement;
  tag: string;
  id?: string;
  focusable: boolean;
  /** True for the current FOCUS (last step when a path exists). */
  current: boolean;
};

/**
 * @param ancestors FOCUS-first chain from {@link Nav.getAncestors}.
 * @returns Root-first steps for the nav-crumbs trail.
 */
export function focusAncestorPath(ancestors: HTMLElement[]): FocusAncestorStep[] {
  if (ancestors.length === 0) {
    return [];
  }

  const focus = ancestors[0];
  return [...ancestors].reverse().map((element) => ({
    element,
    tag: element.tagName.toLowerCase(),
    id: element.id || undefined,
    focusable: isFocusable(element),
    current: element === focus
  }));
}
