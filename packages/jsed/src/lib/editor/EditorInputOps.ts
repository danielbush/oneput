import type { EditorState } from './EditorState.js';
import { decideInputIntent } from '../dom/decideInputIntent.js';
import * as token from '../dom/token.js';
import type { UserInputChange } from '../../UserInput.js';
import type { Cursor } from '../../Cursor.js';
import { isIsland, isLine, isToken } from '../dom/taxonomy.js';
import type { CursorChangeOpts } from '../cursor/CursorState.js';

export class EditorInputOps {
  static create(state: EditorState) {
    return new EditorInputOps(state);
  }

  constructor(private state: EditorState) {}

  /**
   * When user types in the input...
   */
  processUserInput = (change: UserInputChange) => {
    let lastToken: HTMLElement | null = null;
    const cursor = this.state.cursor;
    if (!cursor) {
      console.error(`'cursor' not set`);
      return;
    }
    const currentToken = cursor.getPlace();
    const currentTokenValue = token.getValue(currentToken);
    const intent = decideInputIntent(change, currentTokenValue);

    // console.log('decided intent', JSON.stringify(intent, null, 2));

    switch (intent.type) {
      case 'move-next-on-space':
        cursor.moveNext();
        return;

      case 'delete-current': {
        const current = cursor.getPlace();
        cursor.delete();
        this.state.notifyTextChange({ type: 'token-text-change', token: current });
        cursor.setStateFromInput(intent.inputValue);
        return;
      }

      case 'start-insert-after-current':
        cursor.setStateFromInput(intent.inputValue);
        return;

      case 'insert-after-current':
        lastToken = cursor.insertTextAfter(intent.insertedText);
        cursor.setStateFromInput(intent.inputValue);
        this.updateInput(cursor).finally(() => {
          this.state.userInput.moveCursorToEnd();
        });
        if (lastToken) {
          this.state.notifyTextChange({ type: 'token-text-change', token: lastToken });
        }
        return;

      case 'start-insert-before-current':
        this.state.userInput.moveCursorToBeginning();
        cursor.setStateFromInput(intent.inputValue);
        return;

      case 'insert-before-current':
        lastToken = cursor.insertTextBefore(intent.insertedText);
        cursor.setStateFromInput(intent.inputValue);
        this.updateInput(cursor).finally(() => {
          this.state.userInput.moveCursorToEnd();
        });
        if (lastToken) {
          this.state.notifyTextChange({ type: 'token-text-change', token: lastToken });
        }
        return;

      case 'rewrite-current':
        lastToken = cursor.replaceWithText(intent.inputValue);
        cursor.setStateFromInput(intent.inputValue);
        this.updateInput(cursor);
        if (lastToken) {
          this.state.notifyTextChange({ type: 'token-text-change', token: lastToken });
        }
        return;
    }
  };

  private updateInput = (cursor: Cursor) => {
    const finalToken = cursor.getPlace();
    this.state.userInput.focus();
    return this.state.userInput
      .setInputValue(token.getValue(finalToken))
      .then(() => {
        this.state.nav.FOCUS(finalToken);
      })
      .catch((err) => {
        // TODO: close cursor?
        console.warn('handleInputChange error:', err);
      });
  };

  processCursorChange = (el: HTMLElement, opts?: CursorChangeOpts) => {
    this.state.tokenizer.setCursorElement(el);
    this.state.nav?.FOCUS(el);
    this.state.eventsEmitter.onCursorChange?.(el);

    if (opts?.syncInput === false) return;

    // Sync input
    this.state.userInput.resetPlaceholder();
    this.state.userInput.enable(true);
    if (isToken(el)) {
      this.state.userInput.focus();
      this.state.userInput.setInputValue(token.getValue(el)).then(() => {
        this.state.userInput.selectAll();
      });
    } else {
      this.state.userInput.enable(false);
      this.state.userInput.setInputValue('');
      if (isIsland(el) || isLine(el)) {
        // TODO: Handle 'Enter' which may be a different key binding.
        this.state.userInput.setPlaceholder('Hit Enter to edit this element');
      } else {
        this.state.userInput.setInputValue('(not a token)');
      }
    }
  };
}
