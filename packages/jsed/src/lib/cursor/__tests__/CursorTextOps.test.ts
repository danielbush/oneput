import { describe, expect, test } from 'vitest';
import {
  a,
  byId,
  em,
  findTokenByText,
  identify,
  identifyChildren,
  inlineStyleHackVal,
  makeRoot,
  p,
  s,
  t
} from '../../../test/util.js';
import { JsedDocument } from '../../../JsedDocument.js';
import { Tokenizer } from '../../ops/Tokenizer.js';
import { Cursor } from '../Cursor.js';
import { EditorEventsEmitter } from '../../editor/EditorEventsEmitter.js';
import { UndoRecorder } from '../../undo/index.js';
import { getSeparatorBefore } from '../../ops/space.js';
import { isAnchor, JSED_ANCHOR_CLASS, JSED_TOKEN_CLASS } from '../../core/taxonomy.js';
import type { EditorState } from '../../editor/EditorState.js';

/**
 * See INLINE_COMPUTED_STYLE
 */
const inlineStyle = { style: 'display:inline;' };

function createCursor(doc: JsedDocument, tok: HTMLElement) {
  const errors: string[] = [];
  const tokenizer = Tokenizer.createNull();

  const cursor = Cursor.create(tok, {
    document: doc,
    tokenizer,
    onCursorChange: () => {},
    onCursorError: (err) => errors.push(err.type),
    eventsEmitter: EditorEventsEmitter.create(),
    undo: UndoRecorder.createNull()
  });

  return { cursor, errors };
}

function tokens(doc: JsedDocument): HTMLElement[] {
  return Array.from(
    doc.root.querySelectorAll(`.${JSED_TOKEN_CLASS}, .${JSED_ANCHOR_CLASS}`)
  ) as HTMLElement[];
}

