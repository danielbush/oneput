import { describe, expect, test } from 'vitest';
import { canInsertAnchorInLine } from '../token.js';
import {
  addAnchorsToTag,
  getAnchorAfterTagInsertionPoint,
  getAnchorBeforeTagInsertionPoint,
  getRemovableAnchorAfterTag,
  getRemovableAnchorBeforeTag,
  insertAnchorAfterTag,
  insertAnchorBeforeTag,
  removeAnchorAfterTag,
  removeAnchorBeforeTag
} from '../anchor.js';
import { isAnchor, isImplicitLine } from '../../core/taxonomy.js';
import {
  byId,
  div,
  em as emTag,
  makeRawRoot,
  makeRoot,
  p,
  rawById,
  s,
  span,
  strong as strongTag
} from '../../../test/util.js';

describe('addAnchorsToTag', () => {
  test('empty LINE', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }));
    const p1 = byId(doc, 'p1');

    // act
    const canInsert = canInsertAnchorInLine(p1);
    const [anchor] = addAnchorsToTag(p1);

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
    const [anchor] = addAnchorsToTag(p1);

    // assert
    expect(canInsert).toBe(true);
    expect(anchor).not.toBeUndefined();
    expect(isAnchor(anchor!)).toBe(true);
    expect(p1.querySelector('.jsed-anchor-token')).toBe(anchor);
  });
});

describe('insertAnchorBeforeTag', () => {
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
});

describe('insertAnchorAfterTag', () => {
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

describe('removeAnchorBeforeTag', () => {
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
});

describe('removeAnchorAfterTag', () => {
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
