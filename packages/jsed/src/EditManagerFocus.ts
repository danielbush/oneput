import type { EditManager } from './EditManager.js';
import * as dom from './lib/focusable.js';
import { canDelete } from './lib/dom-rules.js';
import { getFocusElementChildInsertion, getFocusElementInsertion } from './lib/focusable.js';

/**
 * High-level FOCUS operations / state for EditManager.
 *
 * This is effectivey an extension of EditManager.
 */
export class EditManagerFocus {
  static create(editManager: EditManager) {
    return new EditManagerFocus(editManager);
  }

  constructor(private editManager: EditManager) {}

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
