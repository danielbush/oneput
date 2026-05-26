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
import { Tokenizer } from '../../token/Tokenizer.js';
import { Cursor } from '../../../lib/cursor/Cursor.js';
import { getValue } from '../../../lib/token/token.js';
import { getSeparatorAfter } from '../../token/space.js';
import { JSED_ANCHOR_CLASS, JSED_TOKEN_CLASS } from '../../core/taxonomy.js';

/**
 * See INLINE_COMPUTED_STYLE
 */
const inlineStyle = { style: 'display:inline;' };

function createCursor(doc: JsedDocument, tok: HTMLElement) {
  const errors: string[] = [];
  const tokenizer = Tokenizer.createNull();

  const cursor = Cursor.create({
    document: doc,
    tokenizer,
    token: tok,
    onCursorChange: () => {},
    onError: (err) => errors.push(err.type)
  });

  return { cursor, errors };
}

function tokens(doc: JsedDocument): HTMLElement[] {
  return Array.from(
    doc.root.querySelectorAll(`.${JSED_TOKEN_CLASS}, .${JSED_ANCHOR_CLASS}`)
  ) as HTMLElement[];
}

function tokenValues(doc: JsedDocument): string[] {
  return tokens(doc).map((token) => getValue(token));
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
    expect(getValue(cursor.getPlace())).toBe('world');
    expect(cursor.getDocument().root.querySelectorAll('p')).toHaveLength(2);
  });

  test('CURSOR_INSERT_AFTER', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world'), s(), t('foo')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);
    cursor.setInsertState('CURSOR_INSERT_AFTER');

    // act
    cursor.splitAtToken();

    // assert
    expect(getValue(cursor.getPlace())).toBe('world');
    expect(cursor.getDocument().root.querySelectorAll('p')).toHaveLength(2);
  });

  test('default split before current TOKEN', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world'), s(), t('foo')));
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.splitAtToken();

    // assert
    expect(getValue(cursor.getPlace())).toBe('foo');
    expect(cursor.getDocument().root.querySelectorAll('p')).toHaveLength(2);
  });

  test.todo('ANCHOR_ISLAND_EDGE_CASE - split after first TOKEN that precedes an ISLAND', () => {
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
      '[anchor]',
      '[nodeType=3:" "]',
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
    expect(getSeparatorAfter(anchor!)?.nodeValue).toBe(' ');
  });
});

describe('replaceWithText', () => {
  test('TOKEN text', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);

    // act
    cursor.replaceWithText('goodbye');

    // assert
    expect(getValue(cursor.getPlace())).toBe('goodbye');
  });

  test('TOKEN after ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('bbb'))
    );
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.replaceWithText('ccc');

    // assert
    expect(getValue(cursor.getPlace())).toBe('ccc');
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
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);

    // act
    const result = cursor.replaceWithText('goodbye friend');

    // assert
    expect(tokenValues(doc)).toEqual(['goodbye', 'friend', 'world']);
    expect(result).not.toBeNull();
    expect(getValue(result!)).toBe('friend');
    expect(getValue(cursor.getPlace())).toBe('friend');
  });
});

describe('insertTextAfter', () => {
  test('multiple TOKEN insert after', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);

    // act
    const result = cursor.insertTextAfter('new words');

    // assert
    expect(tokenValues(doc)).toEqual(['hello', 'new', 'words', 'world']);
    expect(result).not.toBeNull();
    expect(getValue(result!)).toBe('words');
    expect(getValue(cursor.getPlace())).toBe('words');
  });
});

describe('insertTextBefore', () => {
  test('multiple TOKEN insert before', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    const result = cursor.insertTextBefore('new words');

    // assert
    expect(tokenValues(doc)).toEqual(['hello', 'new', 'words', 'world']);
    expect(result).not.toBeNull();
    expect(getValue(result!)).toBe('words');
    expect(getValue(cursor.getPlace())).toBe('words');
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
    expect(getValue(cursor.getPlace())).toBe('world');
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
    expect(getValue(cursor.getPlace())).toBe('hello');
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
        //
        t('aaa'),
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

  test.todo('ANCHOR ...<em>A</em>...', () => {
    // arrange
    const doc = makeRoot(
      p(
        //
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
    expect(identify(cursor.getPlace())).toBe('aaa');
    expect(identify(cursor.getPlace().nextSibling)).toBe('[nodeType=3:" "]');
    // This should be a delete marker for em-tag, then 'ccc'
    // Spaces should be coalesced into one.
    expect(identify(cursor.getPlace().nextSibling?.nextSibling)).toBe('ccc');
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
    expect(getValue(cursor.getPlace())).toBe('helloworld');
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
    expect(getValue(cursor.getPlace())).toBe('bbbccc');
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
    expect(getValue(cursor.getPlace())).toBe('aaa');
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
    expect(getValue(cursor.getPlace())).toBe('helloworld');
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
    expect(getValue(cursor.getPlace())).toBe('bbbccc');
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
    expect(getValue(cursor.getPlace())).toBe('bbb');
  });
});
