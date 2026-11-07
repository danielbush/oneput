import { describe, expect, test } from 'vitest';
import { EditorEventsEmitter } from '../../../../editor/index.js';
import type { JsedDocument } from '../../../../JsedDocument.js';
import { JSED_TOKEN_CLASS } from '../../../../lib/core/taxonomy.js';
import { Tokenizer } from '../../../../lib/ops/Tokenizer.js';
import { byId, identifyChildren, makeRoot, p, s, t } from '../../../../test/util.js';
import { UndoRecorder } from '../../../../undo/index.js';
import { CursorState } from '../../CursorState.js';
import { KeepInsertSpace } from '../KeepInsertSpace.js';

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
  return Array.from(doc.root.querySelectorAll(`.${JSED_TOKEN_CLASS}`)) as HTMLElement[];
}

describe('KeepInsertSpace.run', () => {
  test('nothing follows the TOKEN: no trailing SEPARATOR', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('abc')));
    const state = createState(doc, tokens(doc)[0]);
    state.setInsertState('CURSOR_INSERT_AFTER');

    // act
    const record = KeepInsertSpace.run(state, 'forward');

    // assert
    expect(record).toBeUndefined();
  });

  test('a SEPARATOR is there already: nothing to keep', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('abc'), s(), t('def')));
    const state = createState(doc, tokens(doc)[0]);
    state.setInsertState('CURSOR_INSERT_AFTER');

    // act
    const record = KeepInsertSpace.run(state, 'forward');

    // assert
    expect(record).toBeUndefined();
    expect(identifyChildren(byId(doc, 'p1')).filter((c) => !c.startsWith('[element'))).toEqual([
      'abc',
      '[nodeType=3:" "]',
      'def'
    ]);
  });

  test('not in an insert state: nothing to keep', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('abc'), t('def')));
    const state = createState(doc, tokens(doc)[0]);

    // act + assert
    expect(KeepInsertSpace.run(state, 'forward')).toBeUndefined();
    expect(KeepInsertSpace.run(state, 'backward')).toBeUndefined();
  });

  test('the wrong direction for the insert state: nothing to keep', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('abc'), t('def')));
    const state = createState(doc, tokens(doc)[0]);
    state.setInsertState('CURSOR_INSERT_AFTER');

    // act + assert
    expect(KeepInsertSpace.run(state, 'backward')).toBeUndefined();
  });
});
