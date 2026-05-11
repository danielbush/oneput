import type { Editor } from './Editor.js';
import * as space from './lib/space.js';

/**
 * Trailing / Leading space (at focus)
 */
export class EditorFocusSpaceOps {
  static create(editor: Editor) {
    return new EditorFocusSpaceOps(editor);
  }

  constructor(private editor: Editor) {}

  canInsertSpaceAfterTag(): boolean {
    const focus = this.editor.nav.getFocus();
    return !!(focus && space.canInsertSpaceAfterTag(focus));
  }

  canRemoveSpaceAfterTag(): boolean {
    const focus = this.editor.nav.getFocus();
    return !!(focus && space.getRemovableSpaceAfterTag(focus));
  }

  canInsertSpaceBeforeTag(): boolean {
    const focus = this.editor.nav.getFocus();
    return !!(focus && space.canInsertSpaceBeforeTag(focus));
  }

  canRemoveSpaceBeforeTag(): boolean {
    const focus = this.editor.nav.getFocus();
    return !!(focus && space.getRemovableSpaceBeforeTag(focus));
  }

  insertSpaceAfterTag(): boolean {
    const focus = this.editor.nav.getFocus();
    if (!focus) {
      return false;
    }

    const inserted = space.insertSpaceAfterTag(focus);
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

  removeSpaceAfterTag(): boolean {
    const focus = this.editor.nav.getFocus();
    if (!focus) {
      return false;
    }

    const removed = space.removeSpaceAfterTag(focus);
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

  insertSpaceBeforeTag(): boolean {
    const focus = this.editor.nav.getFocus();
    if (!focus) {
      return false;
    }

    const inserted = space.insertSpaceBeforeTag(focus);
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

  removeSpaceBeforeTag(): boolean {
    const focus = this.editor.nav.getFocus();
    if (!focus) {
      return false;
    }

    const removed = space.removeSpaceBeforeTag(focus);
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
}
