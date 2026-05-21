import type { EditorState } from './EditorState.js';
import * as token from '../token/token.js';
import * as space from '../token/space.js';
import { isLineSibling } from '../core/taxonomy.js';
import { getWrapCandidates } from '../core/dom-rules.js';

/**
 * Trailing / Leading space (at cursor)
 */
export class EditorCursorOps {
  static create(state: EditorState) {
    return new EditorCursorOps(state);
  }

  constructor(private state: EditorState) {}

  canWrap(): boolean {
    return (
      this.state.mode === 'edit' &&
      !!this.state.cursor &&
      isLineSibling(this.state.cursor.getPlace())
    );
  }

  getWrapCandidates(): string[] {
    return getWrapCandidates();
  }

  /**
   * Wrap token at CURSOR in a tag.
   */
  wrap(tagName: string): boolean {
    if (this.state.mode !== 'edit' || !this.state.cursor) {
      return false;
    }

    if (this.state.selection) {
      const anchor = this.state.selection.getAnchor();
      const wrappers = this.state.selection.wrapWithTag(tagName);
      if (!wrappers) {
        return false;
      }

      this.state.selection = undefined;
      for (const wrapper of wrappers) {
        this.state.notifyElementChange({ type: 'focusable-inserted', element: wrapper });
      }
      this.state.cursor.place(anchor);
      return true;
    }

    const current = this.state.cursor.getPlace();
    if (!isLineSibling(current)) {
      return false;
    }

    const wrapper = token.wrapLineSiblingWithTag(current, tagName);
    if (!wrapper) {
      return false;
    }

    this.state.notifyElementChange({ type: 'focusable-inserted', element: wrapper });
    this.state.cursor.place(current);
    return true;
  }

  canRemoveSpaceBefore(): boolean {
    return (
      this.state.mode === 'edit' &&
      !!this.state.cursor &&
      !!space.getRemovableSpaceBeforeToken(this.state.cursor.getPlace())
    );
  }

  canRemoveSpaceAfter(): boolean {
    return (
      this.state.mode === 'edit' &&
      !!this.state.cursor &&
      !!space.getRemovableSpaceAfterToken(this.state.cursor.getPlace())
    );
  }

  canInsertSpaceBefore(): boolean {
    return (
      this.state.mode === 'edit' &&
      !!this.state.cursor &&
      space.canInsertSpaceBeforeToken(this.state.cursor.getPlace())
    );
  }

  canInsertSpaceAfter(): boolean {
    return (
      this.state.mode === 'edit' &&
      !!this.state.cursor &&
      space.canInsertSpaceAfterToken(this.state.cursor.getPlace())
    );
  }

  insertSpaceBefore(): boolean {
    if (this.state.mode !== 'edit' || !this.state.cursor) {
      return false;
    }

    const inserted = !!space.insertSpaceBeforeToken(this.state.cursor.getPlace());
    if (inserted) {
      this.state.notifyTextChange({
        type: 'whitespace-change',
        kind: 'leading-space',
        change: 'inserted'
      });
      return true;
    }
    return false;
  }

  insertSpaceAfter(): boolean {
    if (this.state.mode !== 'edit' || !this.state.cursor) {
      return false;
    }

    const inserted = !!space.insertSpaceAfterToken(this.state.cursor.getPlace());
    if (inserted) {
      this.state.notifyTextChange({
        type: 'whitespace-change',
        kind: 'trailing-space',
        change: 'inserted'
      });
      return true;
    }
    return false;
  }

  removeSpaceBefore(): boolean {
    if (this.state.mode !== 'edit' || !this.state.cursor) {
      return false;
    }

    const removed = !!space.removeSpaceBeforeToken(this.state.cursor.getPlace());
    if (removed) {
      this.state.notifyTextChange({
        type: 'whitespace-change',
        kind: 'leading-space',
        change: 'removed'
      });
      return true;
    }
    return false;
  }

  removeSpaceAfter(): boolean {
    if (this.state.mode !== 'edit' || !this.state.cursor) {
      return false;
    }

    const removed = !!space.removeSpaceAfterToken(this.state.cursor.getPlace());
    if (removed) {
      this.state.notifyTextChange({
        type: 'whitespace-change',
        kind: 'trailing-space',
        change: 'removed'
      });
      return true;
    }
    return false;
  }

  splitAtCursor() {
    if (this.state.mode !== 'edit' || !this.state.cursor) {
      return false;
    }

    const inserted = this.state.cursor.splitAtToken();
    if (inserted) {
      this.state.notifyElementChange({
        type: 'focusable-inserted',
        element: inserted.finalSplit.peer
      });
    }
  }
}
