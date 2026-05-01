import type { EditManager } from './EditManager.js';
import * as token from './lib/token.js';
import * as space from './lib/space.js';
import { isLineSibling } from './lib/taxonomy.js';

/**
 * Trailing / Leading space (at cursor)
 */
export class EditManagerCursorOps {
  static create(editManager: EditManager) {
    return new EditManagerCursorOps(editManager);
  }

  constructor(private editManager: EditManager) {}

  canWrap(): boolean {
    return (
      this.editManager.mode === 'edit' &&
      !!this.editManager.cursor &&
      isLineSibling(this.editManager.cursor.getPlace())
    );
  }

  /**
   * Wrap token at CURSOR in a tag.
   */
  wrap(tagName: string): boolean {
    if (this.editManager.mode !== 'edit' || !this.editManager.cursor) {
      return false;
    }

    if (this.editManager.selection) {
      const anchor = this.editManager.selection.getAnchor();
      const wrappers = this.editManager.selection.wrapWithTag(tagName);
      if (!wrappers) {
        return false;
      }

      this.editManager.selection = undefined;
      for (const wrapper of wrappers) {
        this.editManager.notifyElementChange({ type: 'focusable-inserted', element: wrapper });
      }
      this.editManager.cursor.place(anchor);
      return true;
    }

    const current = this.editManager.cursor.getPlace();
    if (!isLineSibling(current)) {
      return false;
    }

    const wrapper = token.wrapLineSiblingWithTag(current, tagName);
    if (!wrapper) {
      return false;
    }

    this.editManager.notifyElementChange({ type: 'focusable-inserted', element: wrapper });
    this.editManager.cursor.place(current);
    return true;
  }

  canRemoveSpaceBefore(): boolean {
    return (
      this.editManager.mode === 'edit' &&
      !!this.editManager.cursor &&
      !!space.getRemovableSpaceBeforeToken(this.editManager.cursor.getPlace())
    );
  }

  canRemoveSpaceAfter(): boolean {
    return (
      this.editManager.mode === 'edit' &&
      !!this.editManager.cursor &&
      !!space.getRemovableSpaceAfterToken(this.editManager.cursor.getPlace())
    );
  }

  canInsertSpaceBefore(): boolean {
    return (
      this.editManager.mode === 'edit' &&
      !!this.editManager.cursor &&
      space.canInsertSpaceBeforeToken(this.editManager.cursor.getPlace())
    );
  }

  canInsertSpaceAfter(): boolean {
    return (
      this.editManager.mode === 'edit' &&
      !!this.editManager.cursor &&
      space.canInsertSpaceAfterToken(this.editManager.cursor.getPlace())
    );
  }

  insertSpaceBefore(): boolean {
    if (this.editManager.mode !== 'edit' || !this.editManager.cursor) {
      return false;
    }

    const inserted = !!space.insertSpaceBeforeToken(this.editManager.cursor.getPlace());
    if (inserted) {
      this.editManager.notifyTextChange({
        type: 'whitespace-change',
        kind: 'leading-space',
        change: 'inserted'
      });
      return true;
    }
    return false;
  }

  insertSpaceAfter(): boolean {
    if (this.editManager.mode !== 'edit' || !this.editManager.cursor) {
      return false;
    }

    const inserted = !!space.insertSpaceAfterToken(this.editManager.cursor.getPlace());
    if (inserted) {
      this.editManager.notifyTextChange({
        type: 'whitespace-change',
        kind: 'trailing-space',
        change: 'inserted'
      });
      return true;
    }
    return false;
  }

  removeSpaceBefore(): boolean {
    if (this.editManager.mode !== 'edit' || !this.editManager.cursor) {
      return false;
    }

    const removed = !!space.removeSpaceBeforeToken(this.editManager.cursor.getPlace());
    if (removed) {
      this.editManager.notifyTextChange({
        type: 'whitespace-change',
        kind: 'leading-space',
        change: 'removed'
      });
      return true;
    }
    return false;
  }

  removeSpaceAfter(): boolean {
    if (this.editManager.mode !== 'edit' || !this.editManager.cursor) {
      return false;
    }

    const removed = !!space.removeSpaceAfterToken(this.editManager.cursor.getPlace());
    if (removed) {
      this.editManager.notifyTextChange({
        type: 'whitespace-change',
        kind: 'trailing-space',
        change: 'removed'
      });
      return true;
    }
    return false;
  }
}
