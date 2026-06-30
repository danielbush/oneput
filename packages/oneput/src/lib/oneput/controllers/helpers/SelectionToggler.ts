import type { Controller } from '../controller.js';

/**
 * Cycles the input selection purely from its current selection state, with no
 * timing: SELECT_ALL → CURSOR_AT_END → CURSOR_AT_BEGINNING → SELECT_ALL. Any
 * other state (partial selection, mid-caret, empty) resets to SELECT_ALL.
 *
 * The timed variant is {@link TimedSelectionToggler}, which forces SELECT_ALL
 * first after an idle gap; this one is stateless and depends only on where the
 * selection currently is.
 */
export class SelectionToggler {
  static create(ctl: Controller) {
    return new SelectionToggler(ctl);
  }

  constructor(private ctl: Controller) {}

  toggle(): void {
    switch (this.ctl.input.getSelectionState()) {
      case 'SELECT_ALL':
        this.ctl.input.moveCursorToEnd();
        break;
      case 'CURSOR_AT_END':
        this.ctl.input.moveCursorToBeginning();
        break;
      case 'CURSOR_AT_BEGINNING':
        this.ctl.input.selectAll();
        break;
      default:
        this.ctl.input.selectAll();
    }
  }
}
