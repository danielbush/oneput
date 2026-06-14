import { isAnchor } from '../core/taxonomy';
import type { EditorState } from '../editor/EditorState';
import type { UserInputOpts } from '../input/UserInput';
import {
  type DeleteElement,
  isEmpty,
  deleteHighestEmpty,
  undoDeleteElement,
  redoDeleteElement
} from '../ops/focusable';
import * as token from '../ops/token';
import type { UndoRecord } from '../undo';
import type { CursorState } from './CursorState';
import type { CursorDeleteOpts } from './CursorTextOps';
import { DeleteSelection } from './DeleteSelection';

export class DeleteAtCursor implements UndoRecord {
  static run(state: CursorState, { type }: CursorDeleteOpts = { type: 'tokenDeletion' }) {
    if (state.selection) {
      return DeleteSelection.run(state.selection, state);
    }

    if (!state.isOnToken()) return;

    const current = state.getPlace();
    const currIsAnchor = isAnchor(current);
    const prevCrs = state.ops.getPrevious();
    const nextCrs = state.ops.getNext();
    let anchor: HTMLElement | null = null;

    // !prevCrs = we hit the beginning of all editable text
    // Go into selectAll mode rather than keeping a caret.
    const userInputOpts: UserInputOpts = {
      inputCursorPosition: type === 'tokenDeletion' || !prevCrs ? 'selectAll' : 'end'
    };

    // Delete if not an ANCHOR.
    if (!currIsAnchor) {
      const result = token.remove(current);
      if (result.action === 'anchorize-token') {
        anchor = result.anchor;
        state.place(anchor, userInputOpts);
        return new DeleteAtCursor(
          { undo: current, redo: anchor }, //
          result,
          undefined,
          undefined
        );
      } else {
        // By definition because token.remove didn't anchorize, there is another
        // LINE_SIBLING in the LINE_SEGMENT.  nextCrs/prevCrs don't care about
        // the LINE_SEGMENT but they should pick up this LINE_SIBLING at the
        // very least.
        const place = (prevCrs || nextCrs) as HTMLElement;
        state.place(place, userInputOpts);
        return new DeleteAtCursor(
          { undo: current, redo: place }, //
          undefined,
          undefined,
          result
        );
      }
    }

    // We're trying to delete at an ANCHOR...
    if (!current.parentElement) {
      // TODO: Editor will have to handle this gracefully.
      throw new Error('deleting LINE_SIBLING that is disconnected');
    }

    const noMoreLineSiblings = !prevCrs && !nextCrs;
    const emptyParent = isEmpty(current.parentElement);

    // Delete tag around ANCHOR + possibly its ancestors...
    const canDeleteAncestors = currIsAnchor && emptyParent && !noMoreLineSiblings;
    if (canDeleteAncestors) {
      const op = deleteHighestEmpty(current.parentElement, state.document.root);
      state.place((prevCrs || nextCrs) as HTMLElement, userInputOpts);
      return new DeleteAtCursor(
        { undo: current, redo: (prevCrs || nextCrs) as HTMLElement }, //
        undefined,
        op,
        undefined
      );
    }

    /**
     * Move the cursor if we can.
     * ...<em>...</em>[A]</p> => ...<em>...[T]</em>A</p>
     * etc
     */
    // TODO: prefer to not move the anchor at the moment.
    // state.place(prevCrs || nextCrs || current, userInputOpts);
    return;
  }

  constructor(
    public cursorTarget: {
      undo: HTMLElement;
      redo: HTMLElement;
    },
    public anchorizeToken?: token.AnchorizeToken,
    public deleteHighestElement?: DeleteElement,
    public removeToken?: token.RemoveToken
  ) {}

  undo(state: EditorState) {
    if (this.anchorizeToken) {
      token.undoRemove(this.anchorizeToken);
    }
    if (this.deleteHighestElement) {
      undoDeleteElement(this.deleteHighestElement);
    }
    if (this.removeToken) {
      token.undoRemove(this.removeToken);
    }
    state.cursor?.place(this.cursorTarget.undo);
  }

  redo(state: EditorState) {
    if (this.anchorizeToken) {
      token.redoRemove(this.anchorizeToken);
    }
    if (this.deleteHighestElement) {
      redoDeleteElement(this.deleteHighestElement);
    }
    if (this.removeToken) {
      token.redoRemove(this.removeToken);
    }
    state.cursor?.place(this.cursorTarget.redo);
  }
}
