import { describe, expect, it } from 'vitest';
import {
  canInsertSpaceAfterToken,
  canInsertSpaceBeforeToken,
  createAnchor,
  createToken,
  getRemovableSpaceAfterToken,
  getRemovableSpaceBeforeToken,
  insertSpaceAfterToken,
  insertSpaceBeforeToken,
  remove,
  removeSpaceAfterToken,
  removeSpaceBeforeToken,
  replaceText
} from '../token.js';
import { isAnchor } from '../taxonomy.js';
import {
  byId,
  div,
  em as emTag,
  frag,
  makeRoot,
  p,
  s,
  span,
  strong as strongTag,
  t
} from '../../test/util.js';
import { Tokenizer } from '../../Tokenizer.js';

describe('replaceText', () => {
  it('rewrites an existing TOKEN text node', () => {
    // arrange
    const token = createToken('foo');

    // act
    replaceText(token, 'bar');

    // assert
    expect(token.textContent).toBe('bar');
    expect(token.childNodes).toHaveLength(1);
    expect(token.firstChild?.nodeType).toBe(Node.TEXT_NODE);
  });

  it('converts an empty ANCHOR into a TOKEN with a text node', () => {
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

function findTokenByText(root: HTMLElement, text: string): HTMLElement {
  const tok = Array.from(root.querySelectorAll('.jsed-token')).find(
    (el) => el.textContent === text
  ) as HTMLElement | undefined;
  if (!tok) throw new Error(`token with text "${text}" not found`);
  return tok;
}

describe('leading/trailing spaces', () => {
  describe('before TOKEN', () => {
    it('inserts whitespace before an anchor between adjacent inline tags', () => {
      // arrange
      const doc = makeRoot(
        frag(
          p(
            { id: 'p1' },
            emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
            span({ id: 'a1', class: 'jsed-token jsed-anchor-token' }),
            strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
          )
        )
      );
      const anchor = byId(doc, 'a1');

      // act
      const canInsert = canInsertSpaceBeforeToken(anchor);
      const result = !!insertSpaceBeforeToken(anchor);

      // assert
      expect(canInsert).toBe(true);
      expect(result).toBe(true);
      expect(anchor.previousSibling?.nodeType).toBe(Node.TEXT_NODE);
      expect(anchor.previousSibling?.textContent).toBe(' ');
    });

    it('inserts whitespace before a token between a closing tag and an opening tag', () => {
      // arrange
      const doc = makeRoot(
        frag(
          p(
            { id: 'p1' },
            emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
            t('bar'),
            strongTag({ id: 'strong1', style: 'display:inline;' }, 'baz')
          )
        )
      );
      Tokenizer.createNull().tokenizeLineAt(byId(doc, 'p1'));
      const bar = findTokenByText(doc.root, 'bar');

      // act
      const canInsert = canInsertSpaceBeforeToken(bar);
      const result = !!insertSpaceBeforeToken(bar);

      // assert
      expect(canInsert).toBe(true);
      expect(result).toBe(true);
      expect(bar.previousSibling?.nodeType).toBe(Node.TEXT_NODE);
      expect(bar.previousSibling?.textContent).toBe(' ');
    });

    it('does not offer leading space when the previous inline boundary already contributes trailing whitespace', () => {
      // arrange
      const doc = makeRoot(
        frag(
          p(
            { id: 'p1' },
            emTag({ id: 'em1', style: 'display:inline;' }, 'foo '),
            t('bar'),
            strongTag({ id: 'strong1', style: 'display:inline;' }, 'baz')
          )
        )
      );
      Tokenizer.createNull().tokenizeLineAt(byId(doc, 'p1'));
      const bar = findTokenByText(doc.root, 'bar');

      // act
      const canInsert = canInsertSpaceBeforeToken(bar);

      // assert
      expect(canInsert).toBe(false);
    });

    it('removes whitespace before an anchor between adjacent inline tags', () => {
      // arrange
      const doc = makeRoot(
        frag(
          p(
            { id: 'p1' },
            emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
            s(),
            span({ id: 'a1', class: 'jsed-token jsed-anchor-token' }),
            strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
          )
        )
      );
      const anchor = byId(doc, 'a1');

      // act
      const canRemove = !!getRemovableSpaceBeforeToken(anchor);
      const result = removeSpaceBeforeToken(anchor);

      // assert
      expect(canRemove).toBe(true);
      expect(result).toBe(true);
      expect(anchor.previousSibling?.nodeType).not.toBe(Node.TEXT_NODE);
    });

    it('removes whitespace before a token between a closing tag and an opening tag', () => {
      // arrange
      const doc = makeRoot(
        frag(
          p(
            { id: 'p1' },
            emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
            s(),
            t('bar'),
            strongTag({ id: 'strong1', style: 'display:inline;' }, 'baz')
          )
        )
      );
      const bar = findTokenByText(doc.root, 'bar');

      // act
      const canRemove = !!getRemovableSpaceBeforeToken(bar);
      const result = removeSpaceBeforeToken(bar);

      // assert
      expect(canRemove).toBe(true);
      expect(result).toBe(true);
      expect(bar.previousSibling?.nodeType).not.toBe(Node.TEXT_NODE);
    });
  });

  describe('after TOKEN', () => {
    it('inserts whitespace after an anchor between adjacent inline tags', () => {
      // arrange
      const doc = makeRoot(
        frag(
          p(
            { id: 'p1' },
            emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
            span({ id: 'a1', class: 'jsed-token jsed-anchor-token' }),
            strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
          )
        )
      );
      const anchor = byId(doc, 'a1');

      // act
      const canInsert = canInsertSpaceAfterToken(anchor);
      const result = !!insertSpaceAfterToken(anchor);

      // assert
      expect(canInsert).toBe(true);
      expect(result).toBe(true);
      expect(anchor.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
      expect(anchor.nextSibling?.textContent).toBe(' ');
    });

    it('inserts whitespace after a token between a closing tag and an opening tag', () => {
      // arrange
      const doc = makeRoot(
        frag(
          p(
            { id: 'p1' },
            emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
            t('bar'),
            strongTag({ id: 'strong1', style: 'display:inline;' }, 'baz')
          )
        )
      );
      Tokenizer.createNull().tokenizeLineAt(byId(doc, 'p1'));
      const bar = findTokenByText(doc.root, 'bar');

      // act
      const canInsert = canInsertSpaceAfterToken(bar);
      const result = !!insertSpaceAfterToken(bar);

      // assert
      expect(canInsert).toBe(true);
      expect(result).toBe(true);
      expect(bar.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
      expect(bar.nextSibling?.textContent).toBe(' ');
    });

    it('does not offer space insertion in an ordinary text run', () => {
      // arrange
      const doc = makeRoot(frag(p({ id: 'p1' }, 'foo bar baz')));
      Tokenizer.createNull().tokenizeLineAt(byId(doc, 'p1'));
      const bar = findTokenByText(doc.root, 'bar');

      // act
      const canInsertBefore = canInsertSpaceBeforeToken(bar);
      const canInsertAfter = canInsertSpaceAfterToken(bar);

      // assert
      expect(canInsertBefore).toBe(false);
      expect(canInsertAfter).toBe(false);
    });

    it('does not offer trailing space when the next inline boundary already contributes leading whitespace', () => {
      // arrange
      const doc = makeRoot(
        frag(
          p(
            { id: 'p1' },
            emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
            t('bar'),
            strongTag({ id: 'strong1', style: 'display:inline;' }, ' baz')
          )
        )
      );
      Tokenizer.createNull().tokenizeLineAt(byId(doc, 'p1'));
      const bar = findTokenByText(doc.root, 'bar');

      // act
      const canInsert = canInsertSpaceAfterToken(bar);

      // assert
      expect(canInsert).toBe(false);
    });

    it('removes whitespace after an anchor between adjacent inline tags', () => {
      // arrange
      const doc = makeRoot(
        frag(
          p(
            { id: 'p1' },
            emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
            span({ id: 'a1', class: 'jsed-token jsed-anchor-token' }),
            s(),
            strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
          )
        )
      );
      const anchor = byId(doc, 'a1');

      // act
      const canRemove = !!getRemovableSpaceAfterToken(anchor);
      const result = removeSpaceAfterToken(anchor);

      // assert
      expect(canRemove).toBe(true);
      expect(result).toBe(true);
      expect(anchor.nextSibling?.nodeType).not.toBe(Node.TEXT_NODE);
    });

    it('removes whitespace after a token between a closing tag and an opening tag', () => {
      // arrange
      const doc = makeRoot(
        frag(
          p(
            { id: 'p1' },
            emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
            t('bar'),
            s(),
            strongTag({ id: 'strong1', style: 'display:inline;' }, 'baz')
          )
        )
      );
      const bar = findTokenByText(doc.root, 'bar');

      // act
      const canRemove = !!getRemovableSpaceAfterToken(bar);
      const result = removeSpaceAfterToken(bar);

      // assert
      expect(canRemove).toBe(true);
      expect(result).toBe(true);
      expect(bar.nextSibling?.nodeType).not.toBe(Node.TEXT_NODE);
    });

    it('does not offer space removal in an ordinary text run', () => {
      // arrange
      const doc = makeRoot(frag(p({ id: 'p1' }, 'foo bar baz')));
      Tokenizer.createNull().tokenizeLineAt(byId(doc, 'p1'));
      const bar = findTokenByText(doc.root, 'bar');

      // act
      const canRemoveBefore = !!getRemovableSpaceBeforeToken(bar);
      const canRemoveAfter = !!getRemovableSpaceAfterToken(bar);

      // assert
      expect(canRemoveBefore).toBe(false);
      expect(canRemoveAfter).toBe(false);
    });

    // Blocks usually don't care about trailing or leading whitespace.
    describe('inline-block', () => {
      it('inserts whitespace after a token before an inline-block', () => {
        // arrange
        const doc = makeRoot(
          div(
            { id: 'div1' },
            t('foo'),
            div({ id: 'div2', style: 'display:inline-block;' }, p('bar')),
            s(),
            t('baz')
          )
        );
        const foo = findTokenByText(doc.root, 'foo');
        const div2 = byId(doc, 'div2');

        // act
        const canInsert = canInsertSpaceAfterToken(foo);
        const result = !!insertSpaceAfterToken(foo);

        // assert
        expect(canInsert).toBe(true);
        expect(result).toBe(true);
        expect(foo.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
        expect(foo.nextSibling?.textContent).toBe(' ');
        expect(foo.nextSibling?.nextSibling).toBe(div2);
      });

      it('inserts whitespace after a token before an inline-block with leading space', () => {
        // arrange
        const doc = makeRoot(
          div(
            { id: 'div1' },
            t('foo'),
            div(
              { id: 'opaque1', style: 'display:inline-block;' }, //
              s(), // should be ignored
              p('bar')
            ),
            s(),
            t('baz')
          )
        );
        const foo = findTokenByText(doc.root, 'foo');
        const opaque1 = byId(doc, 'opaque1');

        // act
        const canInsert = canInsertSpaceAfterToken(foo);
        const result = !!insertSpaceAfterToken(foo);

        // assert
        expect(canInsert).toBe(true);
        expect(result).toBe(true);
        expect(foo.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
        expect(foo.nextSibling?.textContent).toBe(' ');
        expect(foo.nextSibling?.nextSibling).toBe(opaque1);
      });

      it('removes whitespace after a token before an inline-block', () => {
        // arrange
        const doc = makeRoot(
          div(
            { id: 'div1' },
            t('foo'),
            s(),
            div({ id: 'opaque1', style: 'display:inline-block;' }, p('bar')),
            s(),
            t('baz')
          )
        );
        const foo = findTokenByText(doc.root, 'foo');
        const opaque1 = byId(doc, 'opaque1');

        // act
        const canRemove = !!getRemovableSpaceAfterToken(foo);
        const result = removeSpaceAfterToken(foo);

        // assert
        expect(canRemove).toBe(true);
        expect(result).toBe(true);
        expect(foo.nextSibling).toBe(opaque1);
      });

      it('removes whitespace after a token before an inline-block with extra whitespace', () => {
        // arrange
        const doc = makeRoot(
          div(
            { id: 'div1' },
            t('foo'),
            s('  '),
            div({ id: 'opaque1', style: 'display:inline-block;' }, p('bar')),
            s(),
            t('baz')
          )
        );
        const foo = findTokenByText(doc.root, 'foo');
        const opaque1 = byId(doc, 'opaque1');

        // act
        const canRemove = !!getRemovableSpaceAfterToken(foo);
        const result = removeSpaceAfterToken(foo);

        // assert
        expect(canRemove).toBe(true);
        expect(result).toBe(true);
        expect(foo.nextSibling).toBe(opaque1);
      });
    });
  });
});

// Build a parent with arbitrary children directly — sidesteps `makeRoot`'s
// load-time transforms (e.g. implicit-line wrapping) so these tests exercise
// `remove` semantics in isolation.
function buildParent(...children: Node[]): HTMLElement {
  const parent = document.createElement('div');
  parent.append(...children);
  return parent;
}

describe('remove', () => {
  it('returns the next TOKEN sibling when one exists', () => {
    // arrange
    const foo = createToken('foo');
    const bar = createToken('bar');
    const baz = createToken('baz');
    buildParent(foo, document.createTextNode(' '), bar, document.createTextNode(' '), baz);

    // act
    const { next } = remove(bar);

    // assert
    expect(next).toBe(baz);
    expect(bar.isConnected).toBe(false);
  });

  it('falls back to the previous TOKEN sibling when no next exists', () => {
    // arrange
    const foo = createToken('foo');
    const bar = createToken('bar');
    buildParent(foo, document.createTextNode(' '), bar);

    // act
    const { next } = remove(bar);

    // assert
    expect(next).toBe(foo);
  });

  it('inserts a new ANCHOR adjacent to the removed TOKEN when there is a non-token next sibling but no token siblings', () => {
    // Regression: bug fixed where prev/nextElementSibling were read AFTER
    // detaching the token, causing the ANCHOR to be appended at the parent's
    // end instead of placed at the removed token's actual position.
    // arrange
    const before = createToken('before');
    const p1 = document.createElement('p');
    p1.textContent = 'stuff';
    const parent = buildParent(before, p1);

    // act
    const { next } = remove(before);

    // assert: anchor lands at the position 'before' occupied — adjacent to
    // p1, NOT appended at the parent's end.
    expect(isAnchor(next)).toBe(true);
    expect(next.parentNode).toBe(parent);
    expect(next.nextElementSibling).toBe(p1);
  });

  it('inserts a new ANCHOR adjacent to a non-token previous sibling when no token siblings exist on either side', () => {
    // arrange
    const p1 = document.createElement('p');
    p1.textContent = 'stuff';
    const only = createToken('only');
    const parent = buildParent(p1, only);

    // act
    const { next } = remove(only);

    // assert: anchor lands after p1.
    expect(isAnchor(next)).toBe(true);
    expect(next.parentNode).toBe(parent);
    expect(next.previousElementSibling).toBe(p1);
  });

  it('appends a new ANCHOR to the parent when the removed TOKEN had no element siblings', () => {
    // arrange
    const only = createToken('only');
    const parent = buildParent(only);

    // act
    const { next } = remove(only);

    // assert
    expect(isAnchor(next)).toBe(true);
    expect(next.parentNode).toBe(parent);
    expect(parent.children).toHaveLength(1);
    expect(parent.firstElementChild).toBe(next);
  });
});
