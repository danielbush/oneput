import type { UserInputChange } from '../../UserInput.js';

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
      firstPart: string;
      appendedParts: string[];
      finalTokenPreference: 'current-token' | 'last-appended';
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

  if (/^\s+$/.test(inputValue)) {
    return {
      type: 'move-next-on-space',
      inputValue
    };
  }

  if (inputValue === '') {
    return {
      type: 'delete-current',
      inputValue
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
    // }
  }

  const [firstPart, ...appendedParts] = inputValue.split(/\s+/).filter(Boolean);
  let finalTokenPreference: 'current-token' | 'last-appended' = 'last-appended';

  /**
   * "b|foo" => "b |foo"
   */
  const containsSpace = inputValue.match(/^(\S+)(\s+)\S/);
  if (containsSpace) {
    const firstWord = containsSpace[1];
    const insertedSpace = containsSpace[2];
    // const isFirstWord = firstWord.length === stop;
    const isLeadingSplitCommit =
      beforeStop === firstWord.length &&
      stop === firstWord.length + insertedSpace.length &&
      !!change.previousUserValue &&
      beforeValue.endsWith(change.previousUserValue) &&
      firstWord === beforeValue.slice(0, beforeValue.length - change.previousUserValue.length);

    // if (isFirstWord || isLeadingSplitCommit) {
    if (isLeadingSplitCommit) {
      finalTokenPreference = 'current-token';
    }
  }

  return {
    type: 'rewrite-current',
    inputValue,
    firstPart,
    appendedParts,
    finalTokenPreference
  };
}
