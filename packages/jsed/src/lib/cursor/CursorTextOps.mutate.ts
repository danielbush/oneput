import * as token from '../token/token.js';
import {
  executeDeleteHighestEmptySubtree,
  planDeleteHighestEmptySubtree,
  undoDeleteHighestEmptySubtree
} from '../focus/focusable.mutate';
import type { UserInputOpts } from '../input/UserInput';
import { executeRemove, planRemove, undoRemove } from '../token/token.mutate';
import type { CursorState } from './CursorState';
import type { CursorDeleteOpts, CursorDeletePlan } from './CursorTextOps';

export function planDelete(
  state: CursorState,
  { type }: CursorDeleteOpts = { type: 'tokenDeletion' }
): CursorDeletePlan {
  if (!state.isOnToken()) {
    return { type: 'delete-noop', undoable: false };
  }

  const current = state.getPlace();
  const prevCrs = state.motion.getPrevious();
  const nextCrs = state.motion.getNext();
  const parentElement = current.parentElement as HTMLElement;
  const inputCursorPosition = type === 'tokenDeletion' || !prevCrs ? 'selectAll' : 'end';
  // (1) We have plan that will remove current.
  const removePlan = planRemove(current);
  // (2) We can compute based on this plan to remove the parent.
  const removeParent = !removePlan.previousVisibleSibling && !removePlan.nextVisibleSibling;
  // (3) Calculate how high we can delete parent's ancestors (assuming parent is
  // removed).
  const deleteHighestEmptySubtreePlan = removeParent
    ? planDeleteHighestEmptySubtree(parentElement, state.document.root)
    : null;

  return {
    type: 'delete',
    undoable: true,
    deletionType: type,
    current,
    prevCrs,
    nextCrs,
    parentElement,
    removePlan,
    removeParent,
    deleteHighestEmptySubtreePlan,
    inputCursorPosition
  };
}

export function executeDelete(state: CursorState, plan: CursorDeletePlan): void {
  if (plan.type === 'delete-noop') {
    return;
  }

  executeRemove(plan.removePlan);
  const prevSibling = plan.removePlan.previousVisibleSibling;
  const nextSibling = plan.removePlan.nextVisibleSibling;
  const userInputOpts: UserInputOpts = { inputCursorPosition: plan.inputCursorPosition };

  if (!plan.prevCrs && !plan.nextCrs) {
    const anchor = token.createAnchor();
    if (prevSibling) {
      token.insertAfter(anchor, prevSibling);
    } else if (nextSibling) {
      token.insertBefore(anchor, nextSibling);
    } else {
      token.append(anchor, plan.parentElement);
    }
    state.place(anchor, userInputOpts);
    return;
  }

  if (plan.deleteHighestEmptySubtreePlan) {
    executeDeleteHighestEmptySubtree(plan.deleteHighestEmptySubtreePlan);
  }

  state.place((plan.prevCrs || plan.nextCrs) as HTMLElement, userInputOpts);
}

export function undoDelete(state: CursorState, plan: CursorDeletePlan): void {
  if (plan.type === 'delete-noop') {
    return;
  }

  undoDeleteHighestEmptySubtree(plan.deleteHighestEmptySubtreePlan);
  undoRemove(plan.removePlan);

  state.place(plan.current, { inputCursorPosition: 'selectAll' });
}
