import { describe, expect, test } from 'vitest';
import { createToken, remove, removeToken, replaceText } from '../token.js';
import { createAnchor } from '../anchor.js';
import {
  isAnchor,
  isDeletedAnchor,
  JSED_DELETED_CLASS,
  JSED_IGNORE_CLASS
} from '../../core/taxonomy.js';
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

describe('removeToken', () => {
  test('ANCHOR → soft-deleted, still an ANCHOR', () => {
    // arrange
    const anchor = createAnchor();
    const parent = buildParent(anchor);

    // act
    removeToken(anchor);

    // assert — node stays put (not detached) and is still an ANCHOR
    expect(parent.contains(anchor)).toBe(true);
    expect(isAnchor(anchor)).toBe(true);
    expect(isDeletedAnchor(anchor)).toBe(true);
  });
});
