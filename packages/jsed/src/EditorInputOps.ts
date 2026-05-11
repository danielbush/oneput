import type { Editor } from './Editor';
import { decideInputIntent } from './lib/decideInputIntent.js';
import * as token from './lib/token.js';
import * as space from './lib/space.js';
import type { UserInputChange } from './UserInput';
import type { Cursor } from './Cursor.js';
import { isIsland, isLine, isToken } from './lib/taxonomy.js';

export class EditorInputOps {
  static create(editor: Editor) {
    return new EditorInputOps(editor);
  }

  constructor(private editor: Editor) {}

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
        this.editor.notifyTextChange({ type: 'token-text-change', token: current });
        cursor.setStateFromInput(intent.inputValue);
        return;
      }

      case 'insert-after-current':
        for (const part of intent.insertedParts.reverse()) {
          const insertedToken = token.createToken(part);
          token.insertAfter(insertedToken, currentToken);
          space.ensureSpaceAfter(currentToken);
          if (!lastToken) {
            lastToken = insertedToken;
          }
        }
        const inserted = lastToken;
        if (inserted) {
          this.editor.notifyTextChange({ type: 'token-text-change', token: inserted });
        }
        break;

      case 'insert-before-current':
        for (const part of intent.insertedParts) {
          const insertedToken = token.createToken(part);
          token.insertBefore(insertedToken, currentToken);
          space.ensureSpaceAfter(insertedToken);
          lastToken = insertedToken;
        }
        if (lastToken) {
          this.editor.notifyTextChange({ type: 'token-text-change', token: lastToken });
        }
        break;

      case 'rewrite-current':
        cursor.replace(intent.firstPart);
        for (const part of intent.appendedParts.reverse()) {
          const appendedToken = cursor.append(part);
          if (!lastToken) {
            lastToken = appendedToken;
          }
        }
        if (intent.prependedSpace) {
          this.editor.userInput.moveCursorToBeginning();
        }
        this.editor.notifyTextChange({ type: 'token-text-change', token: currentToken });
        break;
    }

    const finalToken =
      intent.finalTokenPreference === 'current-token' ? cursor.getPlace() : lastToken;

    if (finalToken) {
      cursor.place(finalToken);
      this.editor.userInput.focus();
      this.editor.userInput
        .setInputValue(token.getValue(finalToken))
        .then(() => {
          this.editor.nav.FOCUS(finalToken);
          this.editor.userInput.moveCursorToEnd();
          cursor.setStateFromInput(intent.inputValue);
        })
        .catch((err) => {
          // TODO: close cursor?
          console.warn('handleInputChange error:', err);
        });
    } else {
      cursor.setStateFromInput(intent.inputValue);
    }
  };

  udpateWithCursorChange = (el: HTMLElement) => {
    if (isToken(el)) {
      this.editor.userInput.focus();
      this.editor.userInput.setInputValue(token.getValue(el)).then(() => {
        this.editor.userInput.selectAll();
      });
    } else {
      this.editor.userInput.enable(false);
      this.editor.userInput.setInputValue('');
      if (isIsland(el) || isLine(el)) {
        // TODO: Handle 'Enter' which may be a different key binding.
        this.editor.userInput.setPlaceholder('Hit Enter to edit this element');
      } else {
        this.editor.userInput.setInputValue('(not a token)');
      }
    }
  };
}
