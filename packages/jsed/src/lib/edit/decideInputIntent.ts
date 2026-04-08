import type { UserInputChange } from '../../UserInput.js';

export type InputIntent =
  | {
      type: 'move-next-on-space';
      inputValue: string;
    }
  | {
      type: 'delete-current';
      inputValue: string;
      prependedSpace: false;
      finalTokenPreference: 'last-appended';
    }
  | {
      type: 'rewrite-current';
      inputValue: string;
      firstPart: string;
      appendedParts: string[];
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
export function decideInputIntent(change: UserInputChange): InputIntent {
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
      prependedSpace: false,
      finalTokenPreference: 'last-appended'
    };
  }

  const [firstPart, ...appendedParts] = inputValue.split(/\s+/).filter(Boolean);
  const prependedSpace = /^\s+/.test(inputValue);
  let finalTokenPreference: 'current-token' | 'last-appended' = 'last-appended';
  const containsSpace = inputValue.match(/^(\S+)(\s+)\S/);

  if (containsSpace) {
    const firstWord = containsSpace[1];
    const insertedSpace = containsSpace[2];
    const isFirstWord = firstWord.length === stop;
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
