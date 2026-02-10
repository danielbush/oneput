import type { Controller } from '../controller.js';

/**
 * Should "select all" first; then if we keep clicking within a time limit go
 * to the other states.
 */
export class SelectionToggler {
  static create(ctl: Controller) {
    return new SelectionToggler(ctl);
  }

  #toggleSelectTid: number | undefined = undefined;
  #canGoToNextSelectState: boolean = false;

  constructor(private ctl: Controller) {}

  #calcCursor(canGoToNext: boolean = true): void {
    if (!canGoToNext) {
      if (this.ctl.input.getSelectionState() !== 'SELECT_ALL') {
        // User hasn't clicked for a while, select all if not all selected because
        // this is the most convenient way to edit/replace the entire word...
        this.ctl.input.selectAll();
        return;
      }
    }
    switch (this.ctl.input.getSelectionState()) {
      case 'SELECT_ALL': {
        this.ctl.input.moveCursorToEnd();
        break;
      }
      case 'CURSOR_AT_END': {
        this.ctl.input.moveCursorToBeginning();
        break;
      }
      case 'CURSOR_AT_BEGINNING': {
        this.ctl.input.selectAll();
        break;
      }
      default: {
        this.ctl.input.selectAll();
      }
    }
  }

  toggle(): void {
    this.#calcCursor(this.#canGoToNextSelectState);
    if (!this.#canGoToNextSelectState) {
      this.#canGoToNextSelectState = true;
    }
    window.clearTimeout(this.#toggleSelectTid);
    this.#toggleSelectTid = window.setTimeout(() => {
      this.#canGoToNextSelectState = false;
    }, 800);
  }
}
