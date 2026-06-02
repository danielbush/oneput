import type { EditorState } from './EditorState.js';
import * as token from '../ops/token.js';
import {
  anchorize,
  getAnchorAfterTagInsertionPoint,
  getAnchorBeforeTagInsertionPoint,
  getRemovableAnchorAfterTag,
  getRemovableAnchorBeforeTag,
  insertAnchorAfterTag,
  insertAnchorBeforeTag,
  removeAnchorAfterTag,
  removeAnchorBeforeTag
} from '../ops/anchor.js';

/**
 * High-level ANCHOR operations for Editor.
 *
 * This is effectivey an extension of Editor.
 */
export class EditorAnchorOps {
  static create(state: EditorState) {
    return new EditorAnchorOps(state);
  }

  constructor(private state: EditorState) {}

  canInsertBeforeFocus(): boolean {
    const focus = this.state.nav.getFocus();
    return !!(focus && getAnchorBeforeTagInsertionPoint(focus));
  }

  insertBeforeFocus(): boolean {
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return false;
    }

    const anchor = insertAnchorBeforeTag(focus);
    if (!anchor) {
      return false;
    }

    this.state.eventsEmitter.onTextChange?.({
      type: 'anchor-change',
      anchor,
      change: 'inserted'
    });
    this.state.enterEditing(anchor).mapErr((err) => this.state.eventsEmitter.onError?.(err));
    return true;
  }

  canInsertAfterFocus(): boolean {
    const focus = this.state.nav.getFocus();
    return !!(focus && getAnchorAfterTagInsertionPoint(focus));
  }

  insertAfterFocus(): boolean {
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return false;
    }

    const anchor = insertAnchorAfterTag(focus);
    if (!anchor) {
      return false;
    }

    this.state.eventsEmitter.onTextChange?.({ type: 'anchor-change', anchor, change: 'inserted' });
    this.state.enterEditing(anchor).mapErr((err) => this.state.eventsEmitter.onError?.(err));
    return true;
  }

  canRemoveAfterFocus(): boolean {
    const focus = this.state.nav.getFocus();
    return !!(focus && getRemovableAnchorAfterTag(focus));
  }

  removeAfterFocus(): boolean {
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return false;
    }

    const anchor = removeAnchorAfterTag(focus);
    if (!anchor) {
      return false;
    }

    this.state.eventsEmitter.onTextChange?.({ type: 'anchor-change', anchor, change: 'removed' });
    return true;
  }

  canRemoveBeforeFocus(): boolean {
    const focus = this.state.nav.getFocus();
    return !!(focus && getRemovableAnchorBeforeTag(focus));
  }

  removeBeforeFocus(): boolean {
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return false;
    }

    const anchor = removeAnchorBeforeTag(focus);
    if (!anchor) {
      return false;
    }

    this.state.eventsEmitter.onTextChange?.({ type: 'anchor-change', anchor, change: 'removed' });
    return true;
  }

  canInsertInFocus(): boolean {
    const focus = this.state.nav.getFocus();
    return !!(focus && token.canInsertAnchorInLine(focus));
  }

  insertInFocus(): boolean {
    const focus = this.state.nav.getFocus();
    if (!focus || !token.canInsertAnchorInLine(focus)) {
      return false;
    }

    const [anchor] = anchorize(focus);
    if (!anchor) {
      return false;
    }

    this.state.eventsEmitter.onTextChange?.({ type: 'anchor-change', anchor, change: 'inserted' });
    this.state.enterEditing(anchor).mapErr((err) => this.state.eventsEmitter.onError?.(err));
    return true;
  }
}
