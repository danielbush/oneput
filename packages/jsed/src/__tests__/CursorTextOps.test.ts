import { describe, expect, it, test } from 'vitest';
import { em, identify, makeRoot, p, s, t } from '../test/util.js';
import { JsedDocument } from '../JsedDocument.js';
import { Tokenizer } from '../Tokenizer.js';
import { TokenCursor } from '../TokenCursor.js';
import { CursorMotion } from '../CursorMotion.js';
import { CursorTextOps } from '../CursorTextOps.js';
import { JSED_TOKEN_CLASS } from '../lib/constants.js';
import { getValue } from '../lib/token.js';

/**
 * See INLINE_COMPUTED_STYLE
 */
const inlineStyle = { style: 'display:inline;' };

function createCursor(doc: JsedDocument, tok: HTMLElement) {
  const errors: string[] = [];
  const tokenizer = Tokenizer.createNull();
  const textOps = CursorTextOps.createNull({
    tokenizer,
    onError: (err) => errors.push(err.type)
  });

  const cursor = TokenCursor.create({
    document: doc,
    motion: CursorMotion.createNull({ document: doc, tokenizer }),
    textOps,
    token: tok,
    onCursorChange: () => {},
    onError: (err) => errors.push(err.type)
  });

  return { cursor, errors };
}

function tokens(doc: JsedDocument): HTMLElement[] {
  return Array.from(doc.root.querySelectorAll(`.${JSED_TOKEN_CLASS}`)) as HTMLElement[];
}

describe('splitAtToken', () => {
  test('splits after the current TOKEN for CURSOR_APPEND', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world'), s(), t('foo')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);
    cursor.setState('CURSOR_APPEND');

    // act
    cursor.ops.splitAtToken();

    // assert
    expect(getValue(cursor.getToken())).toBe('world');
    expect(cursor.getDocument().root.querySelectorAll('p')).toHaveLength(2);
  });

  test('splits after the current TOKEN for CURSOR_INSERT_AFTER', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world'), s(), t('foo')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);
    cursor.setState('CURSOR_INSERT_AFTER');

    // act
    cursor.ops.splitAtToken();

    // assert
    expect(getValue(cursor.getToken())).toBe('world');
    expect(cursor.getDocument().root.querySelectorAll('p')).toHaveLength(2);
  });

  test('splits before the current TOKEN when no after-state marker is set', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world'), s(), t('foo')));
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.ops.splitAtToken();

    // assert
    expect(getValue(cursor.getToken())).toBe('world');
    expect(cursor.getDocument().root.querySelectorAll('p')).toHaveLength(2);
    expect(cursor.getDocument().root.querySelectorAll('p')[0]?.textContent?.trim()).toBe('hello');
    expect(cursor.getDocument().root.querySelectorAll('p')[1]?.textContent?.trim()).toBe(
      'world foo'
    );
  });
});

describe('replace', () => {
  it('replaces TOKEN text', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);

    // act
    cursor.ops.replace('goodbye');

    // assert
    expect(getValue(cursor.getToken())).toBe('goodbye');
  });

  it('replaces TOKEN text after an ISLAND without adding padding state', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('bbb'))
    );
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.ops.replace('ccc');

    // assert
    expect(getValue(cursor.getToken())).toBe('ccc');
  });

  it('no-op when cursor is on ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('bbb'))
    );
    const island = doc.root.querySelector('.katex') as HTMLElement;
    const { cursor } = createCursor(doc, island);
    expect(identify(cursor.getToken())).toBe('[island:span]');

    // act
    cursor.ops.replace('oops');

    // assert
    expect(identify(cursor.getToken())).toBe('[island:span]');
  });
});

