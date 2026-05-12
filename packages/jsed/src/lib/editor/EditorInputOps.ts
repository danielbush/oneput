import type { EditorState } from './EditorState.js';
import { decideInputIntent } from '../dom/decideInputIntent.js';
import * as token from '../dom/token.js';
import type { UserInputChange } from '../../UserInput.js';
import type { Cursor } from '../../Cursor.js';
import { isIsland, isLine, isToken } from '../dom/taxonomy.js';

export class EditorInputOps {
  static create(state: EditorState) {
    return new EditorInputOps(state);
  }

  constructor(private state: EditorState) {}

  /**
   * When user types in the input...
   */
  updateWithInputChange = (change: UserInputChange, cursor: Cursor) => {
    let lastToken: HTMLElement | null = null;
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
        this.updateInput(cursor);
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
        this.updateInput(cursor);
        if (lastToken) {
          this.state.notifyTextChange({ type: 'token-text-change', token: lastToken });
        }
        return;

      case 'rewrite-current':
        cursor.replace(intent.firstPart);
        for (const part of intent.appendedParts.reverse()) {
          const appendedToken = cursor.append(part);
          if (!lastToken) {
            lastToken = appendedToken;
          }
        }
        this.state.notifyTextChange({ type: 'token-text-change', token: currentToken });
        const finalToken =
          intent.finalTokenPreference === 'current-token' ? cursor.getPlace() : lastToken;
        if (finalToken) {
          cursor.place(finalToken);
          cursor.setStateFromInput(intent.inputValue);
          this.updateInput(cursor);
        } else {
          cursor.setStateFromInput(intent.inputValue);
        }
        return;
    }
  };

  private updateInput = (cursor: Cursor) => {
    const finalToken = cursor.getPlace();
    this.state.userInput.focus();
    this.state.userInput
      .setInputValue(token.getValue(finalToken))
      .then(() => {
        this.state.nav.FOCUS(finalToken);
        this.state.userInput.moveCursorToEnd();
      })
      .catch((err) => {
        // TODO: close cursor?
        console.warn('handleInputChange error:', err);
      });
  };

  udpateWithCursorChange = (el: HTMLElement) => {
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
