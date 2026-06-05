import type { EditorState } from '../editor/EditorState';
import {
  convertWrapper,
  redoConvertWrapper,
  undoConvertWrapper,
  type ConvertWrapper
} from '../ops/selection';
import {
  redoWrapLineSiblingWithTag,
  undoWrapLineSiblingWithTag,
  wrapLineSiblingWithTag,
  type WrapLineSibling as WrapLineSiblingOp
} from '../ops/token';
import type { UndoRecord } from '../undo';
import type { CursorState } from './CursorState';

export class Wrap {
  static run(state: CursorState, tagName: string) {
    const selection = state.getSelection();
    if (selection) {
      return WrapSelection.run(state, tagName);
    }
    return WrapLineSibling.run(state, tagName);
  }
}

export class WrapLineSibling implements UndoRecord {
  static run(state: CursorState, tagName: string) {
    const current = state.getPlace();
    const op = wrapLineSiblingWithTag(current, tagName);
    if (!op) {
      return;
    }

    state.eventsEmitter.onElementChange?.({ type: 'focusable-inserted', element: op.wrapper });
    state.place(current);
    return new WrapLineSibling(op);
  }

  constructor(public op: WrapLineSiblingOp) {}

  undo(state: EditorState) {
    undoWrapLineSiblingWithTag(this.op);
    state.cursor?.place(this.op.lineSibling);
  }

  redo(state: EditorState) {
    redoWrapLineSiblingWithTag(this.op);
    state.cursor?.place(this.op.lineSibling);
  }
}

export class WrapSelection implements UndoRecord {
  static run(state: CursorState, tagName: string) {
    if (!state.ops.canWrap) {
      return;
    }
    if (!state.selection) {
      return;
    }

    const front = state.selection?.getFront();
    const wrappers = state.convertSelection();
    if (wrappers.length === 0) {
      return;
    }
    const converted = wrappers.map((wrapper) => convertWrapper(wrapper, tagName));
    state.reload();

    return new WrapSelection(front, converted);
  }

  constructor(
    public cursorTarget: HTMLElement,
    public converted: ConvertWrapper[]
  ) {}

  undo(state: EditorState) {
    for (const c of this.converted) {
      undoConvertWrapper(c);
    }
    state.cursor?.place(this.cursorTarget);
  }

  redo(state: EditorState) {
    for (const c of this.converted) {
      redoConvertWrapper(c);
    }
    state.cursor?.place(this.cursorTarget);
  }
}
