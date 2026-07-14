import { describe, expect, test } from 'vitest';
import {
  canWrapLineSibling,
  createToken,
  insertAfter,
  redoInsertAfter,
  redoReplaceText,
  redoWrapLineSiblingWithTag,
  remove,
  replaceText,
  undoInsertAfter,
  undoReplaceText,
  undoWrapLineSiblingWithTag,
  wrapLineSiblingWithTag
} from '../token.js';
import { createAnchor } from '../anchor.js';
import { isAnchor, JSED_DELETED_CLASS, JSED_IGNORE_CLASS } from '../../core/taxonomy.js';
import {
  buildParent,
  div,
  em,
  findTokenByText,
  identifyChildren,
  makeRawRoot,
  p,
  s,
  t
} from '../../../test/util.js';

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

  test('undo / redo', () => {
    // arrange
    const token = createToken('foo');
    const rec = replaceText(token, 'bar');

    // act
    undoReplaceText(rec);

    // assert
    expect(token.textContent).toBe('foo');

    // act
    redoReplaceText(rec);

    // assert
    expect(token.textContent).toBe('bar');
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

describe('insertAfter', () => {
  test('inserts TOKEN and separator after existing TOKEN', () => {
    // arrange
    const foo = createToken('foo');
    const bar = createToken('bar');
    const parent = buildParent(foo);

    // act
    insertAfter(bar, foo);

    // assert
    expect(identifyChildren(parent)).toEqual(['foo', '[nodeType=3:" "]', 'bar']);
  });

  test('undo / redo', () => {
    // arrange
    const foo = createToken('foo');
    const bar = createToken('bar');
    const parent = buildParent(foo);
    const rec = insertAfter(bar, foo);

    // act
    undoInsertAfter(rec);

    // assert
    expect(identifyChildren(parent)).toEqual(['foo', '[deleted-space]', 'd("bar")']);

    // act
    redoInsertAfter(rec);

    // assert
    expect(identifyChildren(parent)).toEqual(['foo', '[nodeType=3:" "]', 'bar']);
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
    const parent = buildParent(
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
    expect(identifyChildren(parent)).toEqual([
      'foo',
      '[nodeType=3:" "]',
      'd("bar")',
      '[deleted-space]',
      'baz'
    ]);
    expect(rec).toMatchObject({
      action: 'delete-token',
      token: bar,
      nextSeparator: sp2,
      previousSeparator: false
    });
  });

  test('spaces - leading space', () => {
    // arrange
    const bar = createToken('bar');
    const baz = createToken('baz');
    const sp1 = document.createTextNode(' ');
    const sp2 = document.createTextNode(' ');
    const parent = buildParent(
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
    expect(identifyChildren(parent)).toEqual([
      '[deleted-space]',
      'd("bar")',
      '[deleted-space]',
      'baz'
    ]);
    expect(rec).toMatchObject({
      action: 'delete-token',
      token: bar,
      nextSeparator: sp2,
      previousSeparator: sp1
    });
  });
});

describe('canWrapLineSiblingWithTag', () => {
  test('TOKEN in p + em', () => {
    // arrange
    const root = makeRawRoot(p(t('a')));
    const token = findTokenByText(root, 'a');

    // act / assert
    expect(canWrapLineSibling(token, 'em')).toBe(true);
  });

  test('tag name is normalized', () => {
    // arrange
    const root = makeRawRoot(p(t('a')));
    const token = findTokenByText(root, 'a');

    // act / assert
    expect(canWrapLineSibling(token, 'EM')).toBe(true);
  });

  test('empty tag name', () => {
    // arrange
    const root = makeRawRoot(p(t('a')));
    const token = findTokenByText(root, 'a');

    // act / assert
    expect(canWrapLineSibling(token, '')).toBe(false);
  });

  test('unknown tag name', () => {
    // arrange
    const root = makeRawRoot(p(t('a')));
    const token = findTokenByText(root, 'a');

    // act / assert
    expect(canWrapLineSibling(token, 'foo')).toBe(false);
  });

  test('detached TOKEN', () => {
    // arrange
    const token = createToken('a');

    // act / assert
    expect(canWrapLineSibling(token, 'em')).toBe(false);
  });

  test('not a LINE_SIBLING', () => {
    // arrange
    const root = makeRawRoot(p(em(t('a'))));
    const inlineFlow = root.querySelector('em')!;

    // act / assert
    expect(canWrapLineSibling(inlineFlow, 'strong')).toBe(false);
  });

  test('block tag', () => {
    // arrange
    const root = makeRawRoot(p(t('a')));
    const token = findTokenByText(root, 'a');

    // act / assert
    expect(canWrapLineSibling(token, 'div')).toBe(false);
  });

  test('block tag - in a permissive parent', () => {
    // arrange
    const root = makeRawRoot(div(t('a')));
    const token = findTokenByText(root, 'a');

    // act / assert
    expect(canWrapLineSibling(token, 'ul')).toBe(false);
  });
});

describe('wrapLineSiblingWithTag', () => {
  test('wrapper takes the LINE_SIBLING slot, separator stays outside', () => {
    // arrange
    const root = makeRawRoot(p(t('a'), s(), t('b')));
    const parent = root.querySelector('p')!;
    const token = findTokenByText(root, 'a');

    // act
    const op = wrapLineSiblingWithTag(token, 'em');

    // assert
    expect(op).toMatchObject({ action: 'wrap-line-sibling', lineSibling: token });
    expect(identifyChildren(parent)).toEqual([
      '[element:em]', //
      '[nodeType=3:" "]',
      'b'
    ]);
    expect(identifyChildren(op!.wrapper)).toEqual(['a']);
  });

  test('LINE_SIBLING in the middle', () => {
    // arrange
    const root = makeRawRoot(p(t('a'), s(), t('b'), s(), t('c')));
    const parent = root.querySelector('p')!;
    const token = findTokenByText(root, 'b');

    // act
    const op = wrapLineSiblingWithTag(token, 'strong');

    // assert
    expect(identifyChildren(parent)).toEqual([
      'a',
      '[nodeType=3:" "]',
      '[element:strong]',
      '[nodeType=3:" "]',
      'c'
    ]);
    expect(identifyChildren(op!.wrapper)).toEqual(['b']);
  });

  test('last LINE_SIBLING', () => {
    // arrange
    const root = makeRawRoot(p(t('a'), s(), t('b')));
    const parent = root.querySelector('p')!;
    const token = findTokenByText(root, 'b');

    // act
    wrapLineSiblingWithTag(token, 'em');

    // assert
    expect(identifyChildren(parent)).toEqual([
      'a', //
      '[nodeType=3:" "]',
      '[element:em]'
    ]);
  });

  test('tag name is normalized', () => {
    // arrange
    const root = makeRawRoot(p(t('a')));
    const token = findTokenByText(root, 'a');

    // act
    const op = wrapLineSiblingWithTag(token, 'EM');

    // assert
    expect(op!.wrapper.tagName).toBe('EM');
    expect(op!.wrapper.parentElement).toBe(root.querySelector('p'));
  });

  test('cannot wrap → no-op', () => {
    // arrange
    const root = makeRawRoot(p(t('a'), s(), t('b')));
    const parent = root.querySelector('p')!;
    const token = findTokenByText(root, 'a');

    // act
    const op = wrapLineSiblingWithTag(token, 'div');

    // assert
    expect(op).toBeUndefined();
    expect(identifyChildren(parent)).toEqual([
      'a', //
      '[nodeType=3:" "]',
      'b'
    ]);
  });
});

describe('undoWrapLineSiblingWithTag / redoWrapLineSiblingWithTag', () => {
  test('undo', () => {
    // arrange
    const root = makeRawRoot(
      p(
        t('a'), //
        s(),
        t('b'),
        s(),
        t('c')
      )
    );
    const parent = root.querySelector('p')!;
    const op = wrapLineSiblingWithTag(findTokenByText(root, 'b'), 'em')!;

    // act
    undoWrapLineSiblingWithTag(op);

    // assert
    expect(root.querySelector('em')).toBeNull();
    expect(identifyChildren(parent)).toEqual([
      'a',
      '[nodeType=3:" "]',
      'b',
      '[nodeType=3:" "]',
      'c'
    ]);
  });

  test('redo', () => {
    // arrange
    const root = makeRawRoot(
      p(
        t('a'), //
        s(),
        t('b'),
        s(),
        t('c')
      )
    );
    const parent = root.querySelector('p')!;
    const op = wrapLineSiblingWithTag(findTokenByText(root, 'b'), 'em')!;
    undoWrapLineSiblingWithTag(op);

    // act
    redoWrapLineSiblingWithTag(op);

    // assert
    expect(identifyChildren(parent)).toEqual([
      'a',
      '[nodeType=3:" "]',
      '[element:em]',
      '[nodeType=3:" "]',
      'c'
    ]);
    expect(identifyChildren(op.wrapper)).toEqual(['b']);
  });

  test('undo / redo / undo round trip', () => {
    // arrange
    const root = makeRawRoot(p(t('a'), s(), t('b')));
    const parent = root.querySelector('p')!;
    const before = identifyChildren(parent);
    const op = wrapLineSiblingWithTag(findTokenByText(root, 'a'), 'em')!;

    // act
    undoWrapLineSiblingWithTag(op);
    redoWrapLineSiblingWithTag(op);
    undoWrapLineSiblingWithTag(op);

    // assert
    expect(identifyChildren(parent)).toEqual(before);
    expect(root.querySelector('em')).toBeNull();
  });
});
