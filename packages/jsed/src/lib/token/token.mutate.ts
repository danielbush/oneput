import {
  getNextVisibleNodeSibling,
  getNextVisibleSibling,
  getPreviousVisibleNodeSibling,
  getPreviousVisibleSibling
} from '../core/sibling.js';
import {
  getInsertionSite,
  restoreAtInsertionSite,
  type InsertionSite
} from '../mutation/InsertionSite.js';
import {
  ensureSeparatorAfter,
  ensureSeparatorBefore,
  getSeparatorAfter,
  getSeparatorBefore
} from './space.js';

export type RemoveTokenPlan = {
  type: 'remove-token';
  token: HTMLElement;
  insertionSite: InsertionSite;
  separatorBefore: Text | null;
  separatorAfter: Text | null;
  previousVisibleSibling: HTMLElement | null;
  nextVisibleSibling: HTMLElement | null;
};

export function planRemove(token: HTMLElement): RemoveTokenPlan {
  if (!token.parentNode) {
    throw new Error('planRemove: token has no parentNode');
  }

  return {
    type: 'remove-token',
    token,
    insertionSite: getInsertionSite(token),
    separatorBefore: getSeparatorBefore(token),
    separatorAfter: getSeparatorAfter(token),
    previousVisibleSibling: getPreviousVisibleSibling(token),
    nextVisibleSibling: getNextVisibleSibling(token)
  };
}

export function executeRemove(plan: RemoveTokenPlan): void {
  plan.token.remove();

  // Separator cleanup remains algorithmic: the plan records the candidate
  // boundary nodes, and execution applies the same spacing rules as remove().
  if (plan.separatorBefore?.parentNode && plan.separatorAfter?.parentNode) {
    plan.separatorAfter.remove();
  }

  if (plan.separatorBefore?.parentNode) {
    if (!getNextVisibleNodeSibling(plan.separatorBefore)) {
      plan.separatorBefore.remove();
    }
    if (plan.separatorBefore.parentNode && !getPreviousVisibleNodeSibling(plan.separatorBefore)) {
      plan.separatorBefore.remove();
    }
  }
}

export function undoRemove(plan: RemoveTokenPlan): void {
  restoreAtInsertionSite(plan.insertionSite, plan.token);

  if (plan.separatorBefore) {
    ensureSeparatorBefore(plan.token, plan.separatorBefore.nodeValue ?? ' ');
  }
  if (plan.separatorAfter) {
    ensureSeparatorAfter(plan.token, plan.separatorAfter.nodeValue ?? ' ');
  }
}