describe('splitAtToken', () => {
  test('CURSOR_APPEND', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world'), s(), t('foo')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);
    cursor.setInsertState('CURSOR_APPEND');

    // act
    cursor.splitAtToken();

    // assert
    expect(identify(cursor.getPlace())).toBe('world');
    expect(doc.root.querySelectorAll('p')).toHaveLength(2);
  });

  test('CURSOR_INSERT_AFTER', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world'), s(), t('foo')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);
    cursor.setInsertState('CURSOR_INSERT_AFTER');

    // act
    cursor.splitAtToken();

    // assert
    expect(identify(cursor.getPlace())).toBe('world');
    expect(doc.root.querySelectorAll('p')).toHaveLength(2);
  });

  test('default split before current TOKEN', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world'), s(), t('foo')));
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.splitAtToken();

    // assert
    expect(identify(cursor.getPlace())).toBe('foo');
    expect(doc.root.querySelectorAll('p')).toHaveLength(2);
  });

  // ANCHOR_ISLAND_EDGE_CASE
  test('split after first TOKEN that precedes an ISLAND', () => {
    // arrange — the TOKEN is the only TOKEN on the LINE, followed by an ISLAND
    const doc = makeRoot(p(t('foo'), s(), '<span class="katex" style="display:inline;">x²</span>'));
    const { cursor } = createCursor(doc, tokens(doc)[0]); // foo
    cursor.setInsertState('CURSOR_APPEND');

    // act
    cursor.splitAtToken();

    // assert — the ISLAND moves to a new LINE, fronted by an ANCHOR with a space between
    const lines = doc.root.querySelectorAll('p');
    expect(lines).toHaveLength(2);
    expect(lines[0].textContent).toContain('foo');
    const newLine = lines[1];
    expect(identifyChildren(lines[1])).toEqual([
      '[nodeType=3:" "]',
      '[anchor]',
      '[island:span]',
      '[anchor]'
    ]);
    const anchor = newLine.querySelector(`.${JSED_ANCHOR_CLASS}`) as HTMLElement | null;
    const island = newLine.querySelector('.katex');
    expect(anchor).not.toBeNull();
    expect(island).not.toBeNull();
    // ANCHOR comes before the ISLAND
    expect(
      anchor!.compareDocumentPosition(island!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    // a separator space is auto-generated between the ANCHOR and the ISLAND
    expect(getSeparatorBefore(anchor!)?.nodeValue).toBe(' ');
  });

  test('split before first TOKEN → ANCHOR on emptied original LINE', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[0]); // hello
    cursor.setInsertState('CURSOR_PREPEND');

    // act
    cursor.splitAtToken();

    // assert
    const lines = doc.root.querySelectorAll('p');
    expect(lines).toHaveLength(2);
    expect(identifyChildren(lines[0])).toEqual(['[anchor]']);
    expect(identifyChildren(lines[1])).toEqual(['hello', '[nodeType=3:" "]', 'world']);
    expect(identify(cursor.getPlace())).toBe('hello');
  });

  test('split after last TOKEN → ANCHOR on new empty LINE', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[1]); // world
    cursor.setInsertState('CURSOR_APPEND');

    // act
    cursor.splitAtToken();

    // assert
    const lines = doc.root.querySelectorAll('p');
    expect(lines).toHaveLength(2);
    expect(identifyChildren(lines[0])).toEqual(['hello', '[nodeType=3:" "]', 'world']);
    expect(identifyChildren(lines[1])).toEqual(['[anchor]']);
    expect(identify(cursor.getPlace())).toBe('[anchor]');
  });

  test('split with TOKENs both sides → no ANCHOR', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[1]); // world
    cursor.setInsertState('CURSOR_PREPEND');

    // act
    cursor.splitAtToken();

    // assert
    const lines = doc.root.querySelectorAll('p');
    expect(lines).toHaveLength(2);
    expect(identifyChildren(lines[0])).toEqual(['hello', '[nodeType=3:" "]']);
    expect(identifyChildren(lines[1])).toEqual(['world']);
    expect(doc.root.querySelectorAll(`.${JSED_ANCHOR_CLASS}`)).toHaveLength(0);
  });

  test('split after TOKEN in nested INLINE_FLOW → ANCHOR in emptied peer', () => {
    // arrange
    const doc = makeRoot(p(em(inlineStyle, t('a'))));
    const { cursor } = createCursor(doc, tokens(doc)[0]); // a
    cursor.setInsertState('CURSOR_APPEND');

    // act
    cursor.splitAtToken();

    // assert — anchoring targets the bottom (em) split, not the outer LINE
    const lines = doc.root.querySelectorAll('p');
    expect(lines).toHaveLength(2);
    expect(identifyChildren(lines[0].querySelector('em')!)).toEqual(['a']);
    expect(identifyChildren(lines[1].querySelector('em')!)).toEqual(['[anchor]']);
    expect(identify(cursor.getPlace())).toBe('[anchor]');
  });

  test('action / undo / redo — generates ANCHOR and places CURSOR on it', () => {
    // arrange — split after the last TOKEN: the new LINE is empty so it gets an
    // ANCHOR and the CURSOR lands on it.
    const doc = makeRoot(
      p(
        t('hello'), //
        s(),
        t('world')
      )
    );
    const { cursor } = createCursor(doc, tokens(doc)[1]); // world
    cursor.setInsertState('CURSOR_APPEND');
    const state = { cursor } as unknown as EditorState; // record.undo/redo only touch state.cursor
    const ps = () => doc.root.querySelectorAll('p');

    // act — split
    const record = cursor.splitAtToken()!;

    // assert — new empty LINE fronted by an ANCHOR, CURSOR on it
    expect(ps()).toHaveLength(2);
    expect(identifyChildren(ps()[1])).toEqual(['[anchor]']);
    expect(isAnchor(cursor.getPlace())).toBe(true);

    // act — undo
    record.undo(state);

    // assert — one LINE again, CURSOR back on the original TOKEN. The ANCHOR is
    // soft-deleted (IGNORABLE) and retained on the LINE so redo can reuse it.
    expect(ps()).toHaveLength(1);
    expect(identify(cursor.getPlace())).toBe('world');
    expect(identifyChildren(ps()[0])).toEqual(['hello', '[nodeType=3:" "]', 'world']);

    // act — redo
    record.redo(state);

    // assert — split restored, CURSOR back on the same ANCHOR
    expect(ps()).toHaveLength(2);
    expect(identifyChildren(ps()[1])).toEqual(['[anchor]']);
    expect(isAnchor(cursor.getPlace())).toBe(true);
  });
});

describe('replaceWithText', () => {
  test('TOKEN text', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, findTokenByText(doc.root, 'hello'));

    // act
    cursor.replaceWithText('goodbye');

    // assert
    expect(identifyChildren(byId(doc, 'p1'))).toEqual(['goodbye', '[nodeType=3:" "]', 'world']);
    expect(identify(cursor.getPlace())).toBe('goodbye');
  });

  test('TOKEN after ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('bbb'))
    );
    const { cursor } = createCursor(doc, findTokenByText(doc.root, 'bbb'));

    // act
    cursor.replaceWithText('ccc');

    // assert
    expect(identify(cursor.getPlace())).toBe('ccc');
  });

  test('ISLAND no-op', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('bbb'))
    );
    const island = doc.root.querySelector('.katex') as HTMLElement;
    const { cursor } = createCursor(doc, island);
    expect(identify(cursor.getPlace())).toBe('[island:span]');

    // act
    cursor.replaceWithText('oops');

    // assert
    expect(identify(cursor.getPlace())).toBe('[island:span]');
  });

  test('multiple TOKEN replacement', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, findTokenByText(doc.root, 'hello'));

    // act
    const result = cursor.replaceWithText('goodbye friend');

    // assert
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'goodbye',
      '[nodeType=3:" "]',
      'friend',
      '[nodeType=3:" "]',
      'world'
    ]);
    expect(result).not.toBeNull();
    expect(identify(cursor.getPlace())).toBe('friend');
  });

  test('multi-word on last TOKEN → no trailing separator', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, findTokenByText(doc.root, 'world'));

    // act
    cursor.replaceWithText('aaa bbb');

    // assert
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'hello',
      '[nodeType=3:" "]',
      'aaa',
      '[nodeType=3:" "]',
      'bbb'
    ]);
    expect(identify(cursor.getPlace())).toBe('bbb');
  });
});

