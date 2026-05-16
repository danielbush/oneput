import { describe, expect, test } from 'vitest';
import {
  addAnchors,
  canInsertAnchorInLine,
  createAnchor,
  createToken,
  getAnchorAfterTagInsertionPoint,
  getAnchorBeforeTagInsertionPoint,
  getRemovableAnchorAfterTag,
  getRemovableAnchorBeforeTag,
  insertAnchorAfterTag,
  insertAnchorBeforeTag,
  remove,
  removeAnchorAfterTag,
  removeAnchorBeforeTag,
  replaceText,
  splitAfter,
  splitBefore
} from '../token.js';
import { isAnchor, isImplicitLine, JSED_IMPLICIT_CLASS } from '../../core/taxonomy.js';
import {
  byId,
  div,
  em as emTag,
  findTokenByText,
  frag,
  makeRawRoot,
  makeRoot,
  p,
  rawById,
  s,
  span,
  strong as strongTag,
  t
} from '../../../test/util.js';
import { undoRemove } from '../token.mutate.js';

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

describe('ANCHOR', () => {
  describe('add ANCHOR', () => {
    test('empty LINE', () => {
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

    test('empty LINE with IGNORABLE', () => {
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

    test('before INLINE_FLOW between tags', () => {
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

    test('before first INLINE_FLOW', () => {
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

    test('before INLINE_FLOW in IMPLICIT_LINE', () => {
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

    test('before INLINE_FLOW after whitespace', () => {
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

    test('before INLINE_FLOW with text gap', () => {
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

    test('before LINE no-op', () => {
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

    test('after LINE no-op', () => {
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

    test('after INLINE_FLOW between tags', () => {
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

    test('after last INLINE_FLOW', () => {
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

    test('after INLINE_FLOW in IMPLICIT_LINE', () => {
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

    test('after INLINE_FLOW before whitespace', () => {
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

    test('after INLINE_FLOW with text gap', () => {
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
    test('before INLINE_FLOW', () => {
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

    test('before INLINE_FLOW with trailing space', () => {
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

    test('after INLINE_FLOW', () => {
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

    test('after INLINE_FLOW with leading space', () => {
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

describe('splitting', () => {
  test('splitBefore - P', () => {
    // arrange
    const doc = makeRoot(p(t('aaa'), s(), t('bbb')));
    const bbb = findTokenByText(doc.root, 'bbb');

    // act
    const [leading, trailing] = splitBefore(bbb);

    // assert
    expect(leading.tagName).toBe('P');
    expect(trailing.tagName).toBe('P');
    expect(leading.textContent).toBe('aaa ');
    expect(trailing.textContent).toBe('bbb');
    expect(Array.from(doc.root.querySelectorAll('p'))).toEqual([leading, trailing]);
  });

  test('splitAfter - P', () => {
    // arrange
    const doc = makeRoot(p(t('aaa'), s(), t('bbb')));
    const aaa = findTokenByText(doc.root, 'aaa');

    // act
    const [leading, trailing] = splitAfter(aaa);

    // assert
    expect(leading.tagName).toBe('P');
    expect(trailing.tagName).toBe('P');
    expect(leading.textContent).toBe('aaa');
    expect(trailing.textContent).toBe(' bbb');
    expect(Array.from(doc.root.querySelectorAll('p'))).toEqual([leading, trailing]);
  });

  test('splitBefore - first TOKEN in P', () => {
    // arrange
    const doc = makeRoot(p(t('aaa'), s(), t('bbb')));
    const aaa = findTokenByText(doc.root, 'aaa');

    // act
    const [leading, trailing] = splitBefore(aaa);

    // assert
    expect(leading.tagName).toBe('P');
    expect(trailing.tagName).toBe('P');
    expect(isAnchor(leading.firstElementChild!)).toBe(true);
    expect(trailing.textContent).toBe('aaa bbb');
    expect(Array.from(doc.root.querySelectorAll('p'))).toEqual([leading, trailing]);
  });

  test('splitAfter - last TOKEN in P', () => {
    // arrange
    const doc = makeRoot(p(t('aaa'), s(), t('bbb')));
    const bbb = findTokenByText(doc.root, 'bbb');

    // act
    const [leading, trailing] = splitAfter(bbb);

    // assert
    expect(leading.tagName).toBe('P');
    expect(trailing.tagName).toBe('P');
    expect(leading.textContent).toBe('aaa bbb');
    expect(isAnchor(trailing.firstElementChild!)).toBe(true);
    expect(Array.from(doc.root.querySelectorAll('p'))).toEqual([leading, trailing]);
  });

  test('splitBefore - INLINE_FLOW', () => {
    // arrange
    const doc = makeRoot(
      p(
        t('aaa'),
        s(),
        emTag({ style: 'display:inline;' }, t('bbb'), s(), t('ccc'), s(), t('ddd')),
        s(),
        t('eee')
      )
    );
    const ccc = findTokenByText(doc.root, 'ccc');

    // act
    const [leading, trailing] = splitBefore(ccc);

    // assert
    const lines = Array.from(doc.root.querySelectorAll('p'));
    const inlineFlows = Array.from(doc.root.querySelectorAll('em'));
    expect(lines).toHaveLength(2);
    expect(inlineFlows).toHaveLength(2);
    expect(lines[0]?.textContent?.trim()).toBe('aaa bbb');
    expect(lines[1]?.textContent?.trim()).toBe('ccc ddd eee');
    expect(inlineFlows[0]?.textContent?.trim()).toBe('bbb');
    expect(inlineFlows[1]?.textContent?.trim()).toBe('ccc ddd');
    expect(leading).toBe(inlineFlows[0]);
    expect(trailing).toBe(inlineFlows[1]);
  });

  test('splitAfter - INLINE_FLOW', () => {
    // arrange
    const doc = makeRoot(
      p(
        t('aaa'),
        s(),
        emTag({ style: 'display:inline;' }, t('bbb'), s(), t('ccc'), s(), t('ddd')),
        s(),
        t('eee')
      )
    );
    const ccc = findTokenByText(doc.root, 'ccc');

    // act
    const [leading, trailing] = splitAfter(ccc);

    // assert
    const lines = Array.from(doc.root.querySelectorAll('p'));
    const inlineFlows = Array.from(doc.root.querySelectorAll('em'));
    expect(lines).toHaveLength(2);
    expect(inlineFlows).toHaveLength(2);
    expect(lines[0]?.textContent?.trim()).toBe('aaa bbb ccc');
    expect(lines[1]?.textContent?.trim()).toBe('ddd eee');
    expect(inlineFlows[0]?.textContent?.trim()).toBe('bbb ccc');
    expect(inlineFlows[1]?.textContent?.trim()).toBe('ddd');
    expect(leading).toBe(inlineFlows[0]);
    expect(trailing).toBe(inlineFlows[1]);
  });

  test('splitBefore - INLINE_FLOW nested', () => {
    // arrange
    const doc = makeRoot(
      p(
        t('aaa'),
        s(),
        emTag(
          { style: 'display:inline;' },
          t('bbb'),
          s(),
          strongTag(
            { style: 'display:inline;' }, //
            t('ccc')
          ),
          s(),
          t('ddd')
        ),
        s(),
        t('eee')
      )
    );
    const ccc = findTokenByText(doc.root, 'ccc');

    // act
    const [leading, trailing] = splitBefore(ccc);

    // assert
    const lines = Array.from(doc.root.querySelectorAll('p'));
    const ems = Array.from(doc.root.querySelectorAll('em'));
    const strongs = Array.from(doc.root.querySelectorAll('strong'));
    expect(lines).toHaveLength(2);
    expect(ems).toHaveLength(2);
    expect(strongs).toHaveLength(2);
    expect(lines[0]?.textContent?.trim()).toBe('aaa bbb');
    expect(lines[1]?.textContent?.trim()).toBe('ccc ddd eee');
    expect(leading).toBe(strongs[0]);
    expect(trailing).toBe(strongs[1]);
    expect(isAnchor(strongs[0]?.firstElementChild as HTMLElement)).toBe(true);
  });

  test('splitAfter - INLINE_FLOW nested', () => {
    // arrange
    const doc = makeRoot(
      p(
        t('aaa'),
        s(),
        emTag(
          { style: 'display:inline;' },
          t('bbb'),
          s(),
          strongTag(
            { style: 'display:inline;' }, //
            t('ccc')
          ),
          s(),
          t('ddd')
        ),
        s(),
        t('eee')
      )
    );
    const ccc = findTokenByText(doc.root, 'ccc');

    // act
    const [leading, trailing] = splitAfter(ccc);

    // assert
    const lines = Array.from(doc.root.querySelectorAll('p'));
    const ems = Array.from(doc.root.querySelectorAll('em'));
    const strongs = Array.from(doc.root.querySelectorAll('strong'));
    expect(lines).toHaveLength(2);
    expect(ems).toHaveLength(2);
    expect(strongs).toHaveLength(2);
    expect(lines[0]?.textContent?.trim()).toBe('aaa bbb ccc');
    expect(lines[1]?.textContent?.trim()).toBe('ddd eee');
    expect(leading).toBe(strongs[0]);
    expect(trailing).toBe(strongs[1]);
    expect(isAnchor(strongs[1]?.firstElementChild as HTMLElement)).toBe(true);
  });

  test('splitBefore - INLINE_FLOW boundary (ANCHOR)', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), emTag({ style: 'display:inline;' }, t('bbb'), s(), t('ccc')), s(), t('ddd'))
    );
    const bbb = findTokenByText(doc.root, 'bbb');

    // act
    const [leading, trailing] = splitBefore(bbb);

    // assert
    const lines = Array.from(doc.root.querySelectorAll('p'));
    const inlineFlows = Array.from(doc.root.querySelectorAll('em'));
    expect(lines).toHaveLength(2);
    expect(inlineFlows).toHaveLength(2);
    expect(lines[0]?.textContent?.trim()).toBe('aaa');
    expect(lines[1]?.textContent?.trim()).toBe('bbb ccc ddd');
    expect(isAnchor(inlineFlows[0]?.firstElementChild as HTMLElement)).toBe(true);
    expect(leading).toBe(inlineFlows[0]);
    expect(trailing).toBe(inlineFlows[1]);
  });

  test('splitAfter - INLINE_FLOW boundary (ANCHOR)', () => {
    // arrange
    const doc = makeRoot(
      p(t('aaa'), s(), emTag({ style: 'display:inline;' }, t('bbb'), s(), t('ccc')), s(), t('ddd'))
    );
    const ccc = findTokenByText(doc.root, 'ccc');

    // act
    const [leading, trailing] = splitAfter(ccc);

    // assert
    const lines = Array.from(doc.root.querySelectorAll('p'));
    const inlineFlows = Array.from(doc.root.querySelectorAll('em'));
    expect(lines).toHaveLength(2);
    expect(inlineFlows).toHaveLength(2);
    expect(lines[0]?.textContent?.trim()).toBe('aaa bbb ccc');
    expect(lines[1]?.textContent?.trim()).toBe('ddd');
    expect(isAnchor(inlineFlows[1]?.firstElementChild as HTMLElement)).toBe(true);
    expect(leading).toBe(inlineFlows[0]);
    expect(trailing).toBe(inlineFlows[1]);
  });

  test('splitBefore - ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p(
        t('aaa'),
        s(),
        emTag(
          { style: 'display:inline;' },
          t('bbb'),
          s(),
          '<span class="katex" style="display:inline;">x²</span>',
          s(),
          t('ccc')
        ),
        s(),
        t('ddd')
      )
    );
    const ccc = findTokenByText(doc.root, 'ccc');

    // act
    splitBefore(ccc);

    // assert
    const lines = Array.from(doc.root.querySelectorAll('p'));
    expect(lines[0]?.querySelector('.katex')?.textContent).toBe('x²');
    expect(lines[1]?.querySelector('.katex')).toBeNull();
    expect(lines[0]?.textContent?.trim()).toBe('aaa bbb x²');
    expect(lines[1]?.textContent?.trim()).toBe('ccc ddd');
  });

  test('splitBefore - IMPLICIT_LINE', () => {
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
    expect(leading.tagName).toBe('P');
    expect(trailing.tagName).toBe('P');
    expect(isImplicitLine(leading)).toBe(false);
    expect(isImplicitLine(trailing)).toBe(false);
    expect(leading.textContent).toBe('bbb ');
    expect(trailing.textContent).toBe('ccc');
    expect(leading.previousElementSibling).toBe(byId(doc, 'p1'));
    expect(trailing.nextElementSibling).toBe(byId(doc, 'p2'));
  });

  test('splitAfter - IMPLICIT_LINE', () => {
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
    expect(leading.tagName).toBe('P');
    expect(trailing.tagName).toBe('P');
    expect(isImplicitLine(leading)).toBe(false);
    expect(isImplicitLine(trailing)).toBe(false);
    expect(leading.textContent).toBe('bbb');
    expect(trailing.textContent).toBe(' ccc');
    expect(leading.previousElementSibling).toBe(byId(doc, 'p1'));
    expect(trailing.nextElementSibling).toBe(byId(doc, 'p2'));
  });

  test('splitAfter - text-only doc', () => {
    // arrange
    const doc = makeRoot(frag(t('aaa'), s(), t('bbb')));
    const aaa = findTokenByText(doc.root, 'aaa');

    // act
    splitAfter(aaa);

    // assert
    expect(doc.root.querySelectorAll('br')).toHaveLength(1);
    expect(doc.root.textContent?.trim()).toBe('aaa bbb');
  });

  test('splitBefore - text-only doc', () => {
    // arrange
    const doc = makeRoot(frag(t('aaa'), s(), t('bbb')));
    const bbb = findTokenByText(doc.root, 'bbb');

    // act
    splitBefore(bbb);

    // assert
    expect(doc.root.querySelectorAll('br')).toHaveLength(1);
    expect(doc.root.textContent?.trim()).toBe('aaa bbb');
  });

  test('splitBefore - whitespace preservation', () => {
    // arrange
    const doc = makeRoot(
      p(
        t('aaa'), //
        s(),
        emTag(
          { style: 'display:inline;' }, //
          t('bbb'),
          s(),
          t('ccc')
        ),
        s(),
        t('ddd')
      )
    );
    const ccc = findTokenByText(doc.root, 'ccc');

    // act
    splitBefore(ccc);

    // assert
    const lines = Array.from(doc.root.querySelectorAll('p'));
    expect(lines[0]?.textContent).toBe('aaa bbb ');
    expect(lines[1]?.textContent).toBe('ccc ddd');
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
  test('middle TOKEN', () => {
    // arrange
    const foo = createToken('foo');
    const bar = createToken('bar');
    const baz = createToken('baz');
    const sepBefore = document.createTextNode(' ');
    const sepAfter = document.createTextNode(' ');
    const parent = buildParent(foo, sepBefore, bar, sepAfter, baz);

    // act
    const plan = remove(bar);

    // assert
    expect(plan.insertionSite.parent).toBe(parent);
    expect(plan.insertionSite.previousSibling).toBe(sepBefore);
    expect(plan.insertionSite.nextSibling).toBe(sepAfter);
    expect(plan.previousVisibleSibling).toBe(foo);
    expect(plan.nextVisibleSibling).toBe(baz);
    expect(bar.isConnected).toBe(false);
  });

  test('undo middle TOKEN', () => {
    // arrange
    const foo = createToken('foo');
    const bar = createToken('bar');
    const baz = createToken('baz');
    const parent = buildParent(
      foo,
      document.createTextNode(' '),
      bar,
      document.createTextNode(' '),
      baz
    );
    const plan = remove(bar);

    // act
    undoRemove(plan);

    // assert
    expect(Array.from(parent.childNodes).map((node) => node.textContent)).toEqual([
      'foo',
      ' ',
      'bar',
      ' ',
      'baz'
    ]);
  });

  test('last TOKEN', () => {
    // arrange
    const foo = createToken('foo');
    const bar = createToken('bar');
    buildParent(foo, document.createTextNode(' '), bar);

    // act
    const plan = remove(bar);

    // assert
    expect(plan.previousVisibleSibling).toBe(foo);
    expect(plan.nextVisibleSibling).toBeNull();
  });

  test('next element', () => {
    // arrange
    const before = createToken('before');
    const p1 = document.createElement('p');
    p1.textContent = 'stuff';
    const parent = buildParent(before, p1);

    // act
    const plan = remove(before);

    // assert
    expect(plan.previousVisibleSibling).toBeNull();
    expect(plan.nextVisibleSibling).toBe(p1);
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
    const plan = remove(only);

    // assert
    expect(plan.previousVisibleSibling).toBe(p1);
    expect(plan.nextVisibleSibling).toBeNull();
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
    const plan = remove(only);

    // assert
    expect(plan.insertionSite.parent).toBe(parent);
    expect(plan.insertionSite.previousSibling).toBeNull();
    expect(plan.insertionSite.nextSibling).toBeNull();
    expect(plan.previousVisibleSibling).toBeNull();
    expect(plan.nextVisibleSibling).toBeNull();
    expect(only.parentNode).toBeNull();
    expect(parent.children).toHaveLength(0);
  });

  test('undo only TOKEN', () => {
    // arrange
    const only = createToken('only');
    const parent = buildParent(only);
    const plan = remove(only);

    // act
    undoRemove(plan);

    // assert
    expect(Array.from(parent.children)).toEqual([only]);
  });
});
