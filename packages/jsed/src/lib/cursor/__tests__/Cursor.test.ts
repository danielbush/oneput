import { describe, expect, test } from 'vitest';
import { makeRoot, p } from '../../../test/util.js';
import { JsedDocument } from '../../../JsedDocument.js';
import { Tokenizer } from '../../token/Tokenizer.js';
import { CursorOps } from '../CursorOps.js';
import { getValue } from '../../../lib/token/token.js';
import {
  computeCursorState,
  CURSOR_APPEND_CLASS,
  CURSOR_INSERT_AFTER_CLASS,
  CURSOR_INSERT_BEFORE_CLASS,
  CURSOR_PREPEND_CLASS
} from '../Cursor.js';

function createCursor(_doc: JsedDocument, tok: HTMLElement) {
  const changes: string[] = [];
  const errors: string[] = [];
  const tokenizer = Tokenizer.createNull();

  const cursor = CursorOps.create({
    tokenizer,
    seat: tok,
    onCursorChange: (t) => changes.push(getValue(t)),
    onError: (err) => errors.push(err.type)
  });

  return { cursor, changes, errors };
}

function tokenizeAndCursor(doc: JsedDocument, selector: string) {
  const el = doc.root.querySelector(selector) as HTMLElement;
  const firstToken = Tokenizer.createNull().tokenizeLineAt(el)!;
  return createCursor(doc, firstToken);
}

