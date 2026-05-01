import { describe, expect, test } from 'vitest';
import { makeRoot, p } from '../test/util.js';
import { JsedDocument } from '../JsedDocument.js';
import { Tokenizer } from '../Tokenizer.js';
import { Cursor } from '../Cursor.js';
import { getValue } from '../lib/token.js';
import {
  CURSOR_APPEND_CLASS,
  CURSOR_INSERT_AFTER_CLASS,
  CURSOR_INSERT_BEFORE_CLASS,
  CURSOR_PREPEND_CLASS
} from '../lib/constants.js';

function createCursor(doc: JsedDocument, tok: HTMLElement) {
  const changes: string[] = [];
  const errors: string[] = [];
  const tokenizer = Tokenizer.createNull();

  const cursor = Cursor.create({
    document: doc,
    tokenizer,
    token: tok,
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
      cursor.setState('CURSOR_APPEND');

      // assert
      expect(markerClasses(cursor.getPlace())).toEqual([CURSOR_APPEND_CLASS]);
    });

    test('moveNext clears CURSOR_APPEND marker', () => {
      // arrange
      const { cursor } = setup();
      cursor.setState('CURSOR_APPEND');

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
      cursor.setState('CURSOR_PREPEND');

      // assert
      expect(markerClasses(cursor.getPlace())).toEqual([CURSOR_PREPEND_CLASS]);
    });

    test('movePrevious clears CURSOR_PREPEND marker', () => {
      // arrange
      const { cursor } = setup();
      cursor.moveNext();
      cursor.setState('CURSOR_PREPEND');

      // act
      cursor.movePrevious();

      // assert
      expect(markerClasses(cursor.getPlace())).toEqual([]);
    });
  });

  describe('CURSOR_OVERWRITE', () => {
    test('setState clears all markers', () => {
      // arrange
      const { cursor } = setup();
      cursor.setState('CURSOR_APPEND');

      // act
      cursor.setState('CURSOR_OVERWRITE');

      // assert
      expect(markerClasses(cursor.getPlace())).toEqual([]);
    });

    test('cycling through states replaces the previous marker', () => {
      // arrange
      const { cursor } = setup();

      // act & assert
      cursor.setState('CURSOR_APPEND');
      expect(markerClasses(cursor.getPlace())).toEqual([CURSOR_APPEND_CLASS]);

      cursor.setState('CURSOR_PREPEND');
      expect(markerClasses(cursor.getPlace())).toEqual([CURSOR_PREPEND_CLASS]);

      cursor.setState('CURSOR_OVERWRITE');
      expect(markerClasses(cursor.getPlace())).toEqual([]);
    });
  });

  describe('CURSOR_INSERT_AFTER', () => {
    test('setState sets CURSOR_INSERT_AFTER marker', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.setState('CURSOR_INSERT_AFTER');

      // assert
      expect(markerClasses(cursor.getPlace())).toEqual([CURSOR_INSERT_AFTER_CLASS]);
    });

    test('movePrevious cancels CURSOR_INSERT_AFTER without moving', () => {
      // arrange
      const { cursor } = setup();
      cursor.setState('CURSOR_INSERT_AFTER');

      // act
      cursor.movePrevious();

      // assert
      expect(getValue(cursor.getPlace())).toBe('hello');
      expect(markerClasses(cursor.getPlace())).toEqual([]);
    });

    test('moveNext still moves forward from CURSOR_INSERT_AFTER', () => {
      // arrange
      const { cursor } = setup();
      cursor.setState('CURSOR_INSERT_AFTER');

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
      cursor.setState('CURSOR_INSERT_BEFORE');

      // assert
      expect(markerClasses(cursor.getPlace())).toEqual([CURSOR_INSERT_BEFORE_CLASS]);
    });

    test('moveNext cancels CURSOR_INSERT_BEFORE without moving', () => {
      // arrange
      const { cursor } = setup();
      cursor.setState('CURSOR_INSERT_BEFORE');

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
      cursor.setState('CURSOR_INSERT_BEFORE');

      // act
      cursor.movePrevious();

      // assert
      expect(getValue(cursor.getPlace())).toBe('hello');
    });
  });
});
