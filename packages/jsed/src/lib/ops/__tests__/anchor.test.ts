import { describe, expect, test } from 'vitest';
import { canInsertAnchorInLine } from '../token.js';
import {
  addAnchorsToTag,
  anchorize,
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
  identifyChildren,
  inlineStyleHack,
  makeRawRoot,
  makeRoot,
  p,
  rawById,
  s,
  span,
  strong as strongTag,
  t
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

  test('tokens only → none', () => {
    // arrange
    const root = makeRawRoot(p({ id: 'p1' }, t('foo'), t('bar')));
    const p1 = rawById(root, 'p1');

    // act
    const anchors = addAnchorsToTag(p1);

    // assert
    expect(anchors).toEqual([]);
    expect(identifyChildren(p1)).toEqual(['foo', 'bar']);
  });

  test('INLINE_FLOW only → both sides', () => {
    // arrange
    const root = makeRawRoot(p({ id: 'p1' }, emTag({ id: 'em1', ...inlineStyleHack }, 'foo')));
    const p1 = rawById(root, 'p1');

    // act
    const anchors = addAnchorsToTag(p1);

    // assert
    expect(anchors).toHaveLength(2);
    expect(identifyChildren(p1)).toEqual(['[anchor]', '[element:em#em1]', '[anchor]']);
  });

  test('token then INLINE_FLOW → trailing anchor', () => {
    // arrange
    const root = makeRawRoot(
      p({ id: 'p1' }, t('foo'), emTag({ id: 'em1', ...inlineStyleHack }, 'bar'))
    );
    const p1 = rawById(root, 'p1');

    // act
    const anchors = addAnchorsToTag(p1);

    // assert
    expect(anchors).toHaveLength(1);
    expect(identifyChildren(p1)).toEqual(['foo', '[element:em#em1]', '[anchor]']);
  });

  test('INLINE_FLOW then token → leading anchor', () => {
    // arrange
    const root = makeRawRoot(
      p({ id: 'p1' }, emTag({ id: 'em1', ...inlineStyleHack }, 'bar'), t('foo'))
    );
    const p1 = rawById(root, 'p1');

    // act
    const anchors = addAnchorsToTag(p1);

    // assert
    expect(anchors).toHaveLength(1);
    expect(identifyChildren(p1)).toEqual(['[anchor]', '[element:em#em1]', 'foo']);
  });

  test('token INLINE_FLOW token → none', () => {
    // arrange
    const root = makeRawRoot(
      p({ id: 'p1' }, t('a'), emTag({ id: 'em1', ...inlineStyleHack }, 'x'), t('b'))
    );
    const p1 = rawById(root, 'p1');

    // act
    const anchors = addAnchorsToTag(p1);

    // assert
    expect(anchors).toEqual([]);
    expect(identifyChildren(p1)).toEqual(['a', '[element:em#em1]', 'b']);
  });
});

