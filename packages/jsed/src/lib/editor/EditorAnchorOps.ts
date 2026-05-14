import type { EditorState } from './EditorState.js';
import * as token from '../token/token.js';

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
    return !!(focus && token.getAnchorBeforeTagInsertionPoint(focus));
  }

  insertBeforeFocus(): boolean {
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return false;
    }

    const anchor = token.insertAnchorBeforeTag(focus);
    if (!anchor) {
      return false;
    }

    this.state.notifyTextChange({ type: 'anchor-change', anchor, change: 'inserted' });
    this.state.ops.enterEditing(anchor).mapErr((err) => this.state.eventsEmitter.onError?.(err));
    return true;
  }

  canInsertAfterFocus(): boolean {
    const focus = this.state.nav.getFocus();
    return !!(focus && token.getAnchorAfterTagInsertionPoint(focus));
  }

  insertAfterFocus(): boolean {
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return false;
    }

    const anchor = token.insertAnchorAfterTag(focus);
    if (!anchor) {
      return false;
    }

    this.state.notifyTextChange({ type: 'anchor-change', anchor, change: 'inserted' });
    this.state.ops.enterEditing(anchor).mapErr((err) => this.state.eventsEmitter.onError?.(err));
    return true;
  }

  canRemoveAfterFocus(): boolean {
    const focus = this.state.nav.getFocus();
    return !!(focus && token.getRemovableAnchorAfterTag(focus));
  }

  removeAfterFocus(): boolean {
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return false;
    }

    const anchor = token.removeAnchorAfterTag(focus);
    if (!anchor) {
      return false;
    }

    this.state.notifyTextChange({ type: 'anchor-change', anchor, change: 'removed' });
    return true;
  }

  canRemoveBeforeFocus(): boolean {
    const focus = this.state.nav.getFocus();
    return !!(focus && token.getRemovableAnchorBeforeTag(focus));
  }

  removeBeforeFocus(): boolean {
    const focus = this.state.nav.getFocus();
    if (!focus) {
      return false;
    }

    const anchor = token.removeAnchorBeforeTag(focus);
    if (!anchor) {
      return false;
    }

    this.state.notifyTextChange({ type: 'anchor-change', anchor, change: 'removed' });
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

    const [anchor] = token.addAnchors(focus);
    if (!anchor) {
      return false;
    }

    this.state.notifyTextChange({ type: 'anchor-change', anchor, change: 'inserted' });
    this.state.ops.enterEditing(anchor).mapErr((err) => this.state.eventsEmitter.onError?.(err));
    return true;
  }
}
