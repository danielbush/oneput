import { describe, expect, test } from 'vitest';
import { em, identify, makeRoot, p, s, t } from '../test/util.js';
import { JsedDocument } from '../JsedDocument.js';
import { Tokenizer } from '../Tokenizer.js';
import { Cursor } from '../Cursor.js';
import { JSED_TOKEN_CLASS } from '../lib/dom/constants.js';
import { getValue } from '../lib/dom/token.js';

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

describe('replace', () => {
  test('TOKEN text', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);

    // act
    cursor.replace('goodbye');

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
    cursor.replace('ccc');

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
    cursor.replace('oops');

    // assert
    expect(identify(cursor.getPlace())).toBe('[island:span]');
  });
});

describe('replaceWithText', () => {
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
  test('middle TOKEN', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world'), s(), t('foo')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);

    // act
    cursor.delete();

    // assert
    expect(getValue(cursor.getPlace())).toBe('world');
  });

  test('last TOKEN', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.delete();

    // assert
    expect(getValue(cursor.getPlace())).toBe('hello');
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
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('[island:span]');
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
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.delete();

    // assert
    expect(getValue(cursor.getPlace())).toBe('ccc');
  });

  test('last TOKEN after ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('bbb'))
    );
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getPlace())).toBe('[anchor]');
  });
});

describe('append', () => {
  test('new TOKEN after current', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);

    // act
    cursor.append('new');

    // assert
    expect(getValue(cursor.getPlace())).toBe('hello');
    cursor.moveNext();
    expect(getValue(cursor.getPlace())).toBe('new');
    cursor.moveNext();
    expect(getValue(cursor.getPlace())).toBe('world');
  });

  test('separator before appended TOKEN', () => {
    // arrange
    const doc = makeRoot(p(t('hello')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);
    const current = cursor.getPlace();

    // act
    const appended = cursor.append('new');

    // assert
    expect(appended).not.toBeNull();
    expect(current.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
    expect(current.nextSibling?.textContent).toBe(' ');
    expect(current.nextSibling?.nextSibling).toBe(appended);
  });

  test('ISLAND no-op', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('bbb'))
    );
    const island = doc.root.querySelector('.katex') as HTMLElement;
    const { cursor } = createCursor(doc, island);

    // act
    const result = cursor.append('oops');

    // assert
    expect(result).toBeNull();
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