describe('CURSOR_STATE', () => {
  function setup() {
    const doc = makeRoot(p({ id: 'p1' }, 'hello world foo'));
    return tokenizeAndCursor(doc, '#p1');
  }

  function markerClasses(token: HTMLElement): string[] {
    return [
      CURSOR_APPEND_CLASS,
      CURSOR_PREPEND_CLASS,
      CURSOR_INSERT_AFTER_CLASS,
      CURSOR_INSERT_BEFORE_CLASS
    ].filter((cls) => token.classList.contains(cls));
  }

  describe('CURSOR_APPEND', () => {
    test('setState sets CURSOR_APPEND marker', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.setInsertState('CURSOR_APPEND');

      // assert
      expect(markerClasses(cursor.getPlace())).toEqual([CURSOR_APPEND_CLASS]);
    });

    test('moveNext clears CURSOR_APPEND marker', () => {
      // arrange
      const { cursor } = setup();
      cursor.setInsertState('CURSOR_APPEND');

      // act
      cursor.moveNext();

      // assert
      expect(markerClasses(cursor.getPlace())).toEqual([]);
    });
  });

  describe('CURSOR_PREPEND', () => {
    test('setState sets CURSOR_PREPEND marker', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.setInsertState('CURSOR_PREPEND');

      // assert
      expect(markerClasses(cursor.getPlace())).toEqual([CURSOR_PREPEND_CLASS]);
    });

    test('movePrevious clears CURSOR_PREPEND marker', () => {
      // arrange
      const { cursor } = setup();
      cursor.moveNext();
      cursor.setInsertState('CURSOR_PREPEND');

      // act
      cursor.movePrevious();

      // assert
      expect(markerClasses(cursor.getPlace())).toEqual([]);
    });
  });

  describe('null state (no marker)', () => {
    test('setState(null) clears all markers', () => {
      // arrange
      const { cursor } = setup();
      cursor.setInsertState('CURSOR_APPEND');

      // act
      cursor.setInsertState(null);

      // assert
      expect(markerClasses(cursor.getPlace())).toEqual([]);
    });

    test('cycling through states replaces the previous marker', () => {
      // arrange
      const { cursor } = setup();

      // act & assert
      cursor.setInsertState('CURSOR_APPEND');
      expect(markerClasses(cursor.getPlace())).toEqual([CURSOR_APPEND_CLASS]);

      cursor.setInsertState('CURSOR_PREPEND');
      expect(markerClasses(cursor.getPlace())).toEqual([CURSOR_PREPEND_CLASS]);

      cursor.setInsertState(null);
      expect(markerClasses(cursor.getPlace())).toEqual([]);
    });
  });

  describe('CURSOR_INSERT_AFTER', () => {
    test('setState sets CURSOR_INSERT_AFTER marker', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.setInsertState('CURSOR_INSERT_AFTER');

      // assert
      expect(markerClasses(cursor.getPlace())).toEqual([CURSOR_INSERT_AFTER_CLASS]);
    });

    test('movePrevious cancels CURSOR_INSERT_AFTER without moving', () => {
      // arrange
      const { cursor } = setup();
      cursor.setInsertState('CURSOR_INSERT_AFTER');

      // act
      cursor.movePrevious();

      // assert
      expect(getValue(cursor.getPlace())).toBe('hello');
      expect(markerClasses(cursor.getPlace())).toEqual([]);
    });

    test('moveNext still moves forward from CURSOR_INSERT_AFTER', () => {
      // arrange
      const { cursor } = setup();
      cursor.setInsertState('CURSOR_INSERT_AFTER');

      // act
      cursor.moveNext();

      // assert
      expect(getValue(cursor.getPlace())).toBe('world');
    });
  });

  describe('CURSOR_INSERT_BEFORE', () => {
    test('setState sets CURSOR_INSERT_BEFORE marker', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.setInsertState('CURSOR_INSERT_BEFORE');

      // assert
      expect(markerClasses(cursor.getPlace())).toEqual([CURSOR_INSERT_BEFORE_CLASS]);
    });

    test('moveNext cancels CURSOR_INSERT_BEFORE without moving', () => {
      // arrange
      const { cursor } = setup();
      cursor.setInsertState('CURSOR_INSERT_BEFORE');

      // act
      cursor.moveNext();

      // assert
      expect(getValue(cursor.getPlace())).toBe('hello');
      expect(markerClasses(cursor.getPlace())).toEqual([]);
    });

    test('movePrevious still moves backward from CURSOR_INSERT_BEFORE', () => {
      // arrange
      const { cursor } = setup();
      cursor.moveNext();
      cursor.setInsertState('CURSOR_INSERT_BEFORE');

      // act
      cursor.movePrevious();

      // assert
      expect(getValue(cursor.getPlace())).toBe('hello');
    });
  });
});

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
      const { isCaret: caret } = computeCursorState(selection, 'hello');

      // assert
      expect(caret).toBe(expected);
    });

    test('null selection → caret=false', () => {
      // arrange + act
      const { isCaret: caret } = computeCursorState(null, 'hello');

      // assert
      expect(caret).toBe(false);
    });
  });

  describe('marker', () => {
    test('AT_BEGINNING with leading space → INSERT_BEFORE', () => {
      // arrange + act
      const { insertMarker: marker } = computeCursorState('CURSOR_AT_BEGINNING', ' hello');

      // assert
      expect(marker).toBe('CURSOR_INSERT_BEFORE');
    });

    test('AT_BEGINNING with no leading space → PREPEND', () => {
      // arrange + act
      const { insertMarker: marker } = computeCursorState('CURSOR_AT_BEGINNING', 'hello');

      // assert
      expect(marker).toBe('CURSOR_PREPEND');
    });

    test('AT_END with trailing space → INSERT_AFTER', () => {
      // arrange + act
      const { insertMarker: marker } = computeCursorState('CURSOR_AT_END', 'hello ');

      // assert
      expect(marker).toBe('CURSOR_INSERT_AFTER');
    });

    test('AT_END with no trailing space → APPEND', () => {
      // arrange + act
      const { insertMarker: marker } = computeCursorState('CURSOR_AT_END', 'hello');

      // assert
      expect(marker).toBe('CURSOR_APPEND');
    });

    test.each(['CURSOR_AT_MIDDLE', 'SELECT_ALL', 'SELECT_PARTIAL', 'EMPTY'] as const)(
      '%s → no marker (regardless of boundary spaces)',
      (selection) => {
        // arrange + act
        const { insertMarker: marker } = computeCursorState(selection, ' hello ');

        // assert
        expect(marker).toBeNull();
      }
    );

    test('null selection → no marker', () => {
      // arrange + act
      const { insertMarker: marker } = computeCursorState(null, ' hello ');

      // assert
      expect(marker).toBeNull();
    });
  });
});
