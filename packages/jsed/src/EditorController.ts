import * as token from './lib/token.js';
import type { CursorError, SetTokenOpts } from './CursorState';
import type { Editor } from './Editor';
import { isToken } from './lib/taxonomy';
import type { UserInputChange, UserInputSelectionState } from './UserInput';
import type { JsedFocusRequestEvent } from './types.js';
import { findNextEditableLine } from './lib/line.js';

/**
 * Handles incoming events for an Editor instance excluding actions fired by the user.
 */
export class EditorController {
  static create(state: Editor) {
    return new EditorController(state);
  }

  constructor(private state: Editor) {}

  private unsubscribeInputChange?: () => void;
  private unsubscribeInputSelectionChange?: () => void;

  unsubscribeAll = () => {
    this.unsubscribeInputChange?.();
    this.unsubscribeInputSelectionChange?.();
  };

  subscribeAll = () => {
    this.unsubscribeInputChange = this.state.userInput.subscribeInputChange(this.onInputChange);
    this.unsubscribeInputSelectionChange = this.state.userInput.subscribeSelectionChange(
      this.onInputSelectionChange
    );
  };

  onInputChange = (change: UserInputChange) => {
    if (this.state.isSuspended) return;
    if (
      this.state.mode !== 'edit' ||
      !this.state.cursor ||
      !isToken(this.state.cursor.getPlace())
    ) {
      return;
    }
    // If a selection is active, reduce it to the START (earlier end in
    // document order): remove all selected TOKEN's except the start,
    // unwrap SELECTION_WRAPPER's, and re-seat the editing CURSOR on the
    // start. The intent (decided above against the anchor's value) then
    // executes against the start — e.g. rewrite-current turns typing
    // "x" into "replace start TOKEN with x", landing the new content
    // where the selection began.
    if (this.state.selection) {
      const start = this.state.selection.collapseToStart();
      this.state.selection = undefined;
      // Suppress input sync — user is mid-typing, we'd clobber their input.
      this.state.cursor.place(start, { syncInput: false });
    }
    this.state.inputOps.updateWithInputChange(change, this.state.cursor);
  };

  /**
   * When user changes the selection in the input...
   *
   * Pass this to the selection emitter after instantiation.
   */
  onInputSelectionChange = (selection: UserInputSelectionState) => {
    if (this.state.isSuspended) return;
    if (this.state.mode !== 'edit' || !this.state.cursor || !isToken(this.state.cursor.getPlace()))
      return;
    this.state.cursor?.setStateFromSelection(selection);
  };

  /**
   * When the cursor changes its token because of some action it has been
   * commanded to do usually by the user... (eg due to delete operation).
   *
   * `opts.syncInput === false` skips all `userInput.*` side effects —
   * internal model updates (tokenizer keep-alive, nav focus, external
   * onCursorChange) still fire. Used for mid-typing cursor re-seating so
   * the user's in-flight input value is not clobbered by the head TOKEN's
   * pre-rewrite value.
   */
  onCursorChange = (tok: HTMLElement, opts?: SetTokenOpts) => {
    this.state.tokenizer.setCursorElement(tok);
    this.state.nav?.FOCUS(tok);
    this.state.eventsEmitter.onCursorChange?.(tok);
    if (opts?.syncInput === false) return;
    this.state.userInput.resetPlaceholder();
    this.state.userInput.enable(true);
    this.state.inputOps.udpateWithCursorChange(tok);
  };

  /**
   * When the user causes a FOCUS change (click, touch, key bindings)...
   */
  onFocusRequest = (evt: JsedFocusRequestEvent) => {
    if (this.state.mode === 'view') {
      return this.onFocusRequestInViewMode(evt);
    }

    return this.onFocusRequestInEditingMode(evt);
  };

  private onFocusRequestInViewMode = (evt: JsedFocusRequestEvent) => {
    const currentFocus = this.state.nav.getFocus();

    if (evt.targetType === 'FOCUSABLE') {
      // Second focus puts us into editing mode.
      if (evt.element === currentFocus) {
        this.state
          .enterEditing(evt.element)
          .mapErr((err) => this.state.eventsEmitter.onError?.(err));
        return false;
      }

      return true;
    }

    if (evt.targetType === 'TOKEN') {
      if (currentFocus?.contains(evt.token)) {
        this.state.enterEditing(evt.token).mapErr((err) => this.state.eventsEmitter.onError?.(err));
        return false;
      }
    }

    return true;
  };

  private onFocusRequestInEditingMode = (evt: JsedFocusRequestEvent) => {
    if (!this.state.cursor) {
      return false;
    }

    // FOCUS has been set to some FOCUSABLE...
    if (evt.targetType === 'FOCUSABLE') {
      this.state.exitEditing({ focusElement: evt.element });
      return false;
    }

    // FOCUS has been set to a TOKEN...
    if (evt.targetType === 'TOKEN') {
      const parent = token.getParent(evt.token);
      if (!this.state.cursor.isSameLine(evt.token)) {
        this.state.exitEditing({ focusElement: parent });
        return false;
      }

      this.state.cursor.place(evt.token); // calls handleCursorChange
      return true;
    }

    return false;
  };

  onFocusChange(focus: HTMLElement | null) {
    if (focus) this.state.legacyElementIndicator.setTarget(focus);
    if (this.state.useLegacyElementIndicator) {
      this.state.legacyElementIndicator.showIndicator(!!focus);
    }
    this.state.cssElementIndicator.setTarget(focus);
    if (this.state.useElementIndicator) {
      this.state.cssElementIndicator.showIndicator(!!focus);
    }
    if (this.state.mode === 'view' && focus && !isToken(focus)) {
      const line = findNextEditableLine(focus, this.state.document.root);
      if (line) {
        this.state.tokenizer.tokenizeLineAt(line);
      }
    }
    this.state.eventsEmitter.onFocusChange?.(focus);
  }

  /**
   * If the cursor finds itself in an untenable state...
   */
  onCursorError = (err: CursorError) => {
    this.state.eventsEmitter.onError?.(err);
  };
}
