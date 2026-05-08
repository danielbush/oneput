import { describe, expect, test } from 'vitest';
import { deriveCursorVisuals } from '../cursor.js';

describe('deriveCursorVisuals', () => {
  describe('caret indicator', () => {
    test.each([
      ['CURSOR_AT_BEGINNING', true],
      ['CURSOR_AT_MIDDLE', true],
      ['CURSOR_AT_END', true],
      ['SELECT_ALL', false],
      ['SELECT_PARTIAL', false],
      ['EMPTY', false]
    ] as const)('selection %s → caret=%s', (selection, expected) => {
      // arrange + act
      const { caret } = deriveCursorVisuals(selection, 'hello');

      // assert
      expect(caret).toBe(expected);
    });

    test('null selection → caret=false', () => {
      // arrange + act
      const { caret } = deriveCursorVisuals(null, 'hello');

      // assert
      expect(caret).toBe(false);
    });
  });

  describe('marker', () => {
    test('AT_BEGINNING with leading space → INSERT_BEFORE', () => {
      // arrange + act
      const { marker } = deriveCursorVisuals('CURSOR_AT_BEGINNING', ' hello');

      // assert
      expect(marker).toBe('CURSOR_INSERT_BEFORE');
    });

    test('AT_BEGINNING with no leading space → PREPEND', () => {
      // arrange + act
      const { marker } = deriveCursorVisuals('CURSOR_AT_BEGINNING', 'hello');

      // assert
      expect(marker).toBe('CURSOR_PREPEND');
    });

    test('AT_END with trailing space → INSERT_AFTER', () => {
      // arrange + act
      const { marker } = deriveCursorVisuals('CURSOR_AT_END', 'hello ');

      // assert
      expect(marker).toBe('CURSOR_INSERT_AFTER');
    });

    test('AT_END with no trailing space → APPEND', () => {
      // arrange + act
      const { marker } = deriveCursorVisuals('CURSOR_AT_END', 'hello');

      // assert
      expect(marker).toBe('CURSOR_APPEND');
    });

    test.each(['CURSOR_AT_MIDDLE', 'SELECT_ALL', 'SELECT_PARTIAL', 'EMPTY'] as const)(
      '%s → no marker (regardless of boundary spaces)',
      (selection) => {
        // arrange + act
        const { marker } = deriveCursorVisuals(selection, ' hello ');

        // assert
        expect(marker).toBeNull();
      }
    );

    test('null selection → no marker', () => {
      // arrange + act
      const { marker } = deriveCursorVisuals(null, ' hello ');

      // assert
      expect(marker).toBeNull();
    });
  });
});
