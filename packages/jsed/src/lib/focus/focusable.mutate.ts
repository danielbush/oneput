import { getNextVisibleNodeSibling, getPreviousVisibleNodeSibling } from '../core/sibling.js';
import {
  getInsertionSite,
  restoreAtInsertionSite,
  type InsertionSite
} from '../mutation/InsertionSite.js';

export type DeleteHighestEmptySubtreePlan = {
  type: 'delete-highest-empty-subtree';
  highest: Element | null;
  insertionSite: InsertionSite | null;
};

/**
 * Calculate how high we can delete el's ancestors assuming el is removed and
 * the ancestors are otherwise empty.
 */
export function planDeleteHighestEmptySubtree(
  el: Element | null,
  ceiling?: Element
): DeleteHighestEmptySubtreePlan {
  if (!el) {
    return { type: 'delete-highest-empty-subtree', highest: null, insertionSite: null };
  }

  let highest: Element = el;

  for (let parent = el.parentElement; parent && parent !== ceiling; parent = parent.parentElement) {
    const wouldBeEmptyWithoutHighest =
      !getPreviousVisibleNodeSibling(highest) && !getNextVisibleNodeSibling(highest);

    if (!wouldBeEmptyWithoutHighest) {
      break;
    }
    highest = parent;
  }

  return {
    type: 'delete-highest-empty-subtree',
    highest,
    insertionSite: getInsertionSite(highest)
  };
}

export function executeDeleteHighestEmptySubtree(plan: DeleteHighestEmptySubtreePlan): void {
  plan.highest?.remove();
}

export function undoDeleteHighestEmptySubtree(plan: DeleteHighestEmptySubtreePlan | null): void {
  if (!plan?.highest || !plan.insertionSite) {
    return;
  }

  restoreAtInsertionSite(plan.insertionSite, plan.highest);
}