describe('insertTextAfter', () => {
  test('multiple TOKEN insert after', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);

    // act
    cursor.insertTextAfter('new words');

    // assert
    expect(identifyChildren(doc.root)).toEqual(['[element:p]']);
    expect(identifyChildren(doc.root.firstChild)).toEqual([
      'hello',
      '[nodeType=3:" "]',
      'new',
      '[nodeType=3:" "]',
      'words',
      '[nodeType=3:" "]',
      'world'
    ]);
    expect(identify(cursor.getPlace())).toBe('words');
  });
});

describe('insertTextBefore', () => {
  test('multiple TOKEN insert before', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[1]);
    expect(identify(tokens(doc)[1])).toBe('world');

    // act
    const result = cursor.insertTextBefore('new words');

    // assert
    expect(identifyChildren(doc.root)).toEqual(['[element:p]']);
    expect(identifyChildren(doc.root.firstChild)).toEqual([
      'hello',
      '[nodeType=3:" "]',
      'new',
      '[nodeType=3:" "]',
      'words',
      '[nodeType=3:" "]',
      'world'
    ]);
    expect(result).not.toBeNull();
    expect(identify(cursor.getPlace())).toBe('words');
  });
});

describe('delete', () => {
  test('first TOKEN in doc', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' }, //
        t('hello'),
        s(),
        t('world'),
        s(),
        t('foo')
      )
    );
    const hello = findTokenByText(doc.root, 'hello');
    const { cursor } = createCursor(doc, hello);

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('world');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'd("hello")',
      '[deleted-space]',
      'world',
      '[nodeType=3:" "]',
      'foo'
    ]);
  });

  test('last TOKEN in doc', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' }, //
        t('hello'),
        s(),
        t('world')
      )
    );
    const world = findTokenByText(doc.root, 'world');
    const { cursor } = createCursor(doc, world);

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('hello');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'hello', //
      '[deleted-space]',
      'd("world")'
    ]);
  });

  test('only TOKEN in doc', () => {
    // arrange
    const doc = makeRoot(t('aaa'));
    const aaa = findTokenByText(doc.root, 'aaa');
    const { cursor } = createCursor(doc, aaa);

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('[anchor]');
    expect(identifyChildren(doc.root)).toEqual([
      '[anchor]', //
      'd("aaa")'
    ]);

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('[anchor]');
    expect(identifyChildren(doc.root)).toEqual([
      '[anchor]', //
      'd("aaa")'
    ]);
  });

  test('only ANCHOR in doc', () => {
    // arrange
    const doc = makeRoot(a());
    const { cursor } = createCursor(doc, doc.root.firstChild as HTMLElement);

    // act
    cursor.delete();

    // assert
    expect(cursor.getPlace()).toBe(doc.root.firstChild); // should be no-op
    expect(identifyChildren(doc.root)).toEqual([
      '[anchor]' //
    ]);
  });

  test.todo('ISLAND no-op', () => {
    // arrange
    const doc = makeRoot(
      p(
        t('aaa'), //
        s(),
        '<span class="katex" style="display:inline;">x²</span>',
        s(),
        t('bbb')
      )
    );
    const island = doc.root.querySelector('.katex') as HTMLElement;
    const { cursor } = createCursor(doc, island);
    expect(identify(cursor.getPlace())).toBe('[island:span]');

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('aaa');
  });

  test('ANCHOR empty doc - <p>A</p>', () => {
    // arrange
    const doc = makeRoot(
      p(
        //
        a()
      )
    );
    const { cursor } = createCursor(doc, tokens(doc)[0]);
    expect(identify(cursor.getPlace())).toBe('[anchor]');

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('[anchor]');
    expect(tokens(doc)).toHaveLength(1);
  });

  test('ANCHOR empty doc - <p>foo</p>', () => {
    // arrange
    const doc = makeRoot(
      p(
        //
        t('foo')
      )
    );
    const { cursor } = createCursor(doc, tokens(doc)[0]);
    expect(identify(cursor.getPlace())).toBe('foo');

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('[anchor]');
    expect(tokens(doc)).toHaveLength(2);
    expect(identify(cursor.getPlace().nextSibling)).toBe('d("foo")');
  });

  test('ANCHOR ∅<em>foo</em>∅', () => {
    // arrange
    const doc = makeRoot(
      p(
        //
        em({ id: 'em1', style: inlineStyleHackVal }, t('foo'))
      )
    );
    const { cursor } = createCursor(doc, tokens(doc)[0]);
    expect(identify(cursor.getPlace())).toBe('foo');

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('[anchor]');
    expect(tokens(doc)).toHaveLength(2);
    expect(identify(cursor.getPlace().nextSibling)).toBe('d("foo")');
  });

  test('ANCHOR ...<em>bbb</em>...', () => {
    // arrange
    const doc = makeRoot(
      p(
        //
        t('aaa'),
        s(),
        em({ id: 'em1', style: inlineStyleHackVal }, t('bbb')),
        s(),
        t('ccc')
      )
    );
    const { cursor } = createCursor(doc, tokens(doc)[1]);
    expect(identify(cursor.getPlace())).toBe('bbb');

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('[anchor]');
    expect(identify(cursor.getPlace().nextSibling)).toBe('d("bbb")');
  });

  test('ANCHOR ...<em>A</em>... (deleteHighestEmpty)', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' }, //
        t('aaa'),
        s(),
        em({ id: 'em1', style: inlineStyleHackVal }, a()),
        s(),
        t('ccc')
      )
    );
    const { cursor } = createCursor(doc, tokens(doc)[1]);
    expect(identify(cursor.getPlace())).toBe('[anchor]');

    // act
    cursor.delete();

    // assert
    // The empty <em> is soft-deleted in place; cursor falls back to 'aaa'.
    expect(identify(cursor.getPlace())).toBe('aaa');
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'aaa',
      '[nodeType=3:" "]',
      '[deleted-element]',
      '[nodeType=3:" "]',
      'ccc'
    ]);
  });

  test('TOKEN after ISLAND with next TOKEN', () => {
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
    expect(identify(tokens(doc)[1])).toEqual('bbb');
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('[island:span]');
  });

  test('last TOKEN after ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p(
        //
        t('aaa'),
        s(),
        '<span class="katex" style="display:inline;">x²</span>',
        s(),
        t('bbb')
      )
    );
    expect(identify(tokens(doc)[1])).toEqual('bbb');
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('[island:span]');
    expect(identify(cursor.getPlace().nextElementSibling)).toBe('[deleted-space]'); // not removed from dom
    expect(identify(cursor.getPlace().nextElementSibling?.nextElementSibling)).toBe('d("bbb")'); // not removed from dom
  });
});

