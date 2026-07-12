import { ok, Result } from 'neverthrow';
import { isAnchor, isOpaque, isLine, isToken } from '../../lib/core/taxonomy.js';
import * as token from '../../lib/ops/token.js';
import type { EditorError, EditorState } from './EditorState.js';
import type { InputCursorPosition, UserInputChange } from '../../input/UserInput.js';
import { decideInputIntent } from '../../input/decideInputIntent.js';
import { ensureSeparatorAfter, ensureSeparatorBefore } from '../../lib/ops/space.js';

/**
 * Handle certain important editor events: keys, undo/redo, input + motiona and selection.
 */
export class EditorEventHandler {
  static create(state: EditorState): EditorEventHandler {
    return new EditorEventHandler(state);
  }

  static createNull(state: EditorState): EditorEventHandler {
    return new EditorEventHandler(state);
  }

  constructor(private state: EditorState) {}

  /**
   * Handle the user pressing Enter based on the current editing context.
   *
   * - view mode: enter edit mode from the current FOCUS
   * - edit mode on a TOKEN: split before the current TOKEN
   * - edit mode on a non-TOKEN target: descend into that target
   */
  handleEnter(): Result<void, EditorError> {
    // This allows us to edit via the "Edit..." menu .
    if (!this.state.cursor) {
      return this.state.enterEditing();
    }

    if (!this.state.cursor) {
      return this.state.enterEditing();
    }

    if (this.state.isSuspended) return ok(undefined);
    const current = this.state.cursor.getPlace();
    if (isToken(current)) {
      this.state.cursor.splitAtToken();
      return ok(undefined);
    }

    return this.state.enterEditing(current);
  }

  /**
   * Returns false if nothing left to exit.
   */
  handleExit({ softExit }: { softExit: boolean } = { softExit: true }) {
    // Cancel selection: collapse wrappers and land the CURSOR on the head
    // (wherever the selection was extended to). Keeps edit mode.
    if (this.state.cursor?.cancelSelection()) {
      return true;
    }
    if (this.state.cursor) {
      this.state.exitEditing({ softExit });
      return true;
    }
    return false;
  }

  handleDelete(evt?: KeyboardEvent) {
    if (this.state.cursor) {
      const curr = this.state.cursor.getPlace();
      if (isAnchor(curr)) {
        // If we don't preventDefault...
        // 1) cursor.delete may move the cursor to a new token
        // 2) the input will be programmatically updated (which won't normally
        // trigger an input change event)
        // 3) this delete key event or related appears to then delete the new
        // input value in the input element which looks like a user /
        // non-programmatic edit
        // 4) which triggers a normal user-based input change event
        // 5) which deletes an additional token!
        evt?.preventDefault();
        this.state.cursor.delete();
      }
    }
  }

  /**
   * Extend the SELECTION one LINE_SIBLING forward from the current CURSOR.
   *
   * Stub for the selections feature (work/active/20260414.feat.selections.md).
   * When implemented, this will seed a CursorSelection from the current TOKEN
   * on first call and grow (or shrink) its head via LINE_SIBLING traversal on
   * subsequent calls. Noop outside edit mode.
   */
  extendNext() {
    if (this.state.isSuspended) return;
    if (!this.state.cursor) return;
    this.state.cursor.extendNext();
  }

  /**
   * Extend the SELECTION one LINE_SIBLING backward from the current CURSOR.
   *
   * See `extendNext` for the full design sketch.
   */
  extendPrevious() {
    if (this.state.isSuspended) return;
    if (!this.state.cursor) return;
    this.state.cursor.extendPrevious();
  }

  movePrevious() {
    if (this.state.isSuspended) return;
    if (this.state.cursor) {
      this.state.cursor.movePrevious();
      return;
    }

    this.state.nav.UP_CHAIN();
  }

  moveNext() {
    if (this.state.isSuspended) return;
    if (this.state.cursor) {
      this.state.cursor.moveNext();
      return;
    }

    this.state.nav.DOWN_CHAIN();
  }

  moveDown() {
    if (this.state.isSuspended) return;
    this.state.nav.SIB_NEXT_OR_UP();
  }

  moveUp() {
    if (this.state.isSuspended) return;
    this.state.nav.SIB_PREV_OR_UP();
  }

  scrollActiveTargetIntoView(): boolean {
    const current = this.state.cursor?.getPlace();
    if (current && isToken(current)) {
      this.state.document.viewportScroller.scrollIntoViewCentered(current);
      return true;
    }

    const focus = this.state.nav.getFocus();
    if (!focus) {
      return false;
    }

    this.state.document.viewportScroller.scrollIntoViewCentered(focus, {
      oversizedVertical: 'start'
    });
    return true;
  }

