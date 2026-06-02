import { describe, expect, test } from 'vitest';
import { createToken, remove, replaceText } from '../token.js';
import { createAnchor } from '../anchor.js';
import { isAnchor, JSED_DELETED_CLASS, JSED_IGNORE_CLASS } from '../../core/taxonomy.js';
import { buildParent } from '../../../test/util.js';

describe('replaceText', () => {
  test('existing TOKEN', () => {
    // arrange
    const token = createToken('foo');

    // act
    replaceText(token, 'bar');

    // assert
    expect(token.textContent).toBe('bar');
    expect(token.childNodes).toHaveLength(1);
    expect(token.firstChild?.nodeType).toBe(Node.TEXT_NODE);
  });

  test('empty ANCHOR', () => {
    // arrange
    const anchor = createAnchor();
    expect(anchor.childNodes).toHaveLength(0);

    // act
    replaceText(anchor, 'bar');

    // assert
    expect(isAnchor(anchor)).toBe(false);
    expect(anchor.textContent).toBe('bar');
    expect(anchor.childNodes).toHaveLength(1);
    expect(anchor.firstChild?.nodeType).toBe(Node.TEXT_NODE);
  });
});

describe('remove', () => {
  test('last line sibling → anchorize', () => {
    // arrange
    const bar = createToken('bar');
    buildParent(
      bar //
    );

    // act
    const rec = remove(bar);

    // assert
    expect(bar.parentNode).toBeDefined();
    expect(bar.classList).toContain(JSED_DELETED_CLASS);
    expect(bar.classList).toContain(JSED_IGNORE_CLASS);
    expect(isAnchor(bar.previousSibling as Node)).toBe(true);
    expect(rec).toMatchObject({
      action: 'anchorize-token',
      anchor: bar.previousSibling,
      removedToken: {
        action: 'delete-token',
        token: bar,
        nextSeparator: false,
        previousSeparator: false
      }
    });
  });

  test('has sibling → delete-token', () => {
    // arrange
    const foo = createToken('foo');
    const bar = createToken('bar');
    buildParent(
      foo, //
      bar
    );

    // act
    const rec = remove(bar);

    // assert
    expect(bar.parentNode).toBeDefined();
    expect(bar.classList).toContain(JSED_DELETED_CLASS);
    expect(bar.classList).toContain(JSED_IGNORE_CLASS);
    expect(rec).toMatchObject({
      action: 'delete-token',
      token: bar,
      nextSeparator: false,
      previousSeparator: false
    });
  });

  test('spaces', () => {
    // arrange
    const foo = createToken('foo');
    const bar = createToken('bar');
    const baz = createToken('baz');
    const sp1 = document.createTextNode(' ');
    const sp2 = document.createTextNode(' ');
    buildParent(
      foo, //
      sp1,
      bar,
      sp2,
      baz
    );

    // act
    const rec = remove(bar);

    // assert
    expect(bar.parentNode).toBeDefined();
    expect(bar.classList).toContain(JSED_DELETED_CLASS);
    expect(bar.classList).toContain(JSED_IGNORE_CLASS);
    expect(rec).toMatchObject({
      action: 'delete-token',
      token: bar,
      nextSeparator: sp2,
      previousSeparator: false
    });
  });

  test('spaces 2', () => {
    // arrange
    const bar = createToken('bar');
    const baz = createToken('baz');
    const sp1 = document.createTextNode(' ');
    const sp2 = document.createTextNode(' ');
    buildParent(
      sp1, // leading space - may be deliberate
      bar,
      sp2,
      baz
    );

    // act
    const rec = remove(bar);

    // assert
    expect(bar.parentNode).toBeDefined();
    expect(bar.classList).toContain(JSED_DELETED_CLASS);
    expect(bar.classList).toContain(JSED_IGNORE_CLASS);
    expect(rec).toMatchObject({
      action: 'delete-token',
      token: bar,
      nextSeparator: sp2,
      previousSeparator: sp1
    });
  });
});

