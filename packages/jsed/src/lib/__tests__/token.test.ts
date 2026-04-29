import { describe, expect, it, test } from 'vitest';
import {
  addAnchors,
  canInsertAnchorInLine,
  canInsertSpaceAfterTag,
  canInsertSpaceAfterToken,
  canInsertSpaceBeforeTag,
  canInsertSpaceBeforeToken,
  createAnchor,
  createToken,
  getAnchorAfterTagInsertionPoint,
  getAnchorBeforeTagInsertionPoint,
  getRemovableAnchorAfterTag,
  getRemovableAnchorBeforeTag,
  getRemovableSpaceAfterTag,
  getRemovableSpaceAfterToken,
  getRemovableSpaceBeforeTag,
  getRemovableSpaceBeforeToken,
  insertAnchorAfterTag,
  insertAnchorBeforeTag,
  insertSpaceAfterTag,
  insertSpaceAfterToken,
  insertSpaceBeforeTag,
  insertSpaceBeforeToken,
  remove,
  removeAnchorAfterTag,
  removeAnchorBeforeTag,
  removeSpaceAfterTag,
  removeSpaceAfterToken,
  removeSpaceBeforeTag,
  removeSpaceBeforeToken,
  replaceText,
  splitAfter,
  splitBefore
} from '../token.js';
import { isAnchor, isImplicitLine } from '../taxonomy.js';
import { JSED_IMPLICIT_CLASS } from '../constants.js';
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

function makeRawRoot(html: string): HTMLElement {
  document.body.innerHTML = `<div id="root">${html}</div>`;
  return document.getElementById('root') as HTMLElement;
}

function rawById(root: HTMLElement, id: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(`#${id}`);
  if (!el) throw new Error(`rawById: could not find id="${id}"`);
  return el;
}

