import type { EditManager } from './EditManager.js';
import * as focusable from './lib/focusable.js';
import { canDelete } from './lib/dom-rules.js';
import { convert, unwrap } from './lib/focusable.js';
import { isInlineFlow } from './lib/taxonomy.js';
import { JSED_MARCHING_ANTS_CLASS } from './lib/constants.js';
import { EditManagerFocusSpaceOps } from './EditManagerFocusSpaceOps.js';

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

  // #region cut/paste focus

  private cutElement: HTMLElement | null = null;
  private isCopy: boolean = false;

  cut(): boolean {
    this.isCopy = false;
    this.cutElement = this.editManager.nav.getFocus();
    this.cutElement?.classList.add(JSED_MARCHING_ANTS_CLASS);
    return !!this.cutElement;
  }

  copy(): boolean {
    this.isCopy = true;
    this.cutElement = this.editManager.nav.getFocus();
    this.cutElement?.classList.add(JSED_MARCHING_ANTS_CLASS);
    return !!this.cutElement;
  }

  private prePaste(): { cutElement: HTMLElement; focus: HTMLElement } | null {
    if (!this.cutElement) {
      return null;
    }
    const focus = this.editManager.nav.getFocus();
    if (!focus) {
      return null;
    }
    const cutElement = this.cutElement;
    cutElement?.classList.remove(JSED_MARCHING_ANTS_CLASS);
    this.cutElement = null;
    return { cutElement, focus };
  }

  pasteBefore(): boolean {
    const { cutElement, focus } = this.prePaste() ?? {};
    if (!cutElement || !focus) {
      return false;
    }
    const result = this.isCopy
      ? focusable.pasteCopyBefore(cutElement, focus)
      : focusable.pasteBefore(cutElement, focus);
    if (result) {
      this.editManager.nav.FOCUS(result);
    }
    return !!result;
  }

  pasteAfter(): boolean {
    const { cutElement, focus } = this.prePaste() ?? {};
    if (!cutElement || !focus) {
      return false;
    }
    const result = this.isCopy
      ? focusable.pasteCopyAfter(cutElement, focus)
      : focusable.pasteAfter(cutElement, focus);
    if (result) {
      this.editManager.nav.FOCUS(result);
    }
    return !!result;
  }

  pasteAppend(): boolean {
    const { cutElement, focus } = this.prePaste() ?? {};
    if (!cutElement || !focus) {
      return false;
    }
    const result = this.isCopy
      ? focusable.pasteCopyWithin(cutElement, focus)
      : focusable.pasteWithin(cutElement, focus);
    if (result) {
      this.editManager.nav.FOCUS(result);
    }
    return !!result;
  }

  cancelPaste(): boolean {
    this.prePaste();
    return true;
  }

  // #endregion
}
