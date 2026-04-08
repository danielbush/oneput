import { describe, expect, test } from 'vitest';
import { decideInputIntent } from '../edit/decideInputIntent.js';
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
  test('whitespace-only replacement becomes move-next-on-space', () => {
    // arrange
    const change = makeChange({
      value: ' ',
      previousRange: [0, 3],
      range: [1, 1]
    });

    // act
    const intent = decideInputIntent(change);

    // assert
    expect(intent).toEqual({
      type: 'move-next-on-space',
      inputValue: ' '
    });
  });

  test('empty value becomes delete-current', () => {
    // arrange
    const change = makeChange({
      previousValue: 'foo',
      value: '',
      previousRange: [0, 3],
      range: [0, 0]
    });

    // act
    const intent = decideInputIntent(change);

    // assert
    expect(intent).toEqual({
      type: 'delete-current',
      inputValue: '',
      prependedSpace: false,
      finalTokenPreference: 'last-appended'
    });
  });

  test('prepended whitespace keeps current-token preference for committed leading split', () => {
    // arrange
    const change = makeChange({
      priorValue: 'foo',
      previousValue: 'bfoo',
      value: 'b foo',
      previousRange: [1, 1],
      range: [2, 2]
    });

    // act
    const intent = decideInputIntent(change);

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

  test('mid-token split prefers the last appended token', () => {
    // arrange
    const change = makeChange({
      previousValue: 'foo',
      value: 'fo o',
      previousRange: [2, 2],
      range: [3, 3]
    });

    // act
    const intent = decideInputIntent(change);

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