describe('ANCHOR', () => {
  describe('add ANCHOR', () => {
    it('in LINE (1) - empty', () => {
      // arrange
      const doc = makeRoot(p({ id: 'p1' }));
      const p1 = byId(doc, 'p1');

      // act
      const canInsert = canInsertAnchorInLine(p1);
      const [anchor] = addAnchors(p1);

      // assert
      expect(canInsert).toBe(true);
      expect(anchor).not.toBeUndefined();
      expect(isAnchor(anchor!)).toBe(true);
      expect(p1.querySelector('.jsed-anchor-token')).toBe(anchor);
    });

    it('in LINE (2) - empty', () => {
      // arrange
      const doc = makeRoot(
        p(
          { id: 'p1' }, //
          span({ class: 'jsed-ignore' }, 'debug label')
        )
      );
      const p1 = byId(doc, 'p1');

      // act
      const canInsert = canInsertAnchorInLine(p1);
      const [anchor] = addAnchors(p1);

      // assert
      expect(canInsert).toBe(true);
      expect(anchor).not.toBeUndefined();
      expect(isAnchor(anchor!)).toBe(true);
      expect(p1.querySelector('.jsed-anchor-token')).toBe(anchor);
    });

    it('before INLINE_FLOW (1)', () => {
      // arrange
      const root = makeRawRoot(
        p(
          { id: 'p1' },
          emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
          span({ class: 'jsed-ignore' }),
          strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
        )
      );
      const strong = rawById(root, 'strong1');

      // act
      const canInsert = !!getAnchorBeforeTagInsertionPoint(strong);
      const anchor = insertAnchorBeforeTag(strong);

      // assert
      expect(canInsert).toBe(true);
      expect(anchor).not.toBeNull();
      expect(isAnchor(anchor!)).toBe(true);
      expect(strong.previousElementSibling).toBe(anchor);
    });

    it('before INLINE_FLOW (2)', () => {
      // arrange
      const root = makeRawRoot(
        p(
          { id: 'p1' }, //
          emTag({ id: 'em1', style: 'display:inline;' }, 'foo')
        )
      );
      const em = rawById(root, 'em1');

      // act
      const canInsert = !!getAnchorBeforeTagInsertionPoint(em);
      const anchor = insertAnchorBeforeTag(em);

      // assert
      expect(canInsert).toBe(true);
      expect(anchor).not.toBeNull();
      expect(isAnchor(anchor!)).toBe(true);
      expect(em.previousElementSibling).toBe(anchor);
    });

    it('before INLINE_FLOW (3) - IMPLICIT_LINE', () => {
      // arrange
      const doc = makeRoot(
        div(
          { id: 'd' },
          p({ id: 'p1' }, 'aaa'),
          emTag({ id: 'em1', style: 'display:inline;' }, 'bbb'),
          p({ id: 'p2' }, 'ccc')
        )
      );
      const em = byId(doc, 'em1');
      const implicitLine = em.parentElement;

      // act
      const anchor = insertAnchorBeforeTag(em);

      // assert
      expect(implicitLine).not.toBeNull();
      expect(isImplicitLine(implicitLine!)).toBe(true);
      expect(anchor).not.toBeNull();
      expect(isAnchor(anchor!)).toBe(true);
      expect(anchor?.parentElement).toBe(implicitLine);
      expect(em.previousElementSibling).toBe(anchor);
    });

    it('before INLINE_FLOW (4) - whitespace', () => {
      // arrange
      const root = makeRawRoot(
        p(
          { id: 'p1' },
          emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
          s(' '),
          strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
        )
      );
      const strong = rawById(root, 'strong1');

      // act
      const canInsert = !!getAnchorBeforeTagInsertionPoint(strong);
      const anchor = insertAnchorBeforeTag(strong);

      // assert
      expect(canInsert).toBe(true);
      expect(anchor).not.toBeNull();
      expect(isAnchor(anchor!)).toBe(true);
      expect(anchor?.previousSibling?.nodeType).toBe(Node.TEXT_NODE);
      expect(anchor?.previousSibling?.textContent).toBe(' ');
      expect(strong.previousElementSibling).toBe(anchor);
    });

    it('before INLINE_FLOW (5) - negative', () => {
      // arrange
      const root = makeRawRoot(
        p(
          { id: 'p1' },
          emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
          s(' gap '),
          strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
        )
      );
      const strong = rawById(root, 'strong1');

      // act
      const canInsert = !!getAnchorBeforeTagInsertionPoint(strong);
      const anchor = insertAnchorBeforeTag(strong);

      // assert
      expect(canInsert).toBe(false);
      expect(anchor).toBeNull();
      expect(strong.previousElementSibling?.id).toBe('em1');
      expect(strong.previousSibling?.nodeType).toBe(Node.TEXT_NODE);
      expect(strong.previousSibling?.textContent).toBe(' gap ');
    });

    it('before LINE (1) - negative', () => {
      // arrange
      const root = makeRawRoot(
        div(
          { id: 'div1' }, //
          p({ id: 'p1' }, 'foo'),
          p({ id: 'p2' }, 'bar')
        )
      );
      const p1 = rawById(root, 'p1');
      const p2 = rawById(root, 'p2');

      // act
      const canInsert = !!getAnchorBeforeTagInsertionPoint(p2);
      const anchor = insertAnchorBeforeTag(p2);

      // assert
      expect(canInsert).toBe(false);
      expect(anchor).toBeNull();
      expect(p2.previousSibling).toBe(p1);
    });

    it('after LINE - negative', () => {
      // arrange
      const root = makeRawRoot(
        div(
          { id: 'div1' }, //
          p({ id: 'p1' }, 'foo'),
          p({ id: 'p2' }, 'bar')
        )
      );
      const p1 = rawById(root, 'p1');
      const p2 = rawById(root, 'p2');

      // act
      const canInsert = !!getAnchorAfterTagInsertionPoint(p1);
      const anchor = insertAnchorAfterTag(p1);

      // assert
      expect(canInsert).toBe(false);
      expect(anchor).toBeNull();
      expect(p1.nextSibling).toBe(p2);
    });

    it('after INLINE_FLOW (1)', () => {
      // arrange
      const root = makeRawRoot(
        p(
          { id: 'p1' },
          emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
          span({ class: 'jsed-ignore' }),
          strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
        )
      );
      const em = rawById(root, 'em1');
      const strong = rawById(root, 'strong1');

      // act
      const canInsert = !!getAnchorAfterTagInsertionPoint(em);
      const anchor = insertAnchorAfterTag(em);

      // assert
      expect(canInsert).toBe(true);
      expect(anchor).not.toBeNull();
      expect(isAnchor(anchor!)).toBe(true);
      expect(strong.previousElementSibling).toBe(anchor);
    });

    it('after INLINE_FLOW (2)', () => {
      // arrange
      const root = makeRawRoot(
        p(
          { id: 'p1' }, //
          emTag({ id: 'em1', style: 'display:inline;' }, 'foo')
        )
      );
      const em = rawById(root, 'em1');

      // act
      const canInsert = !!getAnchorAfterTagInsertionPoint(em);
      const anchor = insertAnchorAfterTag(em);

      // assert
      expect(canInsert).toBe(true);
      expect(anchor).not.toBeNull();
      expect(isAnchor(anchor!)).toBe(true);
      expect(em.nextElementSibling).toBe(anchor);
    });

    it('after INLINE_FLOW (3) - IMPLICIT_LINE', () => {
      // arrange
      const doc = makeRoot(
        div(
          { id: 'd' },
          p({ id: 'p1' }, 'aaa'),
          emTag({ id: 'em1', style: 'display:inline;' }, 'bbb'),
          p({ id: 'p2' }, 'ccc')
        )
      );
      const em = byId(doc, 'em1');
      const implicitLine = em.parentElement;

      // act
      const anchor = insertAnchorAfterTag(em);

      // assert
      expect(implicitLine).not.toBeNull();
      expect(isImplicitLine(implicitLine!)).toBe(true);
      expect(anchor).not.toBeNull();
      expect(isAnchor(anchor!)).toBe(true);
      expect(anchor?.parentElement).toBe(implicitLine);
      expect(em.nextElementSibling).toBe(anchor);
    });

    it('after INLINE_FLOW (4) - whitespace', () => {
      // arrange
      const root = makeRawRoot(
        p(
          { id: 'p1' },
          emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
          // before existing whitespace is ok
          s(' '),
          strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
        )
      );
      const em = rawById(root, 'em1');

      // act
      const canInsert = !!getAnchorAfterTagInsertionPoint(em);
      const anchor = insertAnchorAfterTag(em);

      // assert
      expect(canInsert).toBe(true);
      expect(anchor).not.toBeNull();
      expect(isAnchor(anchor!)).toBe(true);
      expect(em.nextElementSibling).toBe(anchor);
      expect(anchor?.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
      expect(anchor?.nextSibling?.textContent).toBe(' ');
    });

    it('after INLINE_FLOW (5) - negative', () => {
      // arrange
      const root = makeRawRoot(
        p(
          { id: 'p1' },
          emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
          s(' gap '),
          strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
        )
      );
      const em = rawById(root, 'em1');

      // act
      const canInsert = !!getAnchorAfterTagInsertionPoint(em);
      const anchor = insertAnchorAfterTag(em);

      // assert
      expect(canInsert).toBe(false);
      expect(anchor).toBeNull();
      expect(em.nextElementSibling?.id).toBe('strong1');
      expect(em.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
      expect(em.nextSibling?.textContent).toBe(' gap ');
    });
  });

  describe('remove ANCHOR', () => {
    it('before INLINE_FLOW', () => {
      // arrange
      const root = makeRawRoot(
        p(
          { id: 'p1' },
          emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
          span({ class: 'jsed-token jsed-anchor-token' }),
          strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
        )
      );
      const em = rawById(root, 'em1');
      const strong = rawById(root, 'strong1');

      // act
      const canRemove = !!getRemovableAnchorBeforeTag(strong);
      const anchor = removeAnchorBeforeTag(strong);

      // assert
      expect(canRemove).toBe(true);
      expect(anchor).not.toBeNull();
      expect(isAnchor(anchor!)).toBe(true);
      expect(strong.previousSibling).toBe(em);
    });

    it('before INLINE_FLOW (2)', () => {
      // arrange
      const root = makeRawRoot(
        p(
          { id: 'p1' },
          emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
          span({ class: 'jsed-token jsed-anchor-token' }),
          s(' '),
          strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
        )
      );
      const em = rawById(root, 'em1');
      const strong = rawById(root, 'strong1');

      // act
      const canRemove = !!getRemovableAnchorBeforeTag(strong);
      const anchor = removeAnchorBeforeTag(strong);

      // assert
      expect(canRemove).toBe(true);
      expect(anchor).not.toBeNull();
      expect(em.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
      expect(em.nextSibling?.textContent).toBe(' ');
      expect(strong.previousSibling?.nodeType).toBe(Node.TEXT_NODE);
      expect(strong.previousSibling?.textContent).toBe(' ');
    });

    it('after INLINE_FLOW', () => {
      // arrange
      const root = makeRawRoot(
        p(
          { id: 'p1' },
          emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
          span({ class: 'jsed-token jsed-anchor-token' }),
          strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
        )
      );
      const em = rawById(root, 'em1');
      const strong = rawById(root, 'strong1');

      // act
      const canRemove = !!getRemovableAnchorAfterTag(em);
      const anchor = removeAnchorAfterTag(em);

      // assert
      expect(canRemove).toBe(true);
      expect(anchor).not.toBeNull();
      expect(isAnchor(anchor!)).toBe(true);
      expect(strong.previousSibling).toBe(em);
    });

    it('after INLINE_FLOW (2)', () => {
      // arrange
      const root = makeRawRoot(
        p(
          { id: 'p1' },
          emTag({ id: 'em1', style: 'display:inline;' }, 'foo'),
          s(' '),
          span({ class: 'jsed-token jsed-anchor-token' }),
          strongTag({ id: 'strong1', style: 'display:inline;' }, 'bar')
        )
      );
      const em = rawById(root, 'em1');
      const strong = rawById(root, 'strong1');

      // act
      const canRemove = !!getRemovableAnchorAfterTag(em);
      const anchor = removeAnchorAfterTag(em);

      // assert
      expect(canRemove).toBe(true);
      expect(anchor).not.toBeNull();
      expect(em.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
      expect(em.nextSibling?.textContent).toBe(' ');
      expect(em.nextSibling?.nextSibling).toBe(strong);
    });
  });
});

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

describe('splitting', () => {
  test('splitBefore - preserves IMPLICIT_LINE on the new leading segment', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'd' },
        p({ id: 'p1' }, 'aaa'),
        span({ class: JSED_IMPLICIT_CLASS }, t('bbb'), s(), t('ccc')),
        p({ id: 'p2' }, 'ddd')
      )
    );
    const implicitLine = byId(doc, 'd').querySelector(`.${JSED_IMPLICIT_CLASS}`) as HTMLElement;
    const ccc = findTokenByText(implicitLine, 'ccc');

    // act
    const [leading, trailing] = splitBefore(ccc);

    // assert
    expect(isImplicitLine(leading)).toBe(true);
    expect(isImplicitLine(trailing)).toBe(true);
    expect(leading.textContent).toBe('bbb ');
    expect(trailing.textContent).toBe('ccc');
    expect(leading.previousElementSibling).toBe(byId(doc, 'p1'));
    expect(trailing.nextElementSibling).toBe(byId(doc, 'p2'));
  });

  test('splitAfter - preserves IMPLICIT_LINE on the new trailing segment', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'd' },
        p({ id: 'p1' }, 'aaa'),
        span({ class: JSED_IMPLICIT_CLASS }, t('bbb'), s(), t('ccc')),
        p({ id: 'p2' }, 'ddd')
      )
    );
    const implicitLine = byId(doc, 'd').querySelector(`.${JSED_IMPLICIT_CLASS}`) as HTMLElement;
    const bbb = findTokenByText(implicitLine, 'bbb');

    // act
    const [leading, trailing] = splitAfter(bbb);

    // assert
    expect(isImplicitLine(leading)).toBe(true);
    expect(isImplicitLine(trailing)).toBe(true);
    expect(leading.textContent).toBe('bbb');
    expect(trailing.textContent).toBe(' ccc');
    expect(leading.previousElementSibling).toBe(byId(doc, 'p1'));
    expect(trailing.nextElementSibling).toBe(byId(doc, 'p2'));
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

  it('preserves the leading separator when the removed TOKEN is at the end of a segment', () => {
    // arrange — `[prev, ' ', removed, ' ']`. After removing `removed`, the
    // leading ' ' should remain as `prev`'s trailing space; only the trailing
    // separator is dropped.
    const prev = createToken('prev');
    const removed = createToken('removed');
    const sepBefore = document.createTextNode(' ');
    const sepAfter = document.createTextNode(' ');
    const parent = buildParent(prev, sepBefore, removed, sepAfter);

    // act
    remove(removed);

    // assert
    expect(Array.from(parent.childNodes)).toEqual([prev, sepBefore]);
    expect(sepBefore.parentNode).toBe(parent);
    expect(sepAfter.parentNode).toBeNull();
  });

  it('preserves the leading separator when the removed TOKEN is at the start of a segment', () => {
    // arrange — `[' ', removed, ' ', next]`. After removing `removed`, the
    // leading ' ' should remain as an edge separator; only the trailing
    // separator (between removed and next) is dropped.
    const removed = createToken('removed');
    const next = createToken('next');
    const sepBefore = document.createTextNode(' ');
    const sepAfter = document.createTextNode(' ');
    const parent = buildParent(sepBefore, removed, sepAfter, next);

    // act
    remove(removed);

    // assert
    expect(Array.from(parent.childNodes)).toEqual([sepBefore, next]);
    expect(sepBefore.parentNode).toBe(parent);
    expect(sepAfter.parentNode).toBeNull();
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
