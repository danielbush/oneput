import { describe, expect, it } from 'vitest';
import {
  frag,
  makeRoot,
  p,
  em as emTag,
  strong as strongTag,
  span,
  byId,
  t,
  findTokenByText,
  s,
  div,
  makeRawRoot,
  rawById
} from '../../test/util';
import {
  canInsertSpaceAfterTag,
  canInsertSpaceAfterToken,
  canInsertSpaceBeforeTag,
  canInsertSpaceBeforeToken,
  getRemovableSpaceAfterTag,
  getRemovableSpaceAfterToken,
  getRemovableSpaceBeforeTag,
  getRemovableSpaceBeforeToken,
  insertSpaceAfterTag,
  insertSpaceAfterToken,
  insertSpaceBeforeTag,
  insertSpaceBeforeToken,
  removeSpaceAfterTag,
  removeSpaceAfterToken,
  removeSpaceBeforeTag,
  removeSpaceBeforeToken
} from '../space';

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
      const doc = makeRoot(frag(p({ id: 'p1' }, t('foo'), s(), t('bar'), s(), t('baz'))));
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
      const doc = makeRoot(frag(p({ id: 'p1' }, t('foo'), s(), t('bar'), s(), t('baz'))));
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

  describe('around FOCUSABLE', () => {
    describe('after FOCUSABLE', () => {
      it('inserts a space at the boundary after the focused tag', () => {
        // arrange
        const root = makeRawRoot(
          frag(
            p(
              { id: 'p1' },
              emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
              span({ class: 'jsed-ignore' }),
              strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
            )
          )
        );
        const em = rawById(root, 'em1');
        const strong = rawById(root, 'strong1');

        // act
        const canInsert = canInsertSpaceAfterTag(em);
        const result = !!insertSpaceAfterTag(em);

        // assert
        expect(canInsert).toBe(true);
        expect(result).toBe(true);
        expect(strong.previousSibling?.nodeType).toBe(Node.TEXT_NODE);
        expect(strong.previousSibling?.textContent).toBe(' ');
      });

      it('does not insert another space when one already exists', () => {
        // arrange
        const root = makeRawRoot(
          frag(
            p(
              { id: 'p1' },
              emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
              s(),
              strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
            )
          )
        );
        const em = rawById(root, 'em1');
        const p1 = rawById(root, 'p1');

        // act
        const canInsert = canInsertSpaceAfterTag(em);
        const result = !!insertSpaceAfterTag(em);

        // assert
        expect(canInsert).toBe(false);
        expect(result).toBe(false);
        const textNodes = Array.from(p1.childNodes).filter(
          (node) => node.nodeType === Node.TEXT_NODE
        );
        expect(textNodes).toHaveLength(1);
        expect(textNodes[0]?.textContent).toBe(' ');
      });

      it('inserts a space before intervening text', () => {
        // arrange
        const root = makeRawRoot(
          frag(
            p(
              { id: 'p1' },
              emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
              t('bar'),
              strongTag({ id: 'strong1', style: 'display:inline;' }, 'baz')
            )
          )
        );
        const em = rawById(root, 'em1');
        const strong = rawById(root, 'strong1');

        // act
        const canInsert = canInsertSpaceAfterTag(em);
        const result = !!insertSpaceAfterTag(em);

        // assert
        expect(canInsert).toBe(true);
        expect(result).toBe(true);
        expect(em.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
        expect(em.nextSibling?.textContent).toBe(' ');
        expect(
          (em.nextSibling?.nextSibling as HTMLElement | null)?.classList.contains('jsed-token')
        ).toBe(true);
        expect((em.nextSibling?.nextSibling as HTMLElement | null)?.textContent).toBe('bar');
        expect((strong.previousSibling as HTMLElement | null)?.textContent).toBe('bar');
      });

      it('removes boundary whitespace between adjacent tags', () => {
        // arrange
        const root = makeRawRoot(
          frag(
            p(
              { id: 'p1' },
              emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
              s(),
              strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
            )
          )
        );
        const em = rawById(root, 'em1');
        const strong = rawById(root, 'strong1');

        // act
        const canRemove = !!getRemovableSpaceAfterTag(em);
        const result = removeSpaceAfterTag(em);

        // assert
        expect(canRemove).toBe(true);
        expect(result).toBe(true);
        expect(strong.previousSibling).toBe(em);
      });

      it('removes leading whitespace from intervening text', () => {
        // arrange
        const root = makeRawRoot(
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
        const em = rawById(root, 'em1');
        const strong = rawById(root, 'strong1');

        // act
        const canRemove = !!getRemovableSpaceAfterTag(em);
        const result = removeSpaceAfterTag(em);

        // assert
        expect(canRemove).toBe(true);
        expect(result).toBe(true);
        expect((em.nextSibling as HTMLElement | null)?.classList.contains('jsed-token')).toBe(true);
        expect((em.nextSibling as HTMLElement | null)?.textContent).toBe('bar');
        expect((strong.previousSibling as HTMLElement | null)?.textContent).toBe('bar');
      });
    });

    describe('before FOCUSABLE', () => {
      it('inserts a space at the boundary before the focused tag', () => {
        // arrange
        const root = makeRawRoot(
          frag(
            p(
              { id: 'p1' },
              emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
              span({ class: 'jsed-ignore' }),
              strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
            )
          )
        );
        const strong = rawById(root, 'strong1');

        // act
        const canInsert = canInsertSpaceBeforeTag(strong);
        const result = !!insertSpaceBeforeTag(strong);

        // assert
        expect(canInsert).toBe(true);
        expect(result).toBe(true);
        expect(strong.previousSibling?.nodeType).toBe(Node.TEXT_NODE);
        expect(strong.previousSibling?.textContent).toBe(' ');
      });

      it('does not insert another space when one already exists', () => {
        // arrange
        const root = makeRawRoot(
          frag(
            p(
              { id: 'p1' },
              emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
              s(),
              strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
            )
          )
        );
        const strong = rawById(root, 'strong1');
        const p1 = rawById(root, 'p1');

        // act
        const canInsert = canInsertSpaceBeforeTag(strong);
        const result = !!insertSpaceBeforeTag(strong);

        // assert
        expect(canInsert).toBe(false);
        expect(result).toBe(false);
        const textNodes = Array.from(p1.childNodes).filter(
          (node) => node.nodeType === Node.TEXT_NODE
        );
        expect(textNodes).toHaveLength(1);
        expect(textNodes[0]?.textContent).toBe(' ');
      });

      it('inserts a space after intervening text', () => {
        // arrange
        const root = makeRawRoot(
          frag(
            p(
              { id: 'p1' },
              emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
              t('bar'),
              strongTag({ id: 'strong1', style: 'display:inline;' }, 'baz')
            )
          )
        );
        const strong = rawById(root, 'strong1');

        // act
        const canInsert = canInsertSpaceBeforeTag(strong);
        const result = !!insertSpaceBeforeTag(strong);

        // assert
        expect(canInsert).toBe(true);
        expect(result).toBe(true);
        expect(strong.previousSibling?.nodeType).toBe(Node.TEXT_NODE);
        expect(strong.previousSibling?.textContent).toBe(' ');
        expect(
          (strong.previousSibling?.previousSibling as HTMLElement | null)?.classList.contains(
            'jsed-token'
          )
        ).toBe(true);
        expect((strong.previousSibling?.previousSibling as HTMLElement | null)?.textContent).toBe(
          'bar'
        );
      });

      it('removes boundary whitespace between adjacent tags', () => {
        // arrange
        const root = makeRawRoot(
          frag(
            p(
              { id: 'p1' },
              emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
              s(),
              strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
            )
          )
        );
        const em = rawById(root, 'em1');
        const strong = rawById(root, 'strong1');

        // act
        const canRemove = !!getRemovableSpaceBeforeTag(strong);
        const result = removeSpaceBeforeTag(strong);

        // assert
        expect(canRemove).toBe(true);
        expect(result).toBe(true);
        expect(strong.previousSibling).toBe(em);
      });

      it('removes trailing whitespace from intervening text', () => {
        // arrange
        const root = makeRawRoot(
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
        const strong = rawById(root, 'strong1');

        // act
        const canRemove = !!getRemovableSpaceBeforeTag(strong);
        const result = removeSpaceBeforeTag(strong);

        // assert
        expect(canRemove).toBe(true);
        expect(result).toBe(true);
        expect(
          (strong.previousSibling as HTMLElement | null)?.classList.contains('jsed-token')
        ).toBe(true);
        expect((strong.previousSibling as HTMLElement | null)?.textContent).toBe('bar');
      });
    });
  });
});
