import { describe, expect, test } from 'vitest';
import { decideInputIntent } from '../decideInputIntent.js';
import type { UserInputChange } from '../../../UserInput.js';

function makeChange(overrides: Partial<UserInputChange>): UserInputChange {
  return {
    beforeValue: '',
    value: '',
    beforeRange: [0, 0],
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
      beforeRange: [0, 3],
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
      beforeValue: 'foo',
      value: '',
      beforeRange: [0, 3],
      range: [0, 0]
    });

    // act
    const intent = decideInputIntent(change, 'foo');

    // assert
    expect(intent).toEqual({
      type: 'delete-current',
      inputValue: '',
      deletionType: 'other'
    });
  });

  test('"b|foo" => "b |foo": rewrite-current detects interior space', () => {
    // arrange
    const change = makeChange({
      previousUserValue: 'foo',
      beforeValue: 'bfoo',
      value: 'b foo',
      beforeRange: [1, 1],
      range: [2, 2]
    });

    // act
    const intent = decideInputIntent(change, 'bfoo');

    // assert
    expect(intent).toEqual({
      type: 'rewrite-current',
      inputValue: 'b foo',
      userTypedInteriorSpace: true
    });
  });

  test('"foo |" => "foo b|" ==> "b|": insert-after-current', () => {
    // arrange
    const change = makeChange({
      beforeValue: 'foo ',
      value: 'foo b',
      beforeRange: [4, 4],
      range: [5, 5]
    });

    // act
    const intent = decideInputIntent(change, 'foo');

    // assert
    expect(intent).toEqual({
      type: 'insert-after-current',
      inputValue: 'foo b',
      insertedText: 'b'
    });
  });

  test('"| foo" => "b| foo" ==> "b|": insert-before-current', () => {
    // arrange
    const change = makeChange({
      beforeValue: ' foo',
      value: 'b foo',
      beforeRange: [0, 0],
      range: [1, 1]
    });

    // act
    const intent = decideInputIntent(change, 'foo');

    // assert
    expect(intent).toEqual({
      type: 'insert-before-current',
      inputValue: 'b foo',
      insertedText: 'b'
    });
  });

  test('"fo|o" => "fo |o": rewrite-current detects interior space', () => {
    // arrange
    const change = makeChange({
      beforeValue: 'foo',
      value: 'fo o',
      beforeRange: [2, 2],
      range: [3, 3]
    });

    // act
    const intent = decideInputIntent(change, 'foo');

    // assert
    expect(intent).toEqual({
      type: 'rewrite-current',
      inputValue: 'fo o',
      userTypedInteriorSpace: true
    });
  });
});
