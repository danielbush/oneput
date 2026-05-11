import type { Editor } from './Editor.js';
import * as token from './lib/token.js';
import * as space from './lib/space.js';
import { isLineSibling } from './lib/taxonomy.js';
import { getWrapCandidates } from './lib/dom-rules.js';

/**
 * Trailing / Leading space (at cursor)
 */
export class EditorCursorOps {
  static create(editor: Editor) {
    return new EditorCursorOps(editor);
  }

  constructor(private editor: Editor) {}

  canWrap(): boolean {
    return (
      this.editor.mode === 'edit' &&
      !!this.editor.cursor &&
      isLineSibling(this.editor.cursor.getPlace())
    );
  }

  getWrapCandidates(): string[] {
    return getWrapCandidates();
  }

  /**
   * Wrap token at CURSOR in a tag.
   */
  wrap(tagName: string): boolean {
    if (this.editor.mode !== 'edit' || !this.editor.cursor) {
      return false;
    }

    if (this.editor.selection) {
      const anchor = this.editor.selection.getAnchor();
      const wrappers = this.editor.selection.wrapWithTag(tagName);
      if (!wrappers) {
        return false;
      }

      this.editor.selection = undefined;
      for (const wrapper of wrappers) {
        this.editor.notifyElementChange({ type: 'focusable-inserted', element: wrapper });
      }
      this.editor.cursor.place(anchor);
      return true;
    }

    const current = this.editor.cursor.getPlace();
    if (!isLineSibling(current)) {
      return false;
    }

    const wrapper = token.wrapLineSiblingWithTag(current, tagName);
    if (!wrapper) {
      return false;
    }

    this.editor.notifyElementChange({ type: 'focusable-inserted', element: wrapper });
    this.editor.cursor.place(current);
    return true;
  }

  canRemoveSpaceBefore(): boolean {
    return (
      this.editor.mode === 'edit' &&
      !!this.editor.cursor &&
      !!space.getRemovableSpaceBeforeToken(this.editor.cursor.getPlace())
    );
  }

  canRemoveSpaceAfter(): boolean {
    return (
      this.editor.mode === 'edit' &&
      !!this.editor.cursor &&
      !!space.getRemovableSpaceAfterToken(this.editor.cursor.getPlace())
    );
  }

  canInsertSpaceBefore(): boolean {
    return (
      this.editor.mode === 'edit' &&
      !!this.editor.cursor &&
      space.canInsertSpaceBeforeToken(this.editor.cursor.getPlace())
    );
  }

  canInsertSpaceAfter(): boolean {
    return (
      this.editor.mode === 'edit' &&
      !!this.editor.cursor &&
      space.canInsertSpaceAfterToken(this.editor.cursor.getPlace())
    );
  }

  insertSpaceBefore(): boolean {
    if (this.editor.mode !== 'edit' || !this.editor.cursor) {
      return false;
    }

    const inserted = !!space.insertSpaceBeforeToken(this.editor.cursor.getPlace());
    if (inserted) {
      this.editor.notifyTextChange({
        type: 'whitespace-change',
        kind: 'leading-space',
        change: 'inserted'
      });
      return true;
    }
    return false;
  }

  insertSpaceAfter(): boolean {
    if (this.editor.mode !== 'edit' || !this.editor.cursor) {
      return false;
    }

    const inserted = !!space.insertSpaceAfterToken(this.editor.cursor.getPlace());
    if (inserted) {
      this.editor.notifyTextChange({
        type: 'whitespace-change',
        kind: 'trailing-space',
        change: 'inserted'
      });
      return true;
    }
    return false;
  }

  removeSpaceBefore(): boolean {
    if (this.editor.mode !== 'edit' || !this.editor.cursor) {
      return false;
    }

    const removed = !!space.removeSpaceBeforeToken(this.editor.cursor.getPlace());
    if (removed) {
      this.editor.notifyTextChange({
        type: 'whitespace-change',
        kind: 'leading-space',
        change: 'removed'
      });
      return true;
    }
    return false;
  }

  removeSpaceAfter(): boolean {
    if (this.editor.mode !== 'edit' || !this.editor.cursor) {
      return false;
    }

    const removed = !!space.removeSpaceAfterToken(this.editor.cursor.getPlace());
    if (removed) {
      this.editor.notifyTextChange({
        type: 'whitespace-change',
        kind: 'trailing-space',
        change: 'removed'
      });
      return true;
    }
    return false;
  }

  splitAtCursor() {
    if (this.editor.mode !== 'edit' || !this.editor.cursor) {
      return false;
    }

    const inserted = this.editor.cursor.splitAtToken();
    if (inserted) {
      this.editor.notifyElementChange({ type: 'focusable-inserted', element: inserted });
    }
  }
}
