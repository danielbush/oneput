import { ok, Result } from 'neverthrow';
import { isAnchor, isIsland, isLine, isToken } from '../core/taxonomy.js';
import * as token from '../token/token.js';
import type { EditorError, EditorState } from './EditorState.js';
import { CursorSelection } from '../selection/CursorSelection.js';
import type { InputCursorPosition, UserInputChange } from '../input/UserInput.js';
import { decideInputIntent } from '../input/decideInputIntent.js';
import { undoDeleteElement } from '../focus/focusable.js';

/**
 * Manages an edit session for a single document.
 *
 * In 'view' mode, user navigates the document and EM will ensure the FOCUS is
 * tokenized so the user can focus the CURSOR at a TOKEN within the FOCUS.  Once
 * the CURSOR is created, EM goes into 'edit' mode and the CURSOR handles
 * tokenizing if it moves past the initial LINE it started on.
 *
 */
export class EditorOps {
  static create(state: EditorState): EditorOps {
    return new EditorOps(state);
  }

  static createNull(state: EditorState): EditorOps {
    return new EditorOps(state);
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
    if (this.state.mode === 'view') {
      return this.state.enterEditing();
    }

    if (!this.state.cursor) {
      return this.state.enterEditing();
    }

    if (this.state.isSuspended) return ok(undefined);
    const current = this.state.cursor.getPlace();
    if (isToken(current)) {
      this.state.cursorOps.splitAtCursor();
      return ok(undefined);
    }

    return this.state.enterEditing(current);
  }

  /**
   * Returns false if nothing left to exit.
   */
  handleExit({ softExit }: { softExit: boolean } = { softExit: true }) {
    if (this.state.selection) {
      // Cancel selection: collapse wrappers and land the CURSOR on the head
      // (wherever the selection was extended to). Keeps edit mode.
      this.cancelSelectionAt(this.state.selection.getHead());
      return true;
    }
    if (this.state.mode === 'edit') {
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
   * Collapse any active selection and move the CURSOR to `target`.
   * Returns true if a selection was cancelled. Stays in edit mode.
   */
  private cancelSelectionAt(target: HTMLElement): boolean {
    if (!this.state.selection) return false;
    this.state.selection.collapse();
    this.state.selection = undefined;
    this.state.cursor?.place(target);
    return true;
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
    if (this.state.mode !== 'edit' || !this.state.cursor) return;
    if (!this.state.selection) {
      this.state.selection = CursorSelection.create({
        cursor: this.state.cursor,
        tokenizer: this.state.tokenizer,
        seed: this.state.cursor.getPlace(),
        document: this.state.document
      });
    }
    this.state.selection.extendNext();
  }

  /**
   * Extend the SELECTION one LINE_SIBLING backward from the current CURSOR.
   *
   * See `extendNext` for the full design sketch.
   */
  extendPrevious() {
    if (this.state.isSuspended) return;
    if (this.state.mode !== 'edit' || !this.state.cursor) return;
    if (!this.state.selection) {
      this.state.selection = CursorSelection.create({
        cursor: this.state.cursor,
        tokenizer: this.state.tokenizer,
        seed: this.state.cursor.getPlace(),
        document: this.state.document
      });
    }
    this.state.selection.extendPrevious();
  }

  movePrevious() {
    if (this.state.isSuspended) return;
    if (this.state.selection) {
      this.cancelSelectionAt(this.state.selection.getBackwardEnd());
      return;
    }
    if (this.state.mode === 'edit') {
      this.state.cursor?.movePrevious();
      return;
    }

    this.state.nav.UP_CHAIN();
  }

  moveNext() {
    if (this.state.isSuspended) return;
    if (this.state.selection) {
      this.cancelSelectionAt(this.state.selection.getForwardEnd());
      return;
    }
    if (this.state.mode === 'edit') {
      this.state.cursor?.moveNext();
      return;
    }

    this.state.nav.DOWN_CHAIN();
  }

  moveDown() {
    if (this.state.isSuspended) return;
    this.state.nav.SIB_NEXT();
  }

  moveUp() {
    if (this.state.isSuspended) return;
    this.state.nav.SIB_PREV();
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
      case 'move-next-on-space':
        cursor.moveNext();
        return;

      case 'delete-current': {
        cursor.delete({ type: intent.deletionType });
        this.state.notifyTextChange({ type: 'token-text-change', token: cursor.getPlace() });
        cursor.setStateFromInput(intent.inputValue);
        return;
      }

      case 'start-insert-after-current':
        cursor.setStateFromInput(intent.inputValue);
        return;

      case 'insert-after-current': {
        const lastToken = cursor.insertTextAfter(intent.insertedText, {
          inputCursorPosition: 'end'
        });
        cursor.setStateFromInput(intent.inputValue);
        if (lastToken) {
          this.state.notifyTextChange({ type: 'token-text-change', token: cursor.getPlace() });
        }
        return;
      }

      case 'start-insert-before-current':
        this.state.userInput.moveCursorToBeginning();
        cursor.setStateFromInput(intent.inputValue);
        return;

      case 'insert-before-current': {
        const lastToken = cursor.insertTextBefore(intent.insertedText, {
          inputCursorPosition: 'end'
        });
        cursor.setStateFromInput(intent.inputValue);
        if (lastToken) {
          this.state.notifyTextChange({ type: 'token-text-change', token: cursor.getPlace() });
        }
        return;
      }

      case 'rewrite-current': {
        const result = cursor.replaceWithText(intent.inputValue, {
          inputCursorPosition: intent.userTypedInteriorSpace ? 'beginning' : 'noChange'
        });
        cursor.setStateFromInput(intent.inputValue);
        if (result) {
          this.state.notifyTextChange({ type: 'token-text-change', token: cursor.getPlace() });
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
      if (isIsland(cursorElement) || isLine(cursorElement)) {
        // TODO: Handle 'Enter' which may be a different key binding.
        this.state.userInput.setPlaceholder('Hit Enter to edit this element');
      } else {
        this.state.userInput.setInputValue('(not a token)');
      }
    }
  };

  undo = () => {
    const rec = this.state.undo.undo();
    if (!rec) {
      return null;
    }
    console.log('-- start undo rec');
    for (const op of rec.ops.reverse()) {
      console.log(op.action);
      switch (op.action) {
        case 'place-cursor': {
          // We'll take this as advisory and do it only if we have a cursor.
          if (this.state.cursor) {
            this.state.cursor.place(op.target);
          }
          break;
        }

        // Element deletion
        case 'delete-element': {
          undoDeleteElement(op);
          break;
        }

        // Token / separator editing insertion
        case 'replace-text': {
          token.undoReplaceText(op);
          break;
        }

        case 'insert-token-after': {
          token.undoInsertAfter(op);
          break;
        }

        // Token deletion
        case 'anchorize-token':
        case 'delete-token': {
          token.undoRemove(op);
          break;
        }
      }
    }
    console.log('-- stop undo rec');
  };
}
