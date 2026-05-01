import type { EditManager } from './EditManager.js';
import * as dom from './lib/focusable.js';
import * as space from './lib/space.js';
import { canDelete } from './lib/dom-rules.js';
import { getFocusElementChildInsertion, getFocusElementInsertion } from './lib/focusable.js';

/**
 * High-level FOCUS operations for EditManager.
 *
 * This is effectivey an extension of EditManager.
 */
export class EditManagerFocus {
  static create(editManager: EditManager) {
    return new EditManagerFocus(editManager);
  }

  space: EditManagerFocusSpaceOps;

  constructor(private editManager: EditManager) {
    this.space = EditManagerFocusSpaceOps.create(editManager);
  }

  canInsertAfter(tagName?: string): boolean {
    const focus = this.editManager.getFocusedTag();
    return !!getFocusElementInsertion(focus, tagName);
  }

  canInsertBefore(tagName?: string): boolean {
    const focus = this.editManager.getFocusedTag();
    return !!getFocusElementInsertion(focus, tagName);
  }

  canInsertIn(tagName?: string): boolean {
    const focus = this.editManager.getFocusedTag();
    return !!getFocusElementChildInsertion(focus, tagName);
  }

  canDelete(): boolean {
    const focus = this.editManager.getFocusedTag();
    return !!(focus && canDelete(focus, this.editManager.document));
  }

  insertAfter(tagName?: string): boolean {
    const focus = this.editManager.getFocusedTag();
    const insertion = getFocusElementInsertion(focus, tagName);
    if (!insertion) {
      return false;
    }

    const inserted = dom.createElement(insertion.tagName);
    dom.insertAfter(inserted, insertion.focus);
    this.editManager.notifyElementChange({ type: 'focusable-inserted', element: inserted });
    this.editManager.nav.FOCUS(inserted);
    return true;
  }

  insertBefore(tagName?: string): boolean {
    const focus = this.editManager.getFocusedTag();
    const insertion = getFocusElementInsertion(focus, tagName);
    if (!insertion) {
      return false;
    }

    const inserted = dom.createElement(insertion.tagName);
    dom.insertBefore(inserted, insertion.focus);
    this.editManager.notifyElementChange({ type: 'focusable-inserted', element: inserted });
    this.editManager.nav.FOCUS(inserted);
    return true;
  }

  insertIn(tagName?: string): boolean {
    const focus = this.editManager.getFocusedTag();
    const insertion = getFocusElementChildInsertion(focus, tagName);
    if (!insertion) {
      return false;
    }

    const inserted = dom.createElement(insertion.tagName);
    insertion.parent.appendChild(inserted);
    this.editManager.notifyElementChange({ type: 'focusable-inserted', element: inserted });
    this.editManager.nav.FOCUS(inserted);
    return true;
  }

  delete(): boolean {
    const focus = this.editManager.getFocusedTag();
    if (!focus || !canDelete(focus, this.editManager.document)) {
      return false;
    }

    const parent = focus.parentElement;
    if (!parent) {
      return false;
    }
    const nextFocus =
      dom.findNextFocusableOutside(focus, this.editManager.document.root) ??
      dom.findPreviousFocusableOutside(focus, this.editManager.document.root) ??
      parent;

    dom.deleteElement(focus);
    this.editManager.notifyElementChange({ type: 'focusable-removed', element: focus });
    this.editManager.nav.FOCUS(nextFocus);
    return true;
  }
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
