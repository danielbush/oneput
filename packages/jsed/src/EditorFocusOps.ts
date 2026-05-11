import type { Editor } from './Editor.js';
import * as focusable from './lib/focusable.js';
import { canDelete } from './lib/dom-rules.js';
import { convert, unwrap } from './lib/focusable.js';
import { isInlineFlow } from './lib/taxonomy.js';
import { JSED_MARCHING_ANTS_CLASS } from './lib/constants.js';
import { EditorFocusSpaceOps } from './EditorFocusSpaceOps.js';

/**
 * High-level FOCUS operations for Editor.
 *
 * This is effectivey an extension of Editor.
 */
export class EditorFocusOps {
  static create(editor: Editor) {
    return new EditorFocusOps(editor);
  }

  space: EditorFocusSpaceOps;

  constructor(private editor: Editor) {
    this.space = EditorFocusSpaceOps.create(editor);
  }

  // #region insert after

  getInsertAfterCandidates(): string[] {
    const focus = this.editor.nav.getFocus();
    if (!focus) {
      return [];
    }
    return focusable.getInsertAfterCandidates(focus);
  }

  canInsertAfter(): boolean {
    if (this.editor.isEditing()) {
      return false;
    }
    const focus = this.editor.nav.getFocus();
    if (!focus) {
      return false;
    }
    if (focus === this.editor.document.root) {
      return false;
    }
    return focusable.getInsertAfterCandidates(focus).length > 0;
  }

  insertNewAfter(tagName: string): boolean {
    const focus = this.editor.nav.getFocus();
    if (!focus) {
      return false;
    }

    const inserted = focusable.insertNewAfter(tagName, focus);
    if (!inserted) {
      return false;
    }
    this.editor.notifyElementChange({
      type: 'focusable-inserted',
      element: inserted
    });
    this.editor.nav.FOCUS(inserted);
    return true;
  }

  // #endregion

  // #region insert before

  getInsertBeforeCandidates(): string[] {
    const focus = this.editor.nav.getFocus();
    if (!focus) {
      return [];
    }
    return focusable.getInsertBeforeCandidates(focus);
  }

  canInsertBefore(): boolean {
    if (this.editor.isEditing()) {
      return false;
    }
    const focus = this.editor.nav.getFocus();
    if (!focus) {
      return false;
    }
    if (focus === this.editor.document.root) {
      return false;
    }
    return focusable.getInsertBeforeCandidates(focus).length > 0;
  }

  insertNewBefore(tagName: string): boolean {
    const focus = this.editor.nav.getFocus();
    if (!focus) {
      return false;
    }
    const inserted = focusable.insertNewBefore(tagName, focus);
    if (!inserted) {
      return false;
    }

    this.editor.notifyElementChange({
      type: 'focusable-inserted',
      element: inserted
    });
    this.editor.nav.FOCUS(inserted);
    return true;
  }

  // #endregion

  // #region append new

  getAppendCandidates(): string[] {
    const focus = this.editor.nav.getFocus();
    if (!focus) {
      return [];
    }
    return focusable.getAppendCandidates(focus);
  }

  canAppend(): boolean {
    if (this.editor.isEditing()) {
      return false;
    }
    const focus = this.editor.nav.getFocus();
    if (!focus) {
      return false;
    }
    return focusable.getAppendCandidates(focus).length > 0;
  }

  appendNew(tagName: string): boolean {
    const focus = this.editor.nav.getFocus();
    if (!focus) {
      return false;
    }
    const inserted = focusable.appendNew(focus, tagName);
    if (!inserted) {
      return false;
    }
    this.editor.notifyElementChange({
      type: 'focusable-inserted',
      element: inserted
    });
    this.editor.nav.FOCUS(inserted);
    return true;
  }

  // #endregion

  // #region delete

  canDelete(): boolean {
    if (this.editor.isEditing()) {
      return false;
    }
    const focus = this.editor.nav.getFocus();
    return !!(focus && canDelete(focus, this.editor.document));
  }

  delete(): boolean {
    const focus = this.editor.nav.getFocus();
    if (!focus || !canDelete(focus, this.editor.document)) {
      return false;
    }

    const parent = focus.parentElement;
    if (!parent) {
      return false;
    }
    const nextFocus =
      focusable.findNextFocusableOutside(focus, this.editor.document.root) ??
      focusable.findPreviousFocusableOutside(focus, this.editor.document.root) ??
      parent;

    focusable.deleteElement(focus);
    this.editor.notifyElementChange({
      type: 'focusable-removed',
      element: focus
    });
    this.editor.nav.FOCUS(nextFocus);
    return true;
  }

  // #endregion

  // #region wrap

  canUnwrap(): boolean {
    if (this.editor.isEditing()) {
      return false;
    }
    const focus = this.editor.nav.getFocus();
    return isInlineFlow(focus);
  }

  unwrap(): boolean {
    const focus = this.editor.nav.getFocus();
    if (focus && isInlineFlow(focus)) {
      unwrap(focus);
      return true;
    }
    return false;
  }

  // #endregion

  // #region convert

  getConversionCandidates(): string[] {
    const focus = this.editor.nav.getFocus();
    return focusable.getConversionCandidates(focus, this.editor.document.root);
  }

  canConvert(): boolean {
    if (this.editor.isEditing()) {
      return false;
    }
    return !!this.editor.nav.getFocus();
  }

  convert(tagName: string): boolean {
    const focus = this.editor.nav.getFocus();
    if (focus && focus !== this.editor.document.root) {
      const newEl = convert(focus, tagName);
      this.editor.nav.FOCUS(newEl);
      return true;
    }
    return false;
  }

  // #endregion

  // #region cut/paste focus

  private cutElement: HTMLElement | null = null;
  private isCopy: boolean = false;
  private prePaste(): { cutElement: HTMLElement; focus: HTMLElement } | null {
    if (!this.cutElement) {
      return null;
    }
    const focus = this.editor.nav.getFocus();
    if (!focus) {
      return null;
    }
    const cutElement = this.cutElement;
    cutElement?.classList.remove(JSED_MARCHING_ANTS_CLASS);
    this.cutElement = null;
    return { cutElement, focus };
  }

  canCopy = (): boolean => {
    return !!this.editor.nav.getFocus();
  };
  canCut = this.canCopy;
  canCopyEmpty = this.canCopy;

  cut(): boolean {
    this.isCopy = false;
    this.cutElement = this.editor.nav.getFocus();
    this.cutElement?.classList.add(JSED_MARCHING_ANTS_CLASS);
    return !!this.cutElement;
  }

  copy(): boolean {
    this.isCopy = true;
    this.cutElement = this.editor.nav.getFocus();
    this.cutElement?.classList.add(JSED_MARCHING_ANTS_CLASS);
    return !!this.cutElement;
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
      this.editor.nav.FOCUS(result);
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
      this.editor.nav.FOCUS(result);
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
      this.editor.nav.FOCUS(result);
    }
    return !!result;
  }

  cancelPaste(): boolean {
    this.prePaste();
    return true;
  }

  copyEmptyNext(): boolean {
    const focus = this.editor.nav.getFocus();
    if (!focus) {
      return false;
    }
    const empty = focusable.copyEmptyNext(focus);
    if (empty) {
      this.editor.nav.FOCUS(empty);
    }
    return false;
  }

  copyEmptyPrevious(): boolean {
    const focus = this.editor.nav.getFocus();
    if (!focus) {
      return false;
    }
    const empty = focusable.copyEmptyPrevious(focus);
    if (empty) {
      this.editor.nav.FOCUS(empty);
    }
    return false;
  }

  // #endregion
}
