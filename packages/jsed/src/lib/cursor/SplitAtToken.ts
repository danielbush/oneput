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

    const anchors = anchorSplit(result, splitBefore);

    // Try to place the cursor on peer.
    const sib = getFirstLineSibling(result.topSplit.peer);
    if (sib) {
      state.place(sib);
    }

    return new SplitAtToken(result, { undo: child, redo: sib ?? child }, splitBefore, anchors);
  }

  constructor(
    public result: SplitResult,
    public cursorTarget: {
      undo: HTMLElement;
      redo: HTMLElement;
    },
    public splitBefore: boolean,
    public anchors: HTMLElement[]
  ) {}

  undo(state: EditorState) {
    for (const anchor of this.anchors) {
      anchor.remove();
    }
    undoRecSplit(this.result);
    state.cursor?.place(this.cursorTarget.undo);
  }

  redo(state: EditorState) {
    redoRecSplit(this.result);
    this.anchors = anchorSplit(this.result, this.splitBefore);
    state.cursor?.place(this.cursorTarget.redo);
  }
}
