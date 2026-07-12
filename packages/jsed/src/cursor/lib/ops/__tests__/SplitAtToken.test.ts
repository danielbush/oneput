import { describe, expect, test } from 'vitest';
import type { EditorState } from '../../../../editor/index.js';
import { EditorEventsEmitter } from '../../../../editor/index.js';
import type { JsedDocument } from '../../../../JsedDocument.js';
import { isAnchor, JSED_ANCHOR_CLASS, JSED_TOKEN_CLASS } from '../../../../lib/core/taxonomy.js';
import { Tokenizer } from '../../../../lib/ops/Tokenizer.js';
import { getSeparatorBefore } from '../../../../lib/ops/space.js';
import {
  byId,
  em,
  identify,
  identifyChildren,
  inlineStyleHackVal,
  makeRoot,
  p,
  s,
  t
} from '../../../../test/util.js';
import { UndoRecorder } from '../../../../undo/index.js';
import { CursorState } from '../../CursorState.js';
import { SplitAtToken } from '../SplitAtToken.js';

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

describe('SplitAtToken.run', () => {
  test('emits a focusable-inserted element change for the split peer', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('hello'), s(), t('world')));
    const elementChanges: unknown[] = [];
    const eventsEmitter = EditorEventsEmitter.create();
    eventsEmitter.subscribe({
      onElementChange: (event) => elementChanges.push(event)
    });
    const state = new CursorState(
      tokens(doc)[0],
      doc,
      Tokenizer.createNull(),
      UndoRecorder.createNull(),
      () => {},
      () => {},
      eventsEmitter
    );

    // act
    SplitAtToken.run(state);

    // assert
    expect(elementChanges).toEqual([{ type: 'focusable-inserted', element: doc.root.children[1] }]);
  });

  test('append splits after current TOKEN', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('hello'), s(), t('world'), s(), t('foo')));
    const state = createState(doc, tokens(doc)[0]);
    state.setInsertState('CURSOR_APPEND');

    // act
    const record = SplitAtToken.run(state);

    // assert
    const lines = doc.root.querySelectorAll('p');
    expect(identify(state.getPlace())).toBe('world');
    expect(lines).toHaveLength(2);
    expect(identifyChildren(lines[0])).toEqual(['hello']);
    expect(identifyChildren(lines[1])).toEqual([
      '[nodeType=3:" "]',
      'world',
      '[nodeType=3:" "]',
      'foo'
    ]);

    // act
    record.undo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('hello');
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
    expect(identify(state.getPlace())).toBe('world');
    expect(doc.root.querySelectorAll('p')).toHaveLength(2);
  });

  test('insert after splits after current TOKEN', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world'), s(), t('foo')));
    const state = createState(doc, tokens(doc)[0]);
    state.setInsertState('CURSOR_INSERT_AFTER');

    // act
    SplitAtToken.run(state);

    // assert
    expect(identify(state.getPlace())).toBe('world');
    expect(doc.root.querySelectorAll('p')).toHaveLength(2);
  });

  test('default state splits after current TOKEN', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world'), s(), t('foo')));
    const state = createState(doc, tokens(doc)[1]);

    // act
    SplitAtToken.run(state);

    // assert
    const lines = doc.root.querySelectorAll('p');
    expect(identify(state.getPlace())).toBe('foo');
    expect(lines).toHaveLength(2);
    expect(identifyChildren(lines[0])).toEqual(['hello', '[nodeType=3:" "]', 'world']);
    expect(identifyChildren(lines[1])).toEqual(['[nodeType=3:" "]', 'foo']);
  });

  test('prepend before first TOKEN anchors emptied original LINE', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const state = createState(doc, tokens(doc)[0]);
    state.setInsertState('CURSOR_PREPEND');

    // act
    const record = SplitAtToken.run(state);

    // assert
    const lines = doc.root.querySelectorAll('p');
    expect(lines).toHaveLength(2);
    expect(identifyChildren(lines[0])).toEqual(['[anchor]']);
    expect(identifyChildren(lines[1])).toEqual(['hello', '[nodeType=3:" "]', 'world']);
    expect(identify(state.getPlace())).toBe('hello');

    // act
    record.undo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('hello');
    expect(doc.root.querySelectorAll('p')).toHaveLength(1);
    expect(identifyChildren(doc.root.firstChild)).toEqual(['hello', '[nodeType=3:" "]', 'world']);

    // act
    record.redo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('hello');
    expect(identifyChildren(doc.root.querySelectorAll('p')[0])).toEqual(['[anchor]']);
  });

  test('append after last TOKEN anchors new empty LINE', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const state = createState(doc, tokens(doc)[1]);
    state.setInsertState('CURSOR_APPEND');

    // act
    const record = SplitAtToken.run(state);

    // assert
    const lines = doc.root.querySelectorAll('p');
    expect(lines).toHaveLength(2);
    expect(identifyChildren(lines[0])).toEqual(['hello', '[nodeType=3:" "]', 'world']);
    expect(identifyChildren(lines[1])).toEqual(['[anchor]']);
    expect(isAnchor(state.getPlace())).toBe(true);

    // act
    record.undo(editorState(state));

    // assert
    expect(identify(state.getPlace())).toBe('world');
    expect(doc.root.querySelectorAll('p')).toHaveLength(1);
    expect(identifyChildren(doc.root.firstChild)).toEqual(['hello', '[nodeType=3:" "]', 'world']);

    // act
    record.redo(editorState(state));

    // assert
    expect(isAnchor(state.getPlace())).toBe(true);
    expect(identifyChildren(doc.root.querySelectorAll('p')[1])).toEqual(['[anchor]']);
  });

  test('prepend with TOKENs both sides does not anchor', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const state = createState(doc, tokens(doc)[1]);
    state.setInsertState('CURSOR_PREPEND');

    // act
    SplitAtToken.run(state);

    // assert
    const lines = doc.root.querySelectorAll('p');
    expect(lines).toHaveLength(2);
    expect(identifyChildren(lines[0])).toEqual(['hello', '[nodeType=3:" "]']);
    expect(identifyChildren(lines[1])).toEqual(['world']);
    expect(doc.root.querySelectorAll(`.${JSED_ANCHOR_CLASS}`)).toHaveLength(0);
  });

  test('after TOKEN before OPAQUE anchors the peer before the OPAQUE', () => {
    // arrange
    const doc = makeRoot(p(t('foo'), s(), '<span class="katex" style="display:inline;">x2</span>'));
    const state = createState(doc, tokens(doc)[0]);
    state.setInsertState('CURSOR_APPEND');

    // act
    SplitAtToken.run(state);

    // assert
    const lines = doc.root.querySelectorAll('p');
    const newLine = lines[1];
    const anchor = newLine.querySelector(`.${JSED_ANCHOR_CLASS}`) as HTMLElement | null;
    const opaque = newLine.querySelector('.katex');
    expect(lines).toHaveLength(2);
    expect(identifyChildren(newLine)).toEqual([
      '[nodeType=3:" "]',
      '[anchor]',
      '[opaque:span]',
      '[anchor]'
    ]);
    expect(anchor).not.toBeNull();
    expect(opaque).not.toBeNull();
    expect(
      anchor!.compareDocumentPosition(opaque!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(getSeparatorBefore(anchor!)?.nodeValue).toBe(' ');
  });

  test('after TOKEN in nested INLINE_FLOW anchors emptied peer', () => {
    // arrange
    const doc = makeRoot(p(em({ style: inlineStyleHackVal }, t('a'))));
    const state = createState(doc, tokens(doc)[0]);
    state.setInsertState('CURSOR_APPEND');

    // act
    SplitAtToken.run(state);

    // assert
    const lines = doc.root.querySelectorAll('p');
    expect(lines).toHaveLength(2);
    expect(identifyChildren(lines[0].querySelector('em')!)).toEqual(['a']);
    expect(identifyChildren(lines[1].querySelector('em')!)).toEqual(['[anchor]']);
    expect(isAnchor(state.getPlace())).toBe(true);
  });
});
