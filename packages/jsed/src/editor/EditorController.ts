import * as token from '../lib/ops/token.js';
import type { CursorError } from '../cursor/lib/CursorState.js';
import type { EditorState } from './lib/EditorState.js';
import { isToken } from '../lib/core/taxonomy.js';
import type {
  UserInputChange,
  UserInputOpts,
  UserInputSelectionState
} from '../lib/input/UserInput.js';
import type { JsedFocusRequestEvent } from '../types.js';
import { findNextEditableLine } from '../lib/core/line.js';

/**
 * Handles incoming events for an Editor instance excluding actions fired by the user.
 *
 * This object should try to "route" to other objects but does carry high-level
 * "glue" logic.
 */
export class EditorController {
  static create(state: EditorState) {
    return new EditorController(state);
  }

  constructor(private state: EditorState) {}

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

  /**
   * When user types in the input...
   */
  onInputChange = (change: UserInputChange) => {
    if (this.state.isSuspended) return;
    if (!this.state.cursor || !this.state.cursor.isOnToken()) {
      return;
    }
    this.state.ops.processUserInput(change);
  };

  /**
   * When user changes the selection in the input...
   *
   * Pass this to the selection emitter after instantiation.
   */
  onInputSelectionChange = (selection: UserInputSelectionState) => {
    if (this.state.isSuspended) return;
    if (!this.state.cursor || !this.state.cursor.isOnToken()) {
      return;
    }
    this.state.cursor?.setStateFromSelection(selection);
  };

  /**
   * When the cursor changes its position because of some action it has been
   * commanded to do usually by the user... (eg due to delete operation).
   *
   * `opts.syncInput === false` skips all `userInput.*` side effects —
   * internal model updates (tokenizer keep-alive, nav focus, external
   * onCursorChange) still fire. Used for mid-typing cursor re-seating so
   * the user's in-flight input value is not clobbered by the head TOKEN's
   * pre-rewrite value.
   */
  onCursorChange = (seat?: HTMLElement, opts?: UserInputOpts) => {
    this.state.eventsEmitter.onCursorChange?.(seat);
    if (seat) {
      this.state.document.viewportScroller.scrollIntoViewIfHidden(seat, {
        vertical: 'nearest'
      });
      this.state.tokenizer.setCursorElement(seat);
      this.state.nav?.FOCUS(seat);
      if (opts?.syncInput !== false) {
        this.state.ops.syncInput(seat, opts?.inputCursorPosition);
      }
    }
  };

  /**
   * When the user causes a FOCUS change (click, touch, key bindings)...
   */
  onFocusRequest = (evt: JsedFocusRequestEvent) => {
    if (!this.state.cursor) {
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
    // Pre-tokenize line
    // If focus IS a TOKEN, then we handled it in onFocusRequest already.
    if (!this.state.cursor && focus && !isToken(focus)) {
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
