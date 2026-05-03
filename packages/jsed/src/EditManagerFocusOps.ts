import type { EditManager } from './EditManager.js';
import * as focusable from './lib/focusable.js';
import * as space from './lib/space.js';
import { canDelete } from './lib/dom-rules.js';
import { convert, unwrap } from './lib/focusable.js';
import { isInlineFlow } from './lib/taxonomy.js';

/**
 * High-level FOCUS operations for EditManager.
 *
 * This is effectivey an extension of EditManager.
 */
export class EditManagerFocusOps {
  static create(editManager: EditManager) {
    return new EditManagerFocusOps(editManager);
  }

  space: EditManagerFocusSpaceOps;

  constructor(private editManager: EditManager) {
    this.space = EditManagerFocusSpaceOps.create(editManager);
  }

  // #region insert after

  getInsertAfterCandidates(): string[] {
    const focus = this.editManager.nav.getFocus();
    if (!focus) {
      return [];
    }
    return focusable.getInsertAfterCandidates(focus);
  }

  canInsertAfter(): boolean {
    if (this.editManager.isEditing()) {
      return false;
    }
    const focus = this.editManager.nav.getFocus();
    if (!focus) {
      return false;
    }
    return focusable.getInsertAfterCandidates(focus).length > 0;
  }

  insertNewAfter(tagName: string): boolean {
    const focus = this.editManager.nav.getFocus();
    if (!focus) {
      return false;
    }

    const inserted = focusable.insertNewAfter(tagName, focus);
    if (!inserted) {
      return false;
    }
    this.editManager.notifyElementChange({ type: 'focusable-inserted', element: inserted });
    this.editManager.nav.FOCUS(inserted);
    return true;
  }

  // #endregion

  // #region insert before

  getInsertBeforeCandidates(): string[] {
    const focus = this.editManager.nav.getFocus();
    if (!focus) {
      return [];
    }
    return focusable.getInsertBeforeCandidates(focus);
  }

  canInsertBefore(): boolean {
    if (this.editManager.isEditing()) {
      return false;
    }
    const focus = this.editManager.nav.getFocus();
    if (!focus) {
      return false;
    }
    return focusable.getInsertBeforeCandidates(focus).length > 0;
  }

  insertNewBefore(tagName: string): boolean {
    const focus = this.editManager.nav.getFocus();
    if (!focus) {
      return false;
    }
    const inserted = focusable.insertNewBefore(tagName, focus);
    if (!inserted) {
      return false;
    }

    this.editManager.notifyElementChange({ type: 'focusable-inserted', element: inserted });
    this.editManager.nav.FOCUS(inserted);
    return true;
  }

  // #endregion

  // #region append new

  getAppendCandidates(): string[] {
    const focus = this.editManager.nav.getFocus();
    if (!focus) {
      return [];
    }
    return focusable.getAppendCandidates(focus);
  }

  canAppend(): boolean {
    if (this.editManager.isEditing()) {
      return false;
    }
    const focus = this.editManager.nav.getFocus();
    if (!focus) {
      return false;
    }
    return focusable.getAppendCandidates(focus).length > 0;
  }

  appendNew(tagName: string): boolean {
    const focus = this.editManager.nav.getFocus();
    if (!focus) {
      return false;
    }
    const inserted = focusable.appendNew(focus, tagName);
    if (!inserted) {
      return false;
    }
    this.editManager.notifyElementChange({ type: 'focusable-inserted', element: inserted });
    this.editManager.nav.FOCUS(inserted);
    return true;
  }

  // #endregion

  // #region delete

  canDelete(): boolean {
    if (this.editManager.isEditing()) {
      return false;
    }
    const focus = this.editManager.nav.getFocus();
    return !!(focus && canDelete(focus, this.editManager.document));
  }

  delete(): boolean {
    const focus = this.editManager.nav.getFocus();
    if (!focus || !canDelete(focus, this.editManager.document)) {
      return false;
    }

    const parent = focus.parentElement;
    if (!parent) {
      return false;
    }
    const nextFocus =
      focusable.findNextFocusableOutside(focus, this.editManager.document.root) ??
      focusable.findPreviousFocusableOutside(focus, this.editManager.document.root) ??
      parent;

    focusable.deleteElement(focus);
    this.editManager.notifyElementChange({ type: 'focusable-removed', element: focus });
    this.editManager.nav.FOCUS(nextFocus);
    return true;
  }

  // #endregion

  // #region wrap

  canUnwrap(): boolean {
    if (this.editManager.isEditing()) {
      return false;
    }
    const focus = this.editManager.nav.getFocus();
    return isInlineFlow(focus);
  }

  unwrap(): boolean {
    const focus = this.editManager.nav.getFocus();
    if (focus && isInlineFlow(focus)) {
      unwrap(focus);
      return true;
    }
    return false;
  }

  // #endregion

  // #region convert

  getConversionCandidates(): string[] {
    const focus = this.editManager.nav.getFocus();
    return focusable.getConversionCandidates(focus, this.editManager.document.root);
  }

  canConvert(): boolean {
    if (this.editManager.isEditing()) {
      return false;
    }
    return !!this.editManager.nav.getFocus();
  }

  convert(tagName: string): boolean {
    const focus = this.editManager.nav.getFocus();
    if (focus && focus !== this.editManager.document.root) {
      const newEl = convert(focus, tagName);
      this.editManager.nav.FOCUS(newEl);
      return true;
    }
    return false;
  }

  // #endregion
}

/**
 * Trailing / Leading space (at focus)
 */
class EditManagerFocusSpaceOps {
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
