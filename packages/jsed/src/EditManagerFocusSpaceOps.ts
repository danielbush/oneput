import type { EditManager } from './EditManager';
import * as space from './lib/space.js';

/**
 * Trailing / Leading space (at focus)
 */
export class EditManagerFocusSpaceOps {
  static create(editManager: EditManager) {
    return new EditManagerFocusSpaceOps(editManager);
  }

  constructor(private editManager: EditManager) {}

  canInsertSpaceAfterTag(): boolean {
    const focus = this.editManager.nav.getFocus();
    return !!(focus && space.canInsertSpaceAfterTag(focus));
  }

  canRemoveSpaceAfterTag(): boolean {
    const focus = this.editManager.nav.getFocus();
    return !!(focus && space.getRemovableSpaceAfterTag(focus));
  }

  canInsertSpaceBeforeTag(): boolean {
    const focus = this.editManager.nav.getFocus();
    return !!(focus && space.canInsertSpaceBeforeTag(focus));
  }

  canRemoveSpaceBeforeTag(): boolean {
    const focus = this.editManager.nav.getFocus();
    return !!(focus && space.getRemovableSpaceBeforeTag(focus));
  }

  insertSpaceAfterTag(): boolean {
    const focus = this.editManager.nav.getFocus();
    if (!focus) {
      return false;
    }

    const inserted = space.insertSpaceAfterTag(focus);
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

  removeSpaceAfterTag(): boolean {
    const focus = this.editManager.nav.getFocus();
    if (!focus) {
      return false;
    }

    const removed = space.removeSpaceAfterTag(focus);
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

  insertSpaceBeforeTag(): boolean {
    const focus = this.editManager.nav.getFocus();
    if (!focus) {
      return false;
    }

    const inserted = space.insertSpaceBeforeTag(focus);
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

  removeSpaceBeforeTag(): boolean {
    const focus = this.editManager.nav.getFocus();
    if (!focus) {
      return false;
    }

    const removed = space.removeSpaceBeforeTag(focus);
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
}