describe('anchorize', () => {
  test('empty LINE → leading anchor', () => {
    // arrange
    const root = makeRawRoot(p({ id: 'p1' }));

    // act
    anchorize(root);

    // assert
    expect(identifyChildren(rawById(root, 'p1'))).toEqual(['[anchor]']);
  });

  test('leading INLINE_FLOW → both sides', () => {
    // arrange
    const root = makeRawRoot(p({ id: 'p1' }, emTag({ id: 'em1', ...inlineStyleHack }, t('foo'))));

    // act
    anchorize(root);

    // assert
    expect(identifyChildren(rawById(root, 'p1'))).toEqual([
      '[anchor]',
      '[element:em#em1]',
      '[anchor]'
    ]);
    expect(identifyChildren(rawById(root, 'em1'))).toEqual(['foo']);
  });

  test('token then INLINE_FLOW → trailing anchor', () => {
    // arrange
    const root = makeRawRoot(
      p({ id: 'p1' }, t('foo'), emTag({ id: 'em1', ...inlineStyleHack }, t('bar')))
    );

    // act
    anchorize(root);

    // assert
    expect(identifyChildren(rawById(root, 'p1'))).toEqual(['foo', '[element:em#em1]', '[anchor]']);
    expect(identifyChildren(rawById(root, 'em1'))).toEqual(['bar']);
  });

  test('INLINE_FLOW then token → leading anchor', () => {
    // arrange
    const root = makeRawRoot(
      p({ id: 'p1' }, emTag({ id: 'em1', ...inlineStyleHack }, t('bar')), t('foo'))
    );

    // act
    anchorize(root);

    // assert
    expect(identifyChildren(rawById(root, 'p1'))).toEqual(['[anchor]', '[element:em#em1]', 'foo']);
    expect(identifyChildren(rawById(root, 'em1'))).toEqual(['bar']);
  });

  test('token INLINE_FLOW token → none', () => {
    // arrange
    const root = makeRawRoot(
      p({ id: 'p1' }, t('a'), emTag({ id: 'em1', ...inlineStyleHack }, t('x')), t('b'))
    );

    // act
    anchorize(root);

    // assert
    expect(identifyChildren(rawById(root, 'p1'))).toEqual(['a', '[element:em#em1]', 'b']);
    expect(identifyChildren(rawById(root, 'em1'))).toEqual(['x']);
  });

  test('empty nested INLINE_FLOW → interior + surrounding anchors', () => {
    // arrange
    const root = makeRawRoot(p({ id: 'p1' }, emTag({ id: 'em1', ...inlineStyleHack })));

    // act
    anchorize(root);

    // assert
    expect(identifyChildren(rawById(root, 'p1'))).toEqual([
      '[anchor]',
      '[element:em#em1]',
      '[anchor]'
    ]);
    expect(identifyChildren(rawById(root, 'em1'))).toEqual(['[anchor]']);
  });

  test('IMPLICIT_LINE → anchored inside, not around', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p({ id: 'p1' }, 'aaa'),
        emTag({ id: 'em1', ...inlineStyleHack }, 'bbb'),
        p({ id: 'p2' }, 'ccc')
      )
    );
    const em1 = byId(doc, 'em1');
    const p1 = byId(doc, 'p1');
    const p2 = byId(doc, 'p2');
    const implicitLine = em1.parentElement!;
    const div1 = byId(doc, 'div1');

    // act
    anchorize(doc.root);

    // assert
    expect(isImplicitLine(implicitLine)).toBe(true);
    // anchored inside the IMPLICIT_LINE, around the em
    expect(identifyChildren(implicitLine)).toEqual(['[anchor]', '[element:em#em1]', '[anchor]']);
    // not anchored around the IMPLICIT_LINE at the parent level
    expect(identifyChildren(div1)).toEqual(['[element:p#p1]', '[implicit-line]', '[element:p#p2]']);
    expect(identifyChildren(p1)).toEqual(['[nodeType=3:"aaa"]']);
    expect(identifyChildren(p2)).toEqual(['[nodeType=3:"ccc"]']);
    expect(identifyChildren(em1)).toEqual(['[nodeType=3:"bbb"]']);
  });

  test('IMPLICIT_LINE as leading child → no anchor before it', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' }, //
        emTag({ id: 'em1', ...inlineStyleHack }, 'bbb'),
        p({ id: 'p2' }, 'ccc')
      )
    );
    const implicitLine = byId(doc, 'em1').parentElement!;
    const div1 = byId(doc, 'div1');

    // act
    anchorize(doc.root);

    // assert
    expect(isImplicitLine(implicitLine)).toBe(true);
    expect(identifyChildren(div1)).toEqual(['[implicit-line]', '[element:p#p2]']);
    expect(identifyChildren(implicitLine)).toEqual(['[anchor]', '[element:em#em1]', '[anchor]']);
  });

  test('adjacent INLINE_FLOWs → anchor between', () => {
    // arrange
    const root = makeRawRoot(
      p(
        { id: 'p1' },
        emTag({ id: 'em1', ...inlineStyleHack }, t('a')),
        strongTag({ id: 's1', ...inlineStyleHack }, t('b'))
      )
    );

    // act
    anchorize(root);

    // assert
    expect(identifyChildren(rawById(root, 'p1'))).toEqual([
      '[anchor]',
      '[element:em#em1]',
      '[anchor]',
      '[element:strong#s1]',
      '[anchor]'
    ]);
  });

  test('INLINE_FLOW then block → anchor before block', () => {
    // arrange
    const root = makeRawRoot(
      div(
        { id: 'd' }, //
        emTag({ id: 'em1', ...inlineStyleHack }, t('a')),
        p({ id: 'p2' }, t('b'))
      )
    );

    // act
    anchorize(root);

    // assert
    expect(identifyChildren(rawById(root, 'd'))).toEqual([
      '[anchor]',
      '[element:em#em1]',
      '[anchor]',
      '[element:p#p2]'
    ]);
  });

  // CURRENT behaviour of guard #3 (slated to be dropped — see
  // project_anchorize_implicit_line): no anchor between an inline and a
  // following IMPLICIT_LINE.
  test('INLINE_FLOW then IMPLICIT_LINE → no anchor between (guard #3)', () => {
    // arrange
    const root = makeRawRoot(
      p(
        { id: 'p1' },
        emTag({ id: 'em1', ...inlineStyleHack }, t('a')),
        span({ class: 'jsed-implicit-line', ...inlineStyleHack }, t('b'))
      )
    );

    // act
    anchorize(root);

    // assert
    expect(identifyChildren(rawById(root, 'p1'))).toEqual([
      '[anchor]',
      '[element:em#em1]',
      '[implicit-line]'
    ]);
  });

  test('whitespace-only FOCUSABLE → leading anchor', () => {
    // arrange
    const root = makeRawRoot(p({ id: 'p1' }, s(' ')));

    // act
    anchorize(root);

    // assert
    expect(identifyChildren(rawById(root, 'p1'))).toEqual(['[anchor]', '[nodeType=3:" "]']);
  });

  test('ISLAND → not descended, internals untouched', () => {
    // arrange
    const root = makeRawRoot(
      p(
        { id: 'p1' },
        span(
          { id: 'isl', class: 'katex', ...inlineStyleHack },
          emTag({ id: 'inner', ...inlineStyleHack })
        )
      )
    );

    // act
    anchorize(root);

    // assert
    expect(identifyChildren(rawById(root, 'p1'))).toEqual(['[anchor]', '[island:span]']);
    expect(identifyChildren(rawById(root, 'isl'))).toEqual(['[element:em#inner]']);
    expect(identifyChildren(rawById(root, 'inner'))).toEqual([]);
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
