import { describe, expect, test } from 'vitest';
import { decideInputIntent } from '../decideInputIntent.js';
import type { UserInputChange } from '../../UserInput.js';

function makeChange(overrides: Partial<UserInputChange>): UserInputChange {
  return {
    previousValue: '',
    value: '',
    previousRange: [0, 0],
    range: [0, 0],
    cause: 'user',
    ...overrides
  };
}

describe('decideInputIntent', () => {
  test('"[foo]" => " " ==> "[bar]": move-next-on-space', () => {
    // arrange
    const change = makeChange({
      value: ' ',
      previousRange: [0, 3],
      range: [1, 1]
    });

    // act
    const intent = decideInputIntent(change, 'foo');

    // assert
    expect(intent).toEqual({
      type: 'move-next-on-space',
      inputValue: ' '
    });
  });

  test('"[foo]" => "|": delete-current', () => {
    // arrange
    const change = makeChange({
      previousValue: 'foo',
      value: '',
      previousRange: [0, 3],
      range: [0, 0]
    });

    // act
    const intent = decideInputIntent(change, 'foo');

    // assert
    expect(intent).toEqual({
      type: 'delete-current',
      inputValue: '',
      finalTokenPreference: 'last-appended'
    });
  });

  test('"b|foo" => "b |foo" ==> "b|": rewrite-current prefers current-token on leading split commit', () => {
    // arrange
    const change = makeChange({
      priorValue: 'foo',
      previousValue: 'bfoo',
      value: 'b foo',
      previousRange: [1, 1],
      range: [2, 2]
    });

    // act
    const intent = decideInputIntent(change, 'bfoo');

    // assert
    expect(intent).toEqual({
      type: 'rewrite-current',
      inputValue: 'b foo',
      firstPart: 'b',
      appendedParts: ['foo'],
      prependedSpace: false,
      finalTokenPreference: 'current-token'
    });
  });

  test('"foo |" => "foo b|" ==> "b|": insert-after-current', () => {
    // arrange
    const change = makeChange({
      previousValue: 'foo ',
      value: 'foo b',
      previousRange: [4, 4],
      range: [5, 5]
    });

    // act
    const intent = decideInputIntent(change, 'foo');

    // assert
    expect(intent).toEqual({
      type: 'insert-after-current',
      inputValue: 'foo b',
      insertedParts: ['b'],
      finalTokenPreference: 'last-inserted'
    });
  });

  test('"| foo" => "b| foo" ==> "b|": insert-before-current', () => {
    // arrange
    const change = makeChange({
      previousValue: ' foo',
      value: 'b foo',
      previousRange: [0, 0],
      range: [1, 1]
    });

    // act
    const intent = decideInputIntent(change, 'foo');

    // assert
    expect(intent).toEqual({
      type: 'insert-before-current',
      inputValue: 'b foo',
      insertedParts: ['b'],
      finalTokenPreference: 'last-inserted'
    });
  });

  test('"fo|o" => "fo o|" ==> "o|": rewrite-current prefers last-appended on mid-token split', () => {
    // arrange
    const change = makeChange({
      previousValue: 'foo',
      value: 'fo o',
      previousRange: [2, 2],
      range: [3, 3]
    });

    // act
    const intent = decideInputIntent(change, 'foo');

    // assert
    expect(intent).toEqual({
      type: 'rewrite-current',
      inputValue: 'fo o',
      firstPart: 'fo',
      appendedParts: ['o'],
      prependedSpace: false,
      finalTokenPreference: 'last-appended'
    });
  });
});
