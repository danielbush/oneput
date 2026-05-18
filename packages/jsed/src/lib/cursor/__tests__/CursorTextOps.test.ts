import { describe, expect, test } from 'vitest';
import { a, em, identify, inlineStyleHackVal, makeRoot, p, s, t } from '../../../test/util.js';
import { JsedDocument } from '../../../JsedDocument.js';
import { Tokenizer } from '../../token/Tokenizer.js';
import { Cursor } from '../../../lib/cursor/Cursor.js';
import { getValue } from '../../../lib/token/token.js';
import { isDeletedToken, JSED_TOKEN_CLASS } from '../../core/taxonomy.js';

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
  return Array.from(doc.root.querySelectorAll(`.${JSED_TOKEN_CLASS}`)) as HTMLElement[];
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
  test('first TOKEN', () => {
    // arrange
    const doc = makeRoot(
      p(
        //
        t('hello'),
        s(),
        t('world'),
        s(),
        t('foo')
      )
    );
    const { cursor } = createCursor(doc, tokens(doc)[0]);

    // act
    cursor.delete();

    // assert
    expect(getValue(cursor.getPlace())).toBe('world');
    expect(identify(tokens(doc)[0])).toBe('d("hello")');
  });

  test('last TOKEN', () => {
    // arrange
    const doc = makeRoot(
      p(
        //
        t('hello'),
        s(),
        t('world')
      )
    );
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.delete();

    // assert
    expect(getValue(cursor.getPlace())).toBe('hello');
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
    expect(identify(cursor.getPlace().nextElementSibling)).toBe('d("bbb")'); // not removed from dom
    expect(isDeletedToken(cursor.getPlace().nextElementSibling)).toBe(true);
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