  /**
   * When user types in the input...
   */
  processUserInput = (change: UserInputChange) => {
    const cursor = this.state.cursor;
    if (!cursor) {
      console.error(`'cursor' not set`);
      return;
    }
    const currentToken = cursor.getPlace();
    const currentTokenValue = token.getValue(currentToken);
    const intent = decideInputIntent(change, currentTokenValue);

    if (isAnchor(currentToken) && change.value === '') {
      return;
    }

    // console.log('decided intent', JSON.stringify(intent, null, 2));

    switch (intent.type) {
      case 'start-append-current':
        void this.state.userInput.setInputValue(currentTokenValue);
        this.state.userInput.moveCursorToEnd();
        cursor.setStateFromSelection('CURSOR_AT_END');
        cursor.setStateFromInput(currentTokenValue);
        return;

      case 'move-next-on-space':
        cursor.moveNext();
        return;

      case 'delete-current': {
        cursor.delete({ type: intent.deletionType });
        this.state.eventsEmitter.emitTextChange({
          type: 'token-text-change',
          token: cursor.getPlace()
        });
        cursor.setStateFromInput(intent.inputValue);
        return;
      }

      case 'start-insert-after-current': {
        cursor.setStateFromSelection('CURSOR_AT_END');
        cursor.setStateFromInput(intent.inputValue);
        const sib = cursor.getPlace();
        ensureSeparatorAfter(sib);
        return;
      }

      case 'insert-after-current': {
        const lastToken = cursor.insertTextAfter(intent.insertedText, {
          inputCursorPosition: 'end'
        });
        cursor.setStateFromInput(intent.inputValue);
        if (lastToken) {
          this.state.eventsEmitter.emitTextChange({
            type: 'token-text-change',
            token: cursor.getPlace()
          });
        }
        return;
      }

      case 'start-insert-before-current': {
        this.state.userInput.moveCursorToBeginning();
        cursor.setStateFromSelection('CURSOR_AT_BEGINNING');
        cursor.setStateFromInput(intent.inputValue);
        const sib = cursor.getPlace();
        ensureSeparatorBefore(sib);
        return;
      }

      case 'insert-before-current': {
        const lastToken = cursor.insertTextBefore(intent.insertedText, {
          inputCursorPosition: 'end'
        });
        cursor.setStateFromInput(intent.inputValue);
        if (lastToken) {
          this.state.eventsEmitter.emitTextChange({
            type: 'token-text-change',
            token: cursor.getPlace()
          });
        }
        return;
      }

      case 'rewrite-current': {
        const result = cursor.replaceWithText(intent.inputValue, {
          inputCursorPosition: intent.userTypedInteriorSpace ? 'beginning' : 'noChange'
        });
        cursor.setStateFromInput(intent.inputValue);
        if (result) {
          this.state.eventsEmitter.emitTextChange({
            type: 'token-text-change',
            token: cursor.getPlace()
          });
        }
        return;
      }
    }
  };

  /**
   * Intended to be triggered when the Cursor moves (.place).
   *
   * Cursor motion is complicated, the Editor defers to it to handle the motion.
   * So it needs a callback mechanism after it has decided on a place to sit.
   * This function does the related post-processing for the editor.
   */
  syncInput = (cursorElement: HTMLElement, inputCursorPosition?: InputCursorPosition) => {
    this.state.userInput.resetPlaceholder();
    this.state.userInput.enable(true);
    if (isToken(cursorElement)) {
      this.state.userInput.focus();
      this.state.userInput.setInputValue(token.getValue(cursorElement)).then(() => {
        switch (inputCursorPosition) {
          case 'noChange':
            break;
          case 'beginning':
            this.state.userInput.moveCursorToBeginning();
            break;
          case 'end':
            this.state.userInput.moveCursorToEnd();
            break;
          default:
            this.state.userInput.selectAll();
        }
      });
    } else {
      this.state.userInput.enable(false);
      this.state.userInput.setInputValue('');
      if (isOpaque(cursorElement) || isLine(cursorElement)) {
        // TODO: Handle 'Enter' which may be a different key binding.
        this.state.userInput.setPlaceholder('Hit Enter to edit this element');
      } else {
        this.state.userInput.setInputValue('(not a token)');
      }
    }
  };

  undo = () => {
    const rec = this.state.undo.popUndo();
    rec?.undo(this.state);
  };

  redo = () => {
    const rec = this.state.undo.popRedo();
    rec?.redo(this.state);
  };
}
