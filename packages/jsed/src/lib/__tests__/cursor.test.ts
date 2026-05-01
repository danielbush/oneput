import { describe, expect, test } from 'vitest';
import { getCursorStateFromInput, getCursorStateFromSelection } from '../cursor.js';

describe('getCursorStateFromInput', () => {
  test('trailing space maps to CURSOR_INSERT_AFTER', () => {
    // arrange
    const input = 'hello ';

    // act
    const state = getCursorStateFromInput(input);

    // assert
    expect(state).toBe('CURSOR_INSERT_AFTER');
  });

  test('leading space maps to CURSOR_INSERT_BEFORE', () => {
    // arrange
    const input = ' hello';

    // act
    const state = getCursorStateFromInput(input);

    // assert
    expect(state).toBe('CURSOR_INSERT_BEFORE');
  });

  test('plain input maps to CURSOR_OVERWRITE', () => {
    // arrange
    const input = 'hello';

    // act
    const state = getCursorStateFromInput(input);

    // assert
    expect(state).toBe('CURSOR_OVERWRITE');
  });
});

describe('getCursorStateFromSelection', () => {
  test('selection at beginning maps to CURSOR_PREPEND', () => {
    // arrange
    const selection = 'CURSOR_AT_BEGINNING';

    // act
    const state = getCursorStateFromSelection(selection);

    // assert
    expect(state).toBe('CURSOR_PREPEND');
  });

  test('selection at end maps to CURSOR_APPEND', () => {
    // arrange
    const selection = 'CURSOR_AT_END';

    // act
    const state = getCursorStateFromSelection(selection);

    // assert
    expect(state).toBe('CURSOR_APPEND');
  });

  test('other selections map to CURSOR_OVERWRITE', () => {
    // arrange
    const selection = 'SELECT_ALL';

    // act
    const state = getCursorStateFromSelection(selection);

    // assert
    expect(state).toBe('CURSOR_OVERWRITE');
  });
});
