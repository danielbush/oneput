import type { EditorState } from './EditorState.js';
import * as focusable from '../ops/focusable.js';
import { canDelete } from '../core/dom-rules.js';
import { convert, unwrap } from '../ops/focusable.js';
import { isInlineFlow } from '../core/taxonomy.js';
import { EditorFocusSpaceOps } from './EditorFocusSpaceOps.js';
export const JSED_MARCHING_ANTS_CLASS = 'jsed-marching-ants';

/**
 * High-level FOCUS operations for Editor.
 *
 * This is effectivey an extension of Editor.
 */
export class EditorFocusOps {
  static create(state: EditorState) {
    return new EditorFocusOps(state);
  }

  space: EditorFocusSpaceOps;

  constructor(private state: EditorState) {
    this.space = EditorFocusSpaceOps.create(state);
  }

  // #region insert after

  getInsertAfterCandidates(): string[] {
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return [];
    }
    return focusable.getInsertAfterCandidates(focus);
  }

  canInsertAfter(): boolean {
    if (this.state.isEditing()) {
      return false;
    }
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return false;
    }
    if (focus === this.state.document.root) {
      return false;
    }
    return focusable.getInsertAfterCandidates(focus).length > 0;
  }

  insertNewAfter(tagName: string): boolean {
    if (!this.canInsertAfter()) {
      return false;
    }

    const focus = this.state.nav.getFocus();
    if (!focus) {
      return false;
    }

    const inserted = focusable.insertNewAfter(tagName, focus);
    if (!inserted) {
      return false;
    }
    this.state.eventsEmitter.onElementChange?.({
      type: 'focusable-inserted',
      element: inserted
    });
    this.state.nav.FOCUS(inserted);
    return true;
  }

  // #endregion

  // #region insert before

  getInsertBeforeCandidates(): string[] {
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return [];
    }
    return focusable.getInsertBeforeCandidates(focus);
  }

  canInsertBefore(): boolean {
    if (this.state.isEditing()) {
      return false;
    }
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return false;
    }
    if (focus === this.state.document.root) {
      return false;
    }
    return focusable.getInsertBeforeCandidates(focus).length > 0;
  }

  insertNewBefore(tagName: string): boolean {
    if (!this.canInsertBefore()) {
      return false;
    }

    const focus = this.state.nav.getFocus();
    if (!focus) {
      return false;
    }
    const inserted = focusable.insertNewBefore(tagName, focus);
    if (!inserted) {
      return false;
    }

    this.state.eventsEmitter.onElementChange?.({
      type: 'focusable-inserted',
      element: inserted
    });
    this.state.nav.FOCUS(inserted);
    return true;
  }

  // #endregion

  // #region append new

  getAppendCandidates(): string[] {
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return [];
    }
    return focusable.getAppendCandidates(focus);
  }

  canAppend(): boolean {
    if (this.state.isEditing()) {
      return false;
    }
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return false;
    }
    return focusable.getAppendCandidates(focus).length > 0;
  }

  appendNew(tagName: string): boolean {
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return false;
    }
    const inserted = focusable.appendNew(focus, tagName);
    if (!inserted) {
      return false;
    }
    this.state.eventsEmitter.onElementChange?.({
      type: 'focusable-inserted',
      element: inserted
    });
    this.state.nav.FOCUS(inserted);
    return true;
  }

  // #endregion

  // #region delete

  canDelete(): boolean {
    if (this.state.isEditing()) {
      return false;
    }
    const focus = this.state.nav.getFocus();
    return !!(focus && canDelete(focus, this.state.document));
  }

  delete(): boolean {
    const focus = this.state.nav.getFocus();
    if (!focus || !canDelete(focus, this.state.document)) {
      return false;
    }

    const parent = focus.parentElement;
    if (!parent) {
      return false;
    }
    const nextFocus =
      focusable.findNextFocusableOutside(focus, this.state.document.root) ??
      focusable.findPreviousFocusableOutside(focus, this.state.document.root) ??
      parent;

    focusable.deleteElement(focus);
    this.state.eventsEmitter.onElementChange?.({
      type: 'focusable-removed',
      element: focus
    });
    this.state.nav.FOCUS(nextFocus);
    return true;
  }

  // #endregion

  // #region wrap

  canUnwrap(): boolean {
    if (this.state.isEditing()) {
      return false;
    }
    const focus = this.state.nav.getFocus();
    return isInlineFlow(focus);
  }

  unwrap(): boolean {
    const focus = this.state.nav.getFocus();
    if (focus && isInlineFlow(focus)) {
      unwrap(focus);
      return true;
    }
    return false;
  }

  // #endregion

  // #region convert

  getConversionCandidates(): string[] {
    const focus = this.state.nav.getFocus();
    return focusable.getConversionCandidates(focus, this.state.document.root);
  }

  canConvert(): boolean {
    if (this.state.isEditing()) {
      return false;
    }
    return !!this.state.nav.getFocus();
  }

  convert(tagName: string): boolean {
    const focus = this.state.nav.getFocus();
    if (focus && focus !== this.state.document.root) {
      const newEl = convert(focus, tagName);
      this.state.nav.FOCUS(newEl);
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
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return null;
    }
    const cutElement = this.cutElement;
    cutElement?.classList.remove(JSED_MARCHING_ANTS_CLASS);
    this.cutElement = null;
    return { cutElement, focus };
  }

  canCopy = (): boolean => {
    return !!this.state.nav.getFocus();
  };
  canCut = this.canCopy;
  canCopyEmpty = this.canCopy;

  cut(): boolean {
    this.isCopy = false;
    this.cutElement = this.state.nav.getFocus();
    this.cutElement?.classList.add(JSED_MARCHING_ANTS_CLASS);
    return !!this.cutElement;
  }

  copy(): boolean {
    this.isCopy = true;
    this.cutElement = this.state.nav.getFocus();
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
      this.state.nav.FOCUS(result);
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
      this.state.nav.FOCUS(result);
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
      this.state.nav.FOCUS(result);
    }
    return !!result;
  }

  cancelPaste(): boolean {
    this.prePaste();
    return true;
  }

  copyEmptyNext(): boolean {
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return false;
    }
    const empty = focusable.copyEmptyNext(focus);
    if (empty) {
      this.state.nav.FOCUS(empty);
    }
    return false;
  }

  copyEmptyPrevious(): boolean {
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return false;
    }
    const empty = focusable.copyEmptyPrevious(focus);
    if (empty) {
      this.state.nav.FOCUS(empty);
    }
    return false;
  }

  // #endregion
}
