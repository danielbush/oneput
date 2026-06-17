import { describe, expect, test } from 'vitest';
import { EditorEventsEmitter } from '../../../editor/index.js';
import type { JsedDocument } from '../../../JsedDocument.js';
import { Tokenizer } from '../../../lib/ops/Tokenizer.js';
import { JSED_IGNORE_CLASS } from '../../../lib/core/taxonomy.js';
import { a, makeRoot, p, s, t } from '../../../test/util.js';
import { UndoRecorder } from '../../../undo/index.js';
import {
  computeCursorState,
  CursorState,
  JSED_CURSOR_MARKER_CLASS
} from '../../../cursor/lib/CursorState.js';

function createState(doc: JsedDocument, seat: HTMLElement) {
  return new CursorState(
    seat,
    doc,
    Tokenizer.createNull(),
    UndoRecorder.createNull(),
    () => {},
    () => {},
    EditorEventsEmitter.create()
  );
}

function tokens(doc: JsedDocument): HTMLElement[] {
  return Array.from(doc.root.querySelectorAll('.jsed-token, .jsed-anchor-token')) as HTMLElement[];
}

function marker(doc: JsedDocument): HTMLElement | null {
  return doc.root.querySelector(`.${JSED_CURSOR_MARKER_CLASS}`);
}

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

describe('CursorState marker', () => {
  test('APPEND places one marker before following space', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const state = createState(doc, tokens(doc)[0]);

    // act
    state.setInsertState('CURSOR_APPEND');

    // assert
    const cursorMarker = marker(doc)!;
    expect(cursorMarker).not.toBeNull();
    expect(cursorMarker.classList.contains(JSED_IGNORE_CLASS)).toBe(true);
    expect(cursorMarker.dataset.cursorState).toBe('CURSOR_APPEND');
    expect(cursorMarker.previousSibling).toBe(tokens(doc)[0]);
    expect(cursorMarker.nextSibling?.nodeValue).toBe(' ');
  });

  test('INSERT_AFTER reuses the same marker after following space', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const state = createState(doc, tokens(doc)[0]);

    // act
    state.setInsertState('CURSOR_APPEND');
    const originalMarker = marker(doc);
    state.setInsertState('CURSOR_INSERT_AFTER');

    // assert
    const cursorMarker = marker(doc)!;
    expect(cursorMarker).toBe(originalMarker);
    expect(doc.root.querySelectorAll(`.${JSED_CURSOR_MARKER_CLASS}`)).toHaveLength(1);
    expect(cursorMarker.dataset.cursorState).toBe('CURSOR_INSERT_AFTER');
    expect(cursorMarker.previousSibling?.nodeValue).toBe(' ');
    expect(cursorMarker.nextSibling).toBe(tokens(doc)[1]);
  });

  test('clearing insert state removes the marker', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const state = createState(doc, tokens(doc)[0]);
    state.setInsertState('CURSOR_APPEND');

    // act
    state.setInsertState(null);

    // assert
    expect(marker(doc)).toBeNull();
    expect(Array.from(doc.root.querySelectorAll(`.${JSED_CURSOR_MARKER_CLASS}`))).toEqual([]);
  });

  test('place removes marker from previous TOKEN', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const state = createState(doc, tokens(doc)[0]);
    state.setInsertState('CURSOR_APPEND');

    // act
    state.place(tokens(doc)[1]);

    // assert
    expect(marker(doc)).toBeNull();
  });

  test('ANCHOR does not use marker', () => {
    // arrange
    const doc = makeRoot(a());
    const state = createState(doc, tokens(doc)[0]);

    // act
    state.setInsertState('CURSOR_APPEND');

    // assert
    expect(marker(doc)).toBeNull();
  });
});
