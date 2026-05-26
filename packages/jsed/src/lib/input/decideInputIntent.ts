import type { CharDeletion, TokenDeletion } from '../cursor/CursorTextOps.js';
import type { UserInputChange } from './UserInput.js';

/*
Notation

"..." represents the current input
"|" = input cursor position in input
"[...]" = selection range
=> user-initiated transformation
==> is a transformation performed automatically, not by the user
*/

export type InputIntent =
  | {
      /**
       * "[foo]" => " " ==> "[bar]"
       */
      type: 'move-next-on-space';
      inputValue: string;
    }
  | {
      /**
       * "[foo]" => "|"
       */
      type: 'delete-current';
      inputValue: string;
      deletionType: CharDeletion | TokenDeletion;
    }
  | {
      /**
       * "foo|" => "foo |" => "foo b|" ==> "b|"
       */
      type: 'insert-after-current';
      inputValue: string;
      insertedText: string;
    }
  | {
      /**
       * "|foo" => " |foo" ==> "| foo" => "b| foo" ==> "b|"
       */
      type: 'insert-before-current';
      inputValue: string;
      insertedText: string;
    }
  | {
      /**
       * "fo|o" => " fo |o" ==> "[o]"
       */
      type: 'rewrite-current';
      inputValue: string;
      userTypedInteriorSpace: boolean;
    }
  | { type: 'start-insert-before-current'; inputValue: string }
  | { type: 'start-insert-after-current'; inputValue: string };

/**
 * Interpret a user input transition as a higher-level edit intent.
 *
 * This is the logic center of Editor.handleInputChange(...): it turns the
 * raw input value plus before/after selection state into a small semantic
 * instruction, leaving DOM edits and CURSOR choreography to the caller.
 */
export function decideInputIntent(change: UserInputChange, currentTokenValue: string): InputIntent {
  const { value: inputValue, beforeValue, beforeRange, range } = change;
  const [, beforeStop] = beforeRange;
  const [, stop] = range;
  const userCursorPos = stop ? stop - 1 : null;
  const userPreviousCursorPos = beforeStop ? beforeStop - 1 : null;

  if (/^\s+$/.test(inputValue)) {
    return {
      type: 'move-next-on-space',
      inputValue
    };
  }

  if (inputValue === '') {
    const userIsBackspacingSingleChars =
      range[0] === range[1] &&
      range[0] === 0 &&
      beforeRange[0] === beforeRange[1] &&
      beforeRange[0] === 1;
    return {
      type: 'delete-current',
      inputValue,
      deletionType: userIsBackspacingSingleChars ? 'charDeletion' : 'tokenDeletion'
    };
  }

  const insertAfterPrefix = `${currentTokenValue} `;
  if (inputValue === insertAfterPrefix) {
    return {
      type: 'start-insert-after-current',
      inputValue
    };
  }
  if (beforeValue === insertAfterPrefix && inputValue.startsWith(insertAfterPrefix)) {
    const insertedText = inputValue.slice(insertAfterPrefix.length);
    return {
      type: 'insert-after-current',
      inputValue,
      insertedText
    };
  }

  const insertBeforeSuffix = ` ${currentTokenValue}`;
  if (inputValue === insertBeforeSuffix) {
    return {
      type: 'start-insert-before-current',
      inputValue
    };
  }
  if (beforeValue === insertBeforeSuffix && inputValue.endsWith(insertBeforeSuffix)) {
    const insertedText = inputValue.slice(0, inputValue.length - insertBeforeSuffix.length);
    return {
      type: 'insert-before-current',
      inputValue,
      insertedText
    };
  }

  /**
   * "b|foo" => "ba|foo" - containsSpace = false
   * "b|foo" => "b |foo" - containsSpace = true, userTypedInteriorSpace = true
   */
  const containsSpace = inputValue.match(/^(\S+)(\s+)\S/);
  let userTypedInteriorSpace = false;
  if (containsSpace) {
    const firstWord = containsSpace[1];
    const insertedSpace = containsSpace[2];
    userTypedInteriorSpace =
      userCursorPos === firstWord.length - 1 + insertedSpace.length &&
      userPreviousCursorPos === firstWord.length - 1;
    // !!change.previousUserValue &&
    // beforeValue.endsWith(change.previousUserValue) &&
    // firstWord === beforeValue.slice(0, beforeValue.length - change.previousUserValue.length);
  }

  return {
    type: 'rewrite-current',
    inputValue,
    userTypedInteriorSpace
  };
}
