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
