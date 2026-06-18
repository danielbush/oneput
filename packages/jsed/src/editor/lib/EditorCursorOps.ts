import type { EditorState } from './EditorState.js';
import * as space from '../../lib/ops/space.js';

/**
 * Trailing / Leading space (at cursor)
 */
export class EditorCursorOps {
  static create(state: EditorState) {
    return new EditorCursorOps(state);
  }

  constructor(private state: EditorState) {}

  canRemoveSpaceBefore(): boolean {
    return (
      !!this.state.cursor && !!space.getRemovableSpaceBeforeToken(this.state.cursor.getPlace())
    );
  }

  canRemoveSpaceAfter(): boolean {
    return !!this.state.cursor && !!space.getRemovableSpaceAfterToken(this.state.cursor.getPlace());
  }

  canInsertSpaceBefore(): boolean {
    return !!this.state.cursor && space.canInsertSpaceBeforeToken(this.state.cursor.getPlace());
  }

  canInsertSpaceAfter(): boolean {
    return !!this.state.cursor && space.canInsertSpaceAfterToken(this.state.cursor.getPlace());
  }

  insertSpaceBefore(): boolean {
    if (!this.state.cursor) {
      return false;
    }

    const inserted = !!space.insertSpaceBeforeToken(this.state.cursor.getPlace());
    if (inserted) {
      this.state.eventsEmitter.emitTextChange({
        type: 'whitespace-change',
        kind: 'leading-space',
        change: 'inserted'
      });
      return true;
    }
    return false;
  }

  insertSpaceAfter(): boolean {
    if (!this.state.cursor) {
      return false;
    }

    const inserted = !!space.insertSpaceAfterToken(this.state.cursor.getPlace());
    if (inserted) {
      this.state.eventsEmitter.emitTextChange({
        type: 'whitespace-change',
        kind: 'trailing-space',
        change: 'inserted'
      });
      return true;
    }
    return false;
  }

  removeSpaceBefore(): boolean {
    if (!this.state.cursor) {
      return false;
    }

    const removed = !!space.removeSpaceBeforeToken(this.state.cursor.getPlace());
    if (removed) {
      this.state.eventsEmitter.emitTextChange({
        type: 'whitespace-change',
        kind: 'leading-space',
        change: 'removed'
      });
      return true;
    }
    return false;
  }

  removeSpaceAfter(): boolean {
    if (!this.state.cursor) {
      return false;
    }

    const removed = !!space.removeSpaceAfterToken(this.state.cursor.getPlace());
    if (removed) {
      this.state.eventsEmitter.emitTextChange({
        type: 'whitespace-change',
        kind: 'trailing-space',
        change: 'removed'
      });
      return true;
    }
    return false;
  }

  splitAtCursor() {
    if (!this.state.cursor) {
      return false;
    }

    const inserted = this.state.cursor.splitAtToken();
    if (inserted) {
      this.state.eventsEmitter.emitElementChange({
        type: 'focusable-inserted',
        element: inserted.result.topSplit.peer
      });
    }
  }
}
