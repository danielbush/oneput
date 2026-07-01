import type { EditorState } from './EditorState.js';
import * as focusable from '../../lib/ops/focusable.js';
import { canDelete } from '../../lib/core/dom-rules.js';
import { convert, unwrap } from '../../lib/ops/focusable.js';
import { isInlineFlow } from '../../lib/core/taxonomy.js';
import { EditorFocusSpaceOps } from './EditorFocusSpaceOps.js';
import { InsertAfter } from './ops/InsertAfter.js';
import { AppendNew } from './ops/AppendNew.js';
import { InsertBefore } from './ops/InsertBefore.js';
import { Delete } from './ops/Delete.js';
import type { UndoRecord } from '../../undo/index.js';
import { EditorFocusAnchorOps } from './EditorFocusAnchorOps.js';
import type { ElementInsertOption, ElementSpec } from '../../lib/core/dom-rules.js';
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
  anchor: EditorFocusAnchorOps;

  constructor(private state: EditorState) {
    this.space = EditorFocusSpaceOps.create(state);
    this.anchor = EditorFocusAnchorOps.create(state);
  }

  private _undo = <K extends UndoRecord>(result?: K) => {
    this.state.undo.record(result);
    return result;
  };

  // #region insert after

  getInsertAfterOptions(): ElementInsertOption[] {
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return [];
    }
    return focusable.getInsertAfterOptions(focus);
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
    return focusable.getInsertAfterOptions(focus).length > 0;
  }

  insertNewAfter(spec: ElementSpec): boolean {
    return !!this._undo(InsertAfter.run(this.state, spec));
  }

  // #endregion

  // #region insert before

  getInsertBeforeOptions(): ElementInsertOption[] {
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return [];
    }
    return focusable.getInsertBeforeOptions(focus);
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
    return focusable.getInsertBeforeOptions(focus).length > 0;
  }

  insertNewBefore(spec: ElementSpec): boolean {
    return !!this._undo(InsertBefore.run(this.state, spec));
  }

  // #endregion

  // #region append new

  getAppendOptions(): ElementInsertOption[] {
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return [];
    }
    return focusable.getAppendOptions(focus);
  }

  canAppend(): boolean {
    if (this.state.isEditing()) {
      return false;
    }
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return false;
    }
    return focusable.getAppendOptions(focus).length > 0;
  }

  appendNew(spec: ElementSpec): boolean {
    return !!this._undo(AppendNew.run(this.state, spec));
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
    return !!this._undo(Delete.run(this.state));
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
