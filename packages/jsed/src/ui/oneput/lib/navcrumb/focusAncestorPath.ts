/**
 * Map a FOCUS chain into the view model {@link navCrumbsInner} needs.
 *
 * Input order is mark-first / FOCUS-first (as Nav returns). Output is
 * root-first for the trail. `current` marks the live FOCUS, which may sit
 * mid-chain when CURRENT_MARK is below FOCUS.
 */

import { isFocusable } from '../../../../lib/core/taxonomy.js';

export type FocusAncestorStep = {
  element: HTMLElement;
  tag: string;
  id?: string;
  focusable: boolean;
  /** True for the live FOCUS (may be mid-trail when the chain remembers below). */
  current: boolean;
};

/**
 * Return breadcrumb-list path of FOCUS to doc root.
 *
 * @param chain Mark-first (or FOCUS-first) chain from {@link Nav.getChain}.
 * @param focus Live FOCUS; used to set `current` on the matching step.
 * @returns Root-first steps for the nav-crumbs trail.
 */
export function focusAncestorPath(
  chain: HTMLElement[],
  focus: HTMLElement | null
): FocusAncestorStep[] {
  if (chain.length === 0) {
    return [];
  }

  return [...chain].map((element) => ({
    element,
    tag: element.tagName.toLowerCase(),
    id: element.id || undefined,
    focusable: isFocusable(element),
    current: focus != null && element === focus
  }));
}