// TODO: Remove these once we're happy with flipping rather then detaching tokens.
/*
describe('remove (destructive)', () => {
  test('middle TOKEN', () => {
    // arrange
    const foo = createToken('foo');
    const bar = createToken('bar');
    const baz = createToken('baz');
    buildParent(foo, document.createTextNode(' '), bar, document.createTextNode(' '), baz);

    // act
    const [prev, next] = remove(bar);

    // assert
    expect(prev).toBe(foo);
    expect(next).toBe(baz);
    expect(bar.isConnected).toBe(false);
  });

  test('last TOKEN', () => {
    // arrange
    const foo = createToken('foo');
    const bar = createToken('bar');
    buildParent(foo, document.createTextNode(' '), bar);

    // act
    const [prev, next] = remove(bar);

    // assert
    expect(prev).toBe(foo);
    expect(next).toBeNull();
  });

  test('next element', () => {
    // arrange
    const before = createToken('before');
    const p1 = document.createElement('p');
    p1.textContent = 'stuff';
    const parent = buildParent(before, p1);

    // act
    const [prev, next] = remove(before);

    // assert
    expect(prev).toBeNull();
    expect(next).toBe(p1);
    expect(before.parentNode).toBeNull();
    expect(Array.from(parent.children)).toEqual([p1]);
  });

  test('previous element', () => {
    // arrange
    const p1 = document.createElement('p');
    p1.textContent = 'stuff';
    const only = createToken('only');
    const parent = buildParent(p1, only);

    // act
    const [prev, next] = remove(only);

    // assert
    expect(prev).toBe(p1);
    expect(next).toBeNull();
    expect(only.parentNode).toBeNull();
    expect(Array.from(parent.children)).toEqual([p1]);
  });

  test('end-of-segment separators', () => {
    // arrange — `[prev, ' ', removed, ' ']`. After removing `removed`, both
    // separators associated with the removed TOKEN are dropped.
    const prev = createToken('prev');
    const removed = createToken('removed');
    const sepBefore = document.createTextNode(' ');
    const sepAfter = document.createTextNode(' ');
    const parent = buildParent(prev, sepBefore, removed, sepAfter);

    // act
    remove(removed);

    // assert
    expect(Array.from(parent.childNodes)).toEqual([prev]);
    expect(sepBefore.parentNode).toBeNull();
    expect(sepAfter.parentNode).toBeNull();
  });

  test('start-of-segment separators', () => {
    // arrange — `[' ', removed, ' ', next]`. After removing `removed`, both
    // separators associated with the removed TOKEN are dropped.
    const removed = createToken('removed');
    const next = createToken('next');
    const sepBefore = document.createTextNode(' ');
    const sepAfter = document.createTextNode(' ');
    const parent = buildParent(sepBefore, removed, sepAfter, next);

    // act
    remove(removed);

    // assert
    expect(Array.from(parent.childNodes)).toEqual([next]);
    expect(sepBefore.parentNode).toBeNull();
    expect(sepAfter.parentNode).toBeNull();
  });

  test('closing INLINE_FLOW separator', () => {
    // arrange
    const doc = makeRoot(
      p(
        emTag(
          { id: 'em1', style: 'display:inline;' }, //
          t('foo'),
          s(),
          t('bar')
        ),
        s(),
        t('baz')
      )
    );
    const em1 = byId(doc, 'em1');
    const bar = findTokenByText(doc.root, 'bar');

    // act
    remove(bar);

    // assert
    expect(em1.textContent).toBe('foo');
    expect(em1.childNodes).toHaveLength(1);
  });

  test('only TOKEN', () => {
    // arrange
    const only = createToken('only');
    const parent = buildParent(only);

    // act
    const [prev, next] = remove(only);

    // assert
    expect(prev).toBeNull();
    expect(next).toBeNull();
    expect(only.parentNode).toBeNull();
    expect(parent.children).toHaveLength(0);
  });
});
*/
