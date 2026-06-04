import type { EditorState } from '../editor/EditorState.js';
import {
  redoRemoveWrapper,
  removeWrappers,
  undoRemoveWrapper,
  type RemoveWrappers
} from '../ops/selection.js';
import type { UndoRecord } from '../undo/UndoRecorder.js';
import type { CursorSelection } from './CursorSelection.js';
import type { CursorState } from './CursorState.js';

export class DeleteSelection implements UndoRecord {
  static run(selection: CursorSelection, state: CursorState) {
    const seatBefore = state.getPlace();
    const isForward = selection.isForwardDirection();
    const wrappers = state.convertSelection();
    const result = removeWrappers(wrappers);
    if (isForward && result.lastMarker) {
      const seat = state.ops.getNextFrom(result.lastMarker);
      if (seat) {
        state.place(seat);
      }
    } else if (!isForward && result.firstMarker) {
      const seat = state.ops.getPreviousFrom(result.firstMarker);
      if (seat) {
        state.place(seat);
      }
    }
    return new DeleteSelection(
      {
        undo: seatBefore,
        redo: state.getPlace()
      },
      result
    );
  }

  constructor(
    public cursorTarget: {
      undo: HTMLElement;
      redo: HTMLElement;
    },
    public removedWrappers: RemoveWrappers
  ) {}

  undo(state: EditorState) {
    for (const removedWrapper of this.removedWrappers.removedWrappers) {
      undoRemoveWrapper(removedWrapper);
    }
    state.cursor?.place(this.cursorTarget.undo);
  }

  redo(state: EditorState) {
    for (const removedWrapper of this.removedWrappers.removedWrappers) {
      redoRemoveWrapper(removedWrapper);
    }
    state.cursor?.place(this.cursorTarget.redo);
  }
}
