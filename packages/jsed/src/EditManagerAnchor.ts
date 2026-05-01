import type { EditManager } from './EditManager.js';
import * as token from './lib/token.js';

/**
 * High-level ANCHOR operations for EditManager.
 *
 * This is effectivey an extension of EditManager.
 */
export class EditManagerAnchor {
  static create(editManager: EditManager) {
    return new EditManagerAnchor(editManager);
  }

  constructor(private editManager: EditManager) {}

  canInsertBeforeFocus(): boolean {
    const focus = this.editManager.nav.getFocus();
    return !!(focus && token.getAnchorBeforeTagInsertionPoint(focus));
  }

  insertBeforeFocus(): boolean {
    const focus = this.editManager.nav.getFocus();
    if (!focus) {
      return false;
    }

    const anchor = token.insertAnchorBeforeTag(focus);
    if (!anchor) {
      return false;
    }

    this.editManager.notifyTextChange({ type: 'anchor-change', anchor, change: 'inserted' });
    this.editManager.enterEditing(anchor).mapErr((err) => this.editManager.onError?.(err));
    return true;
  }

  canInsertAfterFocus(): boolean {
    const focus = this.editManager.nav.getFocus();
    return !!(focus && token.getAnchorAfterTagInsertionPoint(focus));
  }

  insertAfterFocus(): boolean {
    const focus = this.editManager.nav.getFocus();
    if (!focus) {
      return false;
    }

    const anchor = token.insertAnchorAfterTag(focus);
    if (!anchor) {
      return false;
    }

    this.editManager.notifyTextChange({ type: 'anchor-change', anchor, change: 'inserted' });
    this.editManager.enterEditing(anchor).mapErr((err) => this.editManager.onError?.(err));
    return true;
  }

  canRemoveAfterFocus(): boolean {
    const focus = this.editManager.nav.getFocus();
    return !!(focus && token.getRemovableAnchorAfterTag(focus));
  }

  removeAfterFocus(): boolean {
    const focus = this.editManager.nav.getFocus();
    if (!focus) {
      return false;
    }

    const anchor = token.removeAnchorAfterTag(focus);
    if (!anchor) {
      return false;
    }

    this.editManager.notifyTextChange({ type: 'anchor-change', anchor, change: 'removed' });
    return true;
  }

  canRemoveBeforeFocus(): boolean {
    const focus = this.editManager.nav.getFocus();
    return !!(focus && token.getRemovableAnchorBeforeTag(focus));
  }

  removeBeforeFocus(): boolean {
    const focus = this.editManager.nav.getFocus();
    if (!focus) {
      return false;
    }

    const anchor = token.removeAnchorBeforeTag(focus);
    if (!anchor) {
      return false;
    }

    this.editManager.notifyTextChange({ type: 'anchor-change', anchor, change: 'removed' });
    return true;
  }

  canInsertInFocus(): boolean {
    const focus = this.editManager.nav.getFocus();
    return !!(focus && token.canInsertAnchorInLine(focus));
  }

  insertInFocus(): boolean {
    const focus = this.editManager.nav.getFocus();
    if (!focus || !token.canInsertAnchorInLine(focus)) {
      return false;
    }

    const [anchor] = token.addAnchors(focus);
    if (!anchor) {
      return false;
    }

    this.editManager.notifyTextChange({ type: 'anchor-change', anchor, change: 'inserted' });
    this.editManager.enterEditing(anchor).mapErr((err) => this.editManager.onError?.(err));
    return true;
  }
}