describe('delete', () => {
  it('deletes TOKEN and moves cursor to next TOKEN', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world'), s(), t('foo')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);

    // act
    cursor.ops.delete();

    // assert
    expect(getValue(cursor.getToken())).toBe('world');
  });

  it('deletes last TOKEN and moves cursor to previous TOKEN', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.ops.delete();

    // assert
    expect(getValue(cursor.getToken())).toBe('hello');
  });

  it('no-op when cursor is on ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('bbb'))
    );
    const island = doc.root.querySelector('.katex') as HTMLElement;
    const { cursor } = createCursor(doc, island);
    expect(identify(cursor.getToken())).toBe('[island:span]');

    // act
    cursor.ops.delete();

    // assert
    expect(identify(cursor.getToken())).toBe('[island:span]');
  });

  it('deletes TOKEN after an ISLAND and moves cursor to next TOKEN', () => {
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
    cursor.ops.delete();

    // assert
    expect(getValue(cursor.getToken())).toBe('ccc');
  });

  it('deletes last TOKEN after an ISLAND and leaves an ANCHOR', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('bbb'))
    );
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.ops.delete();

    // assert
    expect(identify(cursor.getToken())).toBe('[anchor]');
  });
});

describe('append', () => {
  it('inserts a new TOKEN after the current one', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);

    // act
    cursor.ops.append('new');

    // assert
    expect(getValue(cursor.getToken())).toBe('hello');
    cursor.moveNext();
    expect(getValue(cursor.getToken())).toBe('new');
    cursor.moveNext();
    expect(getValue(cursor.getToken())).toBe('world');
  });

  it('inserts a whitespace text node between the current TOKEN and the appended TOKEN', () => {
    // arrange
    const doc = makeRoot(p(t('hello')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);
    const current = cursor.getToken();

    // act
    const appended = cursor.ops.append('new');

    // assert
    expect(appended).not.toBeNull();
    expect(current.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
    expect(current.nextSibling?.textContent).toBe(' ');
    expect(current.nextSibling?.nextSibling).toBe(appended);
  });

  it('no-op when cursor is on ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('bbb'))
    );
    const island = doc.root.querySelector('.katex') as HTMLElement;
    const { cursor } = createCursor(doc, island);

    // act
    const result = cursor.ops.append('oops');

    // assert
    expect(result).toBeNull();
  });
});

describe('joinNext', () => {
  it('joins current TOKEN with next TOKEN', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[0]);

    // act
    cursor.ops.joinNext();

    // assert
    expect(getValue(cursor.getToken())).toBe('helloworld');
  });

  it('joins current TOKEN with next TOKEN after an ISLAND without padding state', () => {
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
    cursor.ops.joinNext();

    // assert
    expect(getValue(cursor.getToken())).toBe('bbbccc');
  });

  it('no-op when cursor is on ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('bbb'))
    );
    const island = doc.root.querySelector('.katex') as HTMLElement;
    const { cursor } = createCursor(doc, island);

    // act
    cursor.ops.joinNext();

    // assert
    expect(identify(cursor.getToken())).toBe('[island:span]');
  });

  it('no-op when next LINE_SIBLING is an INLINE_FLOW', () => {
    // arrange
    const doc = makeRoot(p(t('aaa'), s(), em(inlineStyle, t('bbb'))));
    const { cursor } = createCursor(doc, tokens(doc)[0]);

    // act
    cursor.ops.joinNext();

    // assert
    expect(getValue(cursor.getToken())).toBe('aaa');
  });
});

describe('joinPrevious', () => {
  it('joins current TOKEN with previous TOKEN', () => {
    // arrange
    const doc = makeRoot(p(t('hello'), s(), t('world')));
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.ops.joinPrevious();

    // assert
    expect(getValue(cursor.getToken())).toBe('helloworld');
  });

  it('joinPrevious preserves boundary padding when survivor becomes ISLAND-adjacent', () => {
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
    cursor.ops.joinPrevious();

    // assert
    expect(getValue(cursor.getToken())).toBe('bbbccc');
  });

  it('no-op when cursor is on ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('bbb'))
    );
    const island = doc.root.querySelector('.katex') as HTMLElement;
    const { cursor } = createCursor(doc, island);

    // act
    cursor.ops.joinPrevious();

    // assert
    expect(identify(cursor.getToken())).toBe('[island:span]');
  });

  it('no-op when previous LINE_SIBLING is an INLINE_FLOW', () => {
    // arrange
    const doc = makeRoot(p(em(inlineStyle, t('aaa')), s(), t('bbb')));
    const { cursor } = createCursor(doc, tokens(doc)[1]);

    // act
    cursor.ops.joinPrevious();

    // assert
    expect(getValue(cursor.getToken())).toBe('bbb');
  });
});