describe('joinNext', () => {
  test('next TOKEN', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);

    // act
    cursor.joinNext();

    // assert
    expect(identify(cursor.getPlace())).toBe('helloworld');
  });

  test('next TOKEN after ISLAND', () => {
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
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.joinNext();

    // assert
    expect(identify(cursor.getPlace())).toBe('bbbccc');
  });

  test('ISLAND no-op', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('bbb'))
    );
    const island = doc.root.querySelector('.katex') as HTMLElement;
    const { cursor } = createCursor(doc, island);

    // act
    cursor.joinNext();

    // assert
    expect(identify(cursor.getPlace())).toBe('[island:span]');
  });

  test('next INLINE_FLOW no-op', () => {
    // arrange
    const doc = makeRoot(p(t('aaa'), s(), em(inlineStyle, t('bbb'))));
    const { cursor } = createCursor(doc, tokens(doc)[0]);

    // act
    cursor.joinNext();

    // assert
    expect(identify(cursor.getPlace())).toBe('aaa');
  });
});

describe('joinPrevious', () => {
  test('previous TOKEN', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.joinPrevious();

    // assert
    expect(identify(cursor.getPlace())).toBe('helloworld');
  });

  test('previous TOKEN before ISLAND', () => {
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
    const { cursor } = createCursor(doc, tokens(doc)[2]);

    // act
    cursor.joinPrevious();

    // assert
    expect(identify(cursor.getPlace())).toBe('bbbccc');
  });

  test('ISLAND no-op', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('bbb'))
    );
    const island = doc.root.querySelector('.katex') as HTMLElement;
    const { cursor } = createCursor(doc, island);

    // act
    cursor.joinPrevious();

    // assert
    expect(identify(cursor.getPlace())).toBe('[island:span]');
  });

  test('previous INLINE_FLOW no-op', () => {
    // arrange
    const doc = makeRoot(p(em(inlineStyle, t('aaa')), s(), t('bbb')));
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.joinPrevious();

    // assert
    expect(identify(cursor.getPlace())).toBe('bbb');
  });
});
