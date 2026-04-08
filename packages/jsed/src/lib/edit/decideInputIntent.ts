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
      finalTokenPreference: 'last-appended';
    }
  | {
      /**
       * "foo|" => "foo |" => "foo b|" ==> "b|"
       */
      type: 'insert-after-current';
      inputValue: string;
      insertedParts: string[];
      finalTokenPreference: 'last-inserted';
    }
  | {
      /**
       * "|foo" => " |foo" ==> "| foo" => "b| foo" ==> "b|"
       */
      type: 'insert-before-current';
      inputValue: string;
      insertedParts: string[];
      finalTokenPreference: 'last-inserted';
    }
  | {
      /**
       * "fo|o" => " fo |o" ==> "[o]"
       */
      type: 'rewrite-current';
      inputValue: string;
      firstPart: string;
      appendedParts: string[];
      /**
       * Preserves the leading-space cursor rewrite:
       * "|foo" => " |foo" ==> "| foo"
       */
      prependedSpace: boolean;
      finalTokenPreference: 'current-token' | 'last-appended';
    };

/**
 * Interpret a user input transition as a higher-level edit intent.
 *
 * This is the logic center of EditManager.handleInputChange(...): it turns the
 * raw input value plus before/after selection state into a small semantic
 * instruction, leaving DOM edits and CURSOR choreography to the caller.
 */
export function decideInputIntent(change: UserInputChange, currentTokenValue: string): InputIntent {
  const { value: inputValue, previousValue, previousRange, range } = change;
  const [, previousStop] = previousRange;
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
      inputValue,
      // prependedSpace: false,
      finalTokenPreference: 'last-appended'
    };
  }

  const insertAfterPrefix = `${currentTokenValue} `;
  if (previousValue === insertAfterPrefix && inputValue.startsWith(insertAfterPrefix)) {
    const insertedParts = inputValue.slice(insertAfterPrefix.length).split(/\s+/).filter(Boolean);
    if (insertedParts.length > 0) {
      return {
        type: 'insert-after-current',
        inputValue,
        insertedParts,
        finalTokenPreference: 'last-inserted'
      };
    }
  }

  const insertBeforeSuffix = ` ${currentTokenValue}`;
  if (previousValue === insertBeforeSuffix && inputValue.endsWith(insertBeforeSuffix)) {
    const insertedParts = inputValue
      .slice(0, inputValue.length - insertBeforeSuffix.length)
      .split(/\s+/)
      .filter(Boolean);
    if (insertedParts.length > 0) {
      return {
        type: 'insert-before-current',
        inputValue,
        insertedParts,
        finalTokenPreference: 'last-inserted'
      };
    }
  }

  const [firstPart, ...appendedParts] = inputValue.split(/\s+/).filter(Boolean);
  const prependedSpace = /^\s+/.test(inputValue);
  let finalTokenPreference: 'current-token' | 'last-appended' = 'last-appended';
  const containsSpace = inputValue.match(/^(\S+)(\s+)\S/);

  if (containsSpace) {
    const firstWord = containsSpace[1];
    const insertedSpace = containsSpace[2];
    const isFirstWord = firstWord.length === stop;
    /**
     * "b|foo" => "b |foo"
     */
    const isLeadingSplitCommit =
      previousStop === firstWord.length &&
      stop === firstWord.length + insertedSpace.length &&
      !!change.priorValue &&
      previousValue.endsWith(change.priorValue) &&
      firstWord === previousValue.slice(0, previousValue.length - change.priorValue.length);

    if (isFirstWord || isLeadingSplitCommit) {
      finalTokenPreference = 'current-token';
    }
  }

  return {
    type: 'rewrite-current',
    inputValue,
    firstPart,
    appendedParts,
    prependedSpace,
    finalTokenPreference
  };
}
