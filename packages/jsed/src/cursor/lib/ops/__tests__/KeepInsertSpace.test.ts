import { describe, expect, test } from 'vitest';
import type { EditorState } from '../../../../editor/index.js';
import type { EditorTextChangeEvent } from '../../../../editor/lib/EditorState.js';
import { EditorEventsEmitter } from '../../../../editor/index.js';
import type { JsedDocument } from '../../../../JsedDocument.js';
import { Tokenizer } from '../../../../lib/ops/Tokenizer.js';
import {
  byId,
  findTokenByText,
  identify,
  identifyChildren,
  makeRoot,
  p,
  s,
  t
} from '../../../../test/util.js';
import { UndoRecorder } from '../../../../undo/index.js';
import { CursorState } from '../../CursorState.js';
import { KeepInsertSpace } from '../KeepInsertSpace.js';

function createState(doc: JsedDocument, on: string) {
  const events: EditorTextChangeEvent[] = [];
  const eventsEmitter = EditorEventsEmitter.create();
  eventsEmitter.subscribe({ onTextChange: (event) => events.push(event) });
  const state = new CursorState(
    findTokenByText(doc.root, on),
    doc,
    Tokenizer.createNull(),
    UndoRecorder.createNull(),
    () => {},
    () => {},
    eventsEmitter
  );
  return { state, events };
}

function editorState(cursor: CursorState): EditorState {
  return { cursor } as unknown as EditorState;
}

describe('KeepInsertSpace.run', () => {
  test('forward from CURSOR_INSERT_AFTER keeps the space after the TOKEN', () => {
    // arrange: "abc.def", on `abc`, then a space
    const doc = makeRoot(p({ id: 'p1' }, t('abc'), t('def')));
    const { state, events } = createState(doc, 'abc');
    state.setInsertState('CURSOR_INSERT_AFTER');

    // act
    const record = KeepInsertSpace.run(state, 'forward')!;

    // assert
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'abc',
      '[nodeType=3:" "]',
      '[cursor-gap]',
      '[cursor-marker]',
      'def'
    ]);
    expect(events).toEqual([
      { type: 'separator-change', token: findTokenByText(doc.root, 'abc'), change: 'inserted' }
    ]);

    // act
    state.place(findTokenByText(doc.root, 'def'));
    record.undo(editorState(state));

    // assert
    expect(identifyChildren(byId(doc, 'p1'))).toEqual(['abc', '[deleted-space]', 'def']);
    expect(identify(state.getPlace())).toBe('abc');

    // act
    record.redo(editorState(state));

    // assert
    expect(identifyChildren(byId(doc, 'p1'))).toEqual(['abc', '[nodeType=3:" "]', 'def']);
  });

  test('backward from CURSOR_INSERT_BEFORE keeps the space before the TOKEN', () => {
    // arrange: "abc.def", on `def`, then a space
    const doc = makeRoot(p({ id: 'p1' }, t('abc'), t('def')));
    const { state } = createState(doc, 'def');
    state.setInsertState('CURSOR_INSERT_BEFORE');

    // act
    const record = KeepInsertSpace.run(state, 'backward')!;
    state.place(findTokenByText(doc.root, 'abc'));

    // assert
    expect(identifyChildren(byId(doc, 'p1'))).toEqual(['abc', '[nodeType=3:" "]', 'def']);

    // act
    record.undo(editorState(state));

    // assert
    expect(identifyChildren(byId(doc, 'p1'))).toEqual(['abc', '[deleted-space]', 'def']);
  });

  test('nothing follows the TOKEN: no trailing SEPARATOR', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('abc')));
    const { state, events } = createState(doc, 'abc');
    state.setInsertState('CURSOR_INSERT_AFTER');

    // act + assert
    expect(KeepInsertSpace.run(state, 'forward')).toBeUndefined();
    expect(events).toEqual([]);
  });

  test('a SEPARATOR is there already: nothing to keep', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('abc'), s(), t('def')));
    const { state } = createState(doc, 'abc');
    state.setInsertState('CURSOR_INSERT_AFTER');

    // act + assert
    expect(KeepInsertSpace.run(state, 'forward')).toBeUndefined();
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'abc',
      '[nodeType=3:" "]',
      '[cursor-marker]',
      'def'
    ]);
  });

  test('not in an insert state: nothing to keep', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('abc'), t('def')));
    const { state } = createState(doc, 'abc');

    // act + assert
    expect(KeepInsertSpace.run(state, 'forward')).toBeUndefined();
    expect(KeepInsertSpace.run(state, 'backward')).toBeUndefined();
  });

  test('moving the other way cancels: nothing to keep', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('abc'), t('def')));
    const after = createState(doc, 'abc');
    after.state.setInsertState('CURSOR_INSERT_AFTER');

    // act + assert
    expect(KeepInsertSpace.run(after.state, 'backward')).toBeUndefined();

    // arrange
    after.state.setInsertState(null);
    const before = createState(doc, 'def');
    before.state.setInsertState('CURSOR_INSERT_BEFORE');

    // act + assert
    expect(KeepInsertSpace.run(before.state, 'forward')).toBeUndefined();
  });
});
