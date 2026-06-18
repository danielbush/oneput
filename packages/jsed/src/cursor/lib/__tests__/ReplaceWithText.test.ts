import { describe, expect, test } from 'vitest';
import type { EditorState } from '../../../editor/index.js';
import { EditorEventsEmitter } from '../../../editor/index.js';
import type { JsedDocument } from '../../../JsedDocument.js';
import { JSED_ANCHOR_CLASS, JSED_TOKEN_CLASS } from '../../../lib/core/taxonomy.js';
import { Tokenizer } from '../../../lib/ops/Tokenizer.js';
import { getValue } from '../../../lib/ops/token.js';
import { byId, identify, identifyChildren, makeRoot, p, s, t } from '../../../test/util.js';
import { UndoRecorder } from '../../../undo/index.js';
import { CursorState } from '../CursorState.js';
import { DeleteAtCursor } from '../DeleteAtCursor.js';
import { ReplaceSelectionWithText } from '../ReplaceSelectionWithText.js';
import { ReplaceWithText } from '../ReplaceWithText.js';

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

function editorState(cursor: CursorState): EditorState {
  return { cursor } as unknown as EditorState;
}

function tokens(doc: JsedDocument): HTMLElement[] {
  return Array.from(
    doc.root.querySelectorAll(`.${JSED_TOKEN_CLASS}, .${JSED_ANCHOR_CLASS}`)
  ) as HTMLElement[];
}

describe('ReplaceWithText.run', () => {
  test('TOKEN text', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('hello'), s(), t('world')));
    const state = createState(doc, tokens(doc)[0]);

    // act
    const record = ReplaceWithText.run(state, 'goodbye')!;

    // assert
    expect(identify(state.getPlace())).toBe('goodbye');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual(['goodbye', '[nodeType=3:" "]', 'world']);

    // act
    record.undo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('hello');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual(['hello', '[nodeType=3:" "]', 'world']);

    // act
    record.redo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('goodbye');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual(['goodbye', '[nodeType=3:" "]', 'world']);
  });

  test('TOKEN after ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('bbb'))
    );
    const state = createState(doc, tokens(doc)[1]);

    // act
    const record = ReplaceWithText.run(state, 'ccc')!;

    // assert
    expect(identify(state.getPlace())).toBe('ccc');

    // act
    record.undo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('bbb');

    // act
    record.redo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('ccc');
  });

  test('ISLAND no-op', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('bbb'))
    );
    const island = doc.root.querySelector('.katex') as HTMLElement;
    const state = createState(doc, island);

    // act
    const record = ReplaceWithText.run(state, 'oops');

    // assert
    expect(record).toBeUndefined();
    expect(identify(state.getPlace())).toBe('[island:span]');
  });

  test(`multiple TOKEN's`, () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('hello'), s(), t('world')));
    const state = createState(doc, tokens(doc)[0]);

    // act
    const record = ReplaceWithText.run(state, 'goodbye friend')!;

    // assert
    expect(identify(state.getPlace())).toBe('friend');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'goodbye',
      '[nodeType=3:" "]',
      'friend',
      '[nodeType=3:" "]',
      'world'
    ]);

    // act
    record.undo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('hello');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'hello',
      '[deleted-space]',
      'd("friend")',
      '[nodeType=3:" "]',
      'world'
    ]);

    // act
    record.redo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('friend');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'goodbye',
      '[nodeType=3:" "]',
      'friend',
      '[nodeType=3:" "]',
      'world'
    ]);
  });

  test(`multiple TOKEN's on last TOKEN`, () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('hello'), s(), t('world')));
    const state = createState(doc, tokens(doc)[1]);

    // act
    const record = ReplaceWithText.run(state, 'aaa bbb')!;

    // assert
    expect(identify(state.getPlace())).toBe('bbb');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'hello',
      '[nodeType=3:" "]',
      'aaa',
      '[nodeType=3:" "]',
      'bbb'
    ]);

    // act
    record.undo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('world');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'hello',
      '[nodeType=3:" "]',
      'world',
      '[deleted-space]',
      'd("bbb")'
    ]);

    // act
    record.redo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('bbb');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'hello',
      '[nodeType=3:" "]',
      'aaa',
      '[nodeType=3:" "]',
      'bbb'
    ]);
  });

  test('blank text no-op', () => {
    // arrange
    const doc = makeRoot(p(t('hello')));
    const state = createState(doc, tokens(doc)[0]);

    // act
    const record = ReplaceWithText.run(state, '   ');

    // assert
    expect(record).toBeUndefined();
    expect(getValue(state.getPlace())).toBe('hello');
  });

  test('selection delegates to ReplaceSelectionWithText', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('one'), s(), t('two'), s(), t('three')));
    const state = createState(doc, tokens(doc)[0]);
    state.startSelection().extendNext();

    // act
    const record = ReplaceWithText.run(state, 'new words')!;

    // assert
    expect(record).toBeInstanceOf(ReplaceSelectionWithText);
    expect(identify(state.getPlace())).toBe('words');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'new',
      '[nodeType=3:" "]',
      'words',
      '[nodeType=3:" "]',
      'd("one")',
      '[deleted-space]',
      'd("two")',
      '[deleted-space]',
      'three'
    ]);

    // act
    record.undo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('one');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'd("new")',
      '[deleted-space]',
      'd("words")',
      '[deleted-space]',
      'one',
      '[nodeType=3:" "]',
      'two',
      '[nodeType=3:" "]',
      'three'
    ]);

    // act
    record.redo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('words');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'new',
      '[nodeType=3:" "]',
      'words',
      '[nodeType=3:" "]',
      'd("one")',
      '[deleted-space]',
      'd("two")',
      '[deleted-space]',
      'three'
    ]);
  });
});

describe('ReplaceWithText.merge', () => {
  test('successive replacements collapse to earliest undo and latest redo', () => {
    // arrange
    const doc = makeRoot(p(t('hello')));
    const state = createState(doc, tokens(doc)[0]);
    const first = ReplaceWithText.run(state, 'good')!;
    const second = ReplaceWithText.run(state, 'goodbye')!;

    // act
    const merged = first.merge(second);

    // assert
    expect(merged).toBe(first);

    // act
    first.undo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('hello');

    // act
    first.redo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('goodbye');
  });

  test('multi-word replacement does not merge', () => {
    // arrange
    const doc = makeRoot(p(t('hello')));
    const state = createState(doc, tokens(doc)[0]);
    const first = ReplaceWithText.run(state, 'good bye')!;
    const second = ReplaceWithText.run(state, 'friend')!;

    // act + assert
    expect(first.merge(second)).toBeUndefined();
  });

  test('replacement followed by delete collapses to delete of original TOKEN text', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('hello'), s(), t('world')));
    const state = createState(doc, tokens(doc)[0]);
    const replace = ReplaceWithText.run(state, 'goodbye')!;
    const del = DeleteAtCursor.run(state)!;

    // act
    const merged = replace.merge(del);

    // assert
    expect(merged).toBe(del);
    expect(identifyChildren(byId(doc, 'p1'))).toEqual(['d("hello")', '[deleted-space]', 'world']);

    // act
    del.undo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('hello');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual(['hello', '[nodeType=3:" "]', 'world']);
  });
});
