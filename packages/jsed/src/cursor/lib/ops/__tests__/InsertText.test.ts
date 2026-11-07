import { describe, expect, test } from 'vitest';
import type { EditorState } from '../../../../editor/index.js';
import { EditorEventsEmitter } from '../../../../editor/index.js';
import type { JsedDocument } from '../../../../JsedDocument.js';
import { JSED_ANCHOR_CLASS, JSED_TOKEN_CLASS } from '../../../../lib/core/taxonomy.js';
import { Tokenizer } from '../../../../lib/ops/Tokenizer.js';
import type { Splitter } from '../../../../lib/ops/splitter.js';
import { byId, identify, identifyChildren, makeRoot, p, s, t } from '../../../../test/util.js';
import { UndoRecorder, type UndoRecord } from '../../../../undo/index.js';
import { CursorState } from '../../CursorState.js';
import { InsertTextAfter } from '../InsertTextAfter.js';
import { InsertTextBefore } from '../InsertTextBefore.js';
import { ReplaceWithText } from '../ReplaceWithText.js';

/**
 * A SYNTACTIC_SPLIT that splits a full stop off its word: `def.` is two TOKEN's.
 */
const fullStopSplitter: Splitter = (text) => text.match(/\s+|\.|[^\s.]+/g) ?? [];

function createState(doc: JsedDocument, seat: HTMLElement) {
  return new CursorState(
    seat,
    doc,
    Tokenizer.createNull(fullStopSplitter),
    UndoRecorder.createNull(),
    () => {},
    () => {},
    EditorEventsEmitter.create(),
    fullStopSplitter
  );
}

function editorState(cursor: CursorState): EditorState {
  return { cursor } as unknown as EditorState;
}

function tokens(doc: JsedDocument): HTMLElement[] {
  return Array.from(
    doc.root.querySelectorAll(`.${JSED_TOKEN_CLASS}, .${JSED_ANCHOR_CLASS}`)
  ) as HTMLElement[];
}

/**
 * Merge `next` into `record` as UndoRecorder does: one undo step if they merge.
 */
function merge(record: UndoRecord, next: UndoRecord | undefined): UndoRecord {
  expect(next).toBeDefined();
  const merged = record.merge?.(next!);
  expect(merged).toBe(record);
  return record;
}

describe('InsertTextAfter.merge', () => {
  test('typing on into a SYNTACTIC_SPLIT keeps the split-off TOKEN in the undo step', () => {
    // arrange: "abc |" => "abc d" => "abc de" => "abc def" => "abc def."
    const doc = makeRoot(p({ id: 'p1' }, t('abc')));
    const state = createState(doc, tokens(doc)[0]);
    const record = InsertTextAfter.run(state, 'd')!;
    merge(record, ReplaceWithText.run(state, 'de'));
    merge(record, ReplaceWithText.run(state, 'def'));
    merge(record, ReplaceWithText.run(state, 'def.'));
    expect(identifyChildren(byId(doc, 'p1'))).toEqual(['abc', '[nodeType=3:" "]', 'def', '.']);
    expect(identify(state.getPlace())).toBe('.');

    // act
    record.undo(editorState(state));

    // assert: both `def` and `.` are gone
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'abc',
      '[deleted-space]',
      'd("def")',
      'd(".")'
    ]);
    expect(identify(state.getPlace())).toBe('abc');

    // act
    record.redo(editorState(state));

    // assert
    expect(identifyChildren(byId(doc, 'p1'))).toEqual(['abc', '[nodeType=3:" "]', 'def', '.']);
    expect(identify(state.getPlace())).toBe('.');
  });

  test('typing into the split-off TOKEN continues the same undo step', () => {
    // arrange: "abc def." then "abc def.g": the CURSOR is on `.`
    const doc = makeRoot(p({ id: 'p1' }, t('abc')));
    const state = createState(doc, tokens(doc)[0]);
    const record = InsertTextAfter.run(state, 'def.')!;
    merge(record, ReplaceWithText.run(state, '.g'));
    expect(identifyChildren(byId(doc, 'p1'))).toEqual(['abc', '[nodeType=3:" "]', 'def', '.', 'g']);

    // act
    record.undo(editorState(state));

    // assert
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'abc',
      '[deleted-space]',
      'd("def")',
      'd(".")',
      'd("g")'
    ]);
  });

  test('a multi-word insert does not merge', () => {
    // arrange
    const doc = makeRoot(p(t('abc')));
    const state = createState(doc, tokens(doc)[0]);
    const record = InsertTextAfter.run(state, 'def ghi')!;
    const next = ReplaceWithText.run(state, 'ghij')!;

    // act + assert
    expect(record.merge(next)).toBeUndefined();
  });
});

describe('InsertTextBefore.merge', () => {
  test('typing on into a SYNTACTIC_SPLIT keeps the split-off TOKEN in the undo step', () => {
    // arrange: "| xyz" => "d xyz" => "de xyz" => "def xyz" => "def. xyz"
    const doc = makeRoot(p({ id: 'p1' }, t('xyz')));
    const state = createState(doc, tokens(doc)[0]);
    const record = InsertTextBefore.run(state, 'd')!;
    merge(record, ReplaceWithText.run(state, 'de'));
    merge(record, ReplaceWithText.run(state, 'def'));
    merge(record, ReplaceWithText.run(state, 'def.'));
    expect(identifyChildren(byId(doc, 'p1'))).toEqual(['def', '.', '[nodeType=3:" "]', 'xyz']);

    // act
    record.undo(editorState(state));

    // assert
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'd("def")',
      'd(".")',
      '[deleted-space]',
      'xyz'
    ]);
    expect(identify(state.getPlace())).toBe('xyz');

    // act
    record.redo(editorState(state));

    // assert
    expect(identifyChildren(byId(doc, 'p1'))).toEqual(['def', '.', '[nodeType=3:" "]', 'xyz']);
    expect(identify(state.getPlace())).toBe('.');
  });
});

describe('unrelated records', () => {
  test('a replacement of another TOKEN does not merge', () => {
    // arrange
    const doc = makeRoot(p(t('abc'), s(), t('xyz')));
    const state = createState(doc, tokens(doc)[0]);
    const record = InsertTextAfter.run(state, 'd')!;
    state.place(tokens(doc).find((tok) => identify(tok) === 'xyz')!);
    const next = ReplaceWithText.run(state, 'xy')!;

    // act + assert
    expect(record.merge(next)).toBeUndefined();
  });
});
