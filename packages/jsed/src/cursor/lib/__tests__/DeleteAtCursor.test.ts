import { describe, expect, test } from 'vitest';
import type { EditorState } from '../../../editor/index.js';
import type { JsedDocument } from '../../../JsedDocument.js';
import { isAnchor, JSED_ANCHOR_CLASS, JSED_TOKEN_CLASS } from '../../../lib/core/taxonomy.js';
import { Tokenizer } from '../../../lib/ops/Tokenizer.js';
import { getValue } from '../../../lib/ops/token.js';
import { EditorEventsEmitter } from '../../../editor/index.js';
import { UndoRecorder } from '../../../undo/index.js';
import {
  a,
  byId,
  em,
  identify,
  identifyChildren,
  inlineStyleHackVal,
  makeRoot,
  p,
  s,
  t
} from '../../../test/util.js';
import { CursorState } from '../CursorState.js';
import { DeleteAtCursor } from '../DeleteAtCursor.js';

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

describe('DeleteAtCursor.run', () => {
  test(`delete TOKEN - first of several TOKEN's`, () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('hello'), s(), t('world'), s(), t('foo')));
    const hello = tokens(doc)[0];
    const state = createState(doc, hello);

    // act
    const record = DeleteAtCursor.run(state)!;

    // assert
    expect(getValue(state.getPlace())).toBe('world');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'd("hello")',
      '[deleted-space]',
      'world',
      '[nodeType=3:" "]',
      'foo'
    ]);

    // act
    record.undo(editorState(state));

    // assert
    expect(getValue(state.getPlace())).toBe('hello');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'hello',
      '[nodeType=3:" "]',
      'world',
      '[nodeType=3:" "]',
      'foo'
    ]);

    // act
    record.redo(editorState(state));

    // assert
    expect(getValue(state.getPlace())).toBe('world');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'd("hello")',
      '[deleted-space]',
      'world',
      '[nodeType=3:" "]',
      'foo'
    ]);
  });

  test('delete TOKEN - last in document root', () => {
    // arrange
    const doc = makeRoot(t('aaa'));
    const aaa = tokens(doc)[0];
    const state = createState(doc, aaa);

    // act
    const record = DeleteAtCursor.run(state)!;

    // assert
    expect(isAnchor(state.getPlace())).toBe(true);
    expect(identifyChildren(doc.root)).toEqual(['[anchor]', 'd("aaa")']);

    // act
    record.undo(editorState(state));

    // assert
    expect(getValue(state.getPlace())).toBe('aaa');
    expect(identifyChildren(doc.root)).toEqual(['aaa']);

    // act
    record.redo(editorState(state));

    // assert
    expect(isAnchor(state.getPlace())).toBe(true);
    expect(identifyChildren(doc.root)).toEqual(['[anchor]', 'd("aaa")']);
  });

  test('delete TOKEN - after ISLAND / with next TOKEN', () => {
    // arrange
    const doc = makeRoot(
      p(
        t('aaa'),
        s(),
        '<span class="katex" style="display:inline;">x²</span>',
        s(),
        t('bbb'),
        s(),
        t('ccc')
      )
    );
    const bbb = tokens(doc)[1];
    const state = createState(doc, bbb);

    // act
    const record = DeleteAtCursor.run(state)!;

    // assert
    expect(identify(state.getPlace())).toBe('[island:span]');
    expect(identifyChildren(doc.root.firstChild)).toEqual([
      'aaa',
      '[nodeType=3:" "]',
      '[island:span]',
      '[nodeType=3:" "]',
      'd("bbb")',
      '[deleted-space]',
      'ccc'
    ]);

    // act
    record.undo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('bbb');
    expect(identifyChildren(doc.root.firstChild)).toEqual([
      'aaa',
      '[nodeType=3:" "]',
      '[island:span]',
      '[nodeType=3:" "]',
      'bbb',
      '[nodeType=3:" "]',
      'ccc'
    ]);

    // act
    record.redo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('[island:span]');
    expect(identifyChildren(doc.root.firstChild)).toEqual([
      'aaa',
      '[nodeType=3:" "]',
      '[island:span]',
      '[nodeType=3:" "]',
      'd("bbb")',
      '[deleted-space]',
      'ccc'
    ]);
  });

  test('delete TOKEN - after ISLAND / last', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('bbb'))
    );
    const bbb = tokens(doc)[1];
    const state = createState(doc, bbb);

    // act
    const record = DeleteAtCursor.run(state)!;

    // assert
    expect(identify(state.getPlace())).toBe('[anchor]');
    expect(identify(state.getPlace().nextSibling)).toBe('d("bbb")');

    // act
    record.undo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('bbb');

    // act
    record.redo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('[anchor]');
    expect(identify(state.getPlace().nextSibling)).toBe('d("bbb")');
  });

  test('delete TOKEN - last in LINE', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' },
        t('aaa'),
        s(),
        em({ id: 'em1', style: inlineStyleHackVal }, a()),
        s(),
        t('ccc')
      )
    );
    const anchor = tokens(doc)[1];
    const state = createState(doc, anchor);

    // act
    const record = DeleteAtCursor.run(state)!;

    // assert
    expect(identify(state.getPlace())).toBe('aaa');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'aaa',
      '[nodeType=3:" "]',
      '[deleted-element]',
      '[nodeType=3:" "]',
      'ccc'
    ]);

    // act
    record.undo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('[anchor]');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'aaa',
      '[nodeType=3:" "]',
      '[element:em#em1]',
      '[nodeType=3:" "]',
      'ccc'
    ]);

    // act
    record.redo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('aaa');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'aaa',
      '[nodeType=3:" "]',
      '[deleted-element]',
      '[nodeType=3:" "]',
      'ccc'
    ]);
  });

  test('delete ANCHOR - only text in doc', () => {
    // arrange
    const doc = makeRoot(a());
    const anchor = tokens(doc)[0];
    const state = createState(doc, anchor);

    // act
    const record = DeleteAtCursor.run(state);

    // assert
    expect(record).toBeUndefined();
    expect(state.getPlace()).toBe(doc.root.firstChild);
    expect(identifyChildren(doc.root)).toEqual(['[anchor]']);
  });

  test('delete ISLAND - no-op (TODO)', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('bbb'))
    );
    const island = doc.root.querySelector('.katex') as HTMLElement;
    const state = createState(doc, island);

    // act
    const record = DeleteAtCursor.run(state);

    // assert
    expect(record).toBeUndefined();
    expect(identify(state.getPlace())).toBe('[island:span]');
  });
});
