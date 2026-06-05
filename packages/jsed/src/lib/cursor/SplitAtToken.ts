import { getFirstLineSibling, getLine } from '../core/line';
import type { EditorState } from '../editor/EditorState';
import { anchorize } from '../ops/anchor';
import {
  recSplitAfterChild,
  recSplitBeforeChild,
  redoRecSplit,
  undoRecSplit,
  type RecursiveSplitAfterAction,
  type RecursiveSplitBeforeAction
} from '../ops/focusable';
import { type RemoveToken } from '../ops/token';
import type { UndoRecord } from '../undo';
import type { CursorState } from './CursorState';

type SplitResult = RecursiveSplitBeforeAction | RecursiveSplitAfterAction;

/**
 * Anchor the bottom split point on both sides so each side keeps an ANCHOR
 * where the rules require one. Returns the ANCHOR's that were inserted.
 */
function anchorSplit(result: SplitResult, splitBefore: boolean): HTMLElement[] {
  const anchors: HTMLElement[] = [];
  if (splitBefore) {
    // The original may need an ANCHOR because we could split before the first
    // child.
    anchors.push(...anchorize(result.bottomSplit.parent));
  }
  // We might have an empty INLINE_FLOW peer, so anchor the lowest level.
  anchors.push(...anchorize(result.bottomSplit.peer));
  return anchors;
}

/**
 * Perform SPLIT_BY_TOKEN according to CURSOR_STATE and place the CURSOR on the
 * new peer.
 */
export class SplitAtToken implements UndoRecord {
  static run(state: CursorState) {
    const child = state.getPlace();
    const line = getLine(child); // GOTCHA - always pre-calculate this, don't use in isCeiling below.
    const splitBefore = state.isInsertingBefore() || state.isPrepend();

    const result: SplitResult = splitBefore
      ? recSplitBeforeChild(child, (el) => el === line)
      : recSplitAfterChild(child, (el) => el === line);

    anchorSplit(result, splitBefore);

    // Try to place the cursor on peer.
    const sib = getFirstLineSibling(result.topSplit.peer);
    if (sib) {
      state.place(sib);
    }

    return new SplitAtToken(result, { undo: child }, splitBefore);
  }

  constructor(
    public result: SplitResult,
    public cursorTarget: {
      undo: HTMLElement;
      // We don't set a redo target as it may be an ANCHOR and atm we just remove them here.
    },
    public splitBefore: boolean,
    public removedAnchors: RemoveToken[] = []
  ) {}

  undo(state: EditorState) {
    undoRecSplit(this.result);
    // Effectively anchorizes the original site:
    anchorize(this.result.topSplit.parent);
    state.cursor?.place(this.cursorTarget.undo);
  }

  redo(state: EditorState) {
    redoRecSplit(this.result);
    anchorSplit(this.result, this.splitBefore);
    // Recompute the cursor place which may be an anchor:
    const sib = getFirstLineSibling(this.result.topSplit.peer);
    state.cursor?.place(sib ?? this.cursorTarget.undo);
  }
}
