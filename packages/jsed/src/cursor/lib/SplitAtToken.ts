import { getFirstLineSibling, getLine } from '../../lib/core/line.js';
import type { EditorState } from '../../editor/index.js';
import { normalize } from '../../lib/ops/normalize.js';
import {
  recSplitAfterChild,
  recSplitBeforeChild,
  redoRecSplit,
  undoRecSplit,
  type RecursiveSplitAfterAction,
  type RecursiveSplitBeforeAction
} from '../../lib/ops/focusable.js';
import { type RemoveToken } from '../../lib/ops/token.js';
import type { UndoRecord } from '../../undo/index.js';
import type { CursorState } from './CursorState.js';

type SplitResult = RecursiveSplitBeforeAction | RecursiveSplitAfterAction;

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

    const record = new SplitAtToken(result, { undo: child }, splitBefore);
    record.normalize();

    // Try to place the cursor on peer.
    const sib = getFirstLineSibling(result.topSplit.peer);
    if (sib) {
      state.place(sib);
    }

    return record;
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

  /**
   * Re-assert derived structure at the two sides of the split site (do/redo
   * direction). `normalize` is idempotent.
   */
  private normalize() {
    if (this.splitBefore) {
      // The original may need an ANCHOR because we could split before the first
      // child.
      normalize(this.result.bottomSplit.parent);
    }
    // We might have an empty INLINE_FLOW peer, so normalize the lowest level.
    normalize(this.result.bottomSplit.peer);
  }

  /**
   * Re-assert derived structure after the split is collapsed back into one site
   * (undo direction).
   */
  private normalizeUndo() {
    normalize(this.result.topSplit.parent);
  }

  undo(state: EditorState) {
    undoRecSplit(this.result);
    this.normalizeUndo();
    state.cursor?.place(this.cursorTarget.undo);
  }

  redo(state: EditorState) {
    redoRecSplit(this.result);
    this.normalize();
    // Recompute the cursor place which may be an anchor:
    const sib = getFirstLineSibling(this.result.topSplit.peer);
    state.cursor?.place(sib ?? this.cursorTarget.undo);
  }
}
