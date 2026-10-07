import { describe, expect, test } from 'vitest';
import { byId, div, frag, makeRoot, p } from '../../../../test/util.js';
import {
  findClosestFocusableAncestor,
  findFocusNear,
  findNextFocusable,
  findNextFocusableOnAncestorPath,
  findNextFocusableOutside,
  findNextSiblingFocusable,
  findNextSiblingOrAncestorFocusable,
  findPreviousFocusable,
  findPreviousFocusableOutside,
  findPreviousSiblingFocusable,
  findPreviousSiblingOrAncestorFocusable,
  getInitialFocusTarget
} from '../find.js';
import { createElement } from '../create.js';
import { createElementDeleteMarker, retainElementPosition } from '../retention.js';

describe('findClosestFocusableAncestor', () => {
  test('self / transparent / ceiling', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'parent' },
        div(
          { id: 'transparent', 'data-jsed-focus': 'off' },
          p({ id: 'focus', 'data-jsed-focus': 'on' }, 'focus')
        )
      )
    );

    // act & assert
    expect(findClosestFocusableAncestor(byId(doc, 'focus'), doc.root)).toBe(byId(doc, 'focus'));
    expect(findClosestFocusableAncestor(byId(doc, 'transparent'), doc.root)).toBe(
      byId(doc, 'parent')
    );
    expect(findClosestFocusableAncestor(doc.root, doc.root)).toBe(doc.root);
  });
});

describe('findNextFocusableOnAncestorPath', () => {
  test('closest below / transparent tunnel / unrelated', () => {
    // arrange
    const doc = makeRoot(
      frag(
        div(
          { id: 'ancestor' },
          div(
            { id: 'closest' },
            div(
              { id: 'transparent', 'data-jsed-focus': 'off' },
              p({ id: 'descendant', 'data-jsed-focus': 'on' }, 'descendant')
            )
          )
        ),
        p({ id: 'unrelated' }, 'unrelated')
      )
    );

    // act & assert
    expect(findNextFocusableOnAncestorPath(byId(doc, 'ancestor'), byId(doc, 'descendant'))).toBe(
      byId(doc, 'closest')
    );
    expect(findNextFocusableOnAncestorPath(byId(doc, 'closest'), byId(doc, 'descendant'))).toBe(
      byId(doc, 'descendant')
    );
    expect(
      findNextFocusableOnAncestorPath(byId(doc, 'ancestor'), byId(doc, 'unrelated'))
    ).toBeNull();
  });

  test('hidden remembered path: returns null', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'ancestor' },
        div(
          { id: 'hidden', style: 'display:none;', 'data-jsed-focus': 'off' },
          p({ id: 'descendant', 'data-jsed-focus': 'on' }, 'descendant')
        )
      )
    );

    // act
    const result = findNextFocusableOnAncestorPath(byId(doc, 'ancestor'), byId(doc, 'descendant'));

    // assert
    expect(result).toBeNull();
  });
});

describe('recursive', () => {
  test('transparent tunnel: next / previous', () => {
    // arrange
    const doc = makeRoot(
      frag(
        p({ id: 'before' }, 'before'),
        div(
          { id: 'transparent', 'data-jsed-focus': 'off' },
          p({ id: 'skipped' }, 'skipped'),
          p({ id: 'inner', 'data-jsed-focus': 'on' }, 'inner')
        ),
        p({ id: 'after' }, 'after')
      )
    );

    // act & assert
    expect(findNextFocusable(byId(doc, 'before'), doc.root)).toBe(byId(doc, 'inner'));
    expect(findPreviousFocusable(byId(doc, 'after'), doc.root)).toBe(byId(doc, 'inner'));
  });

  test('hidden subtree: skips descendants', () => {
    // arrange
    const doc = makeRoot(
      frag(
        p({ id: 'before' }, 'before'),
        div({ id: 'hidden', style: 'display:none;' }, p({ id: 'hidden-child' }, 'hidden child')),
        p({ id: 'after' }, 'after')
      )
    );

    // act & assert
    expect(findNextFocusable(byId(doc, 'before'), doc.root)).toBe(byId(doc, 'after'));
    expect(findPreviousFocusable(byId(doc, 'after'), doc.root)).toBe(byId(doc, 'before'));
  });
});

describe('siblings', () => {
  test('transparent tunnel: next / previous', () => {
    // arrange
    const doc = makeRoot(
      frag(
        p({ id: 'before' }, 'before'),
        div(
          { id: 'transparent', 'data-jsed-focus': 'off' },
          p({ id: 'first', 'data-jsed-focus': 'on' }, 'first'),
          p({ id: 'last', 'data-jsed-focus': 'on' }, 'last')
        ),
        p({ id: 'after' }, 'after')
      )
    );

    // act & assert
    expect(findNextSiblingFocusable(byId(doc, 'before'))).toBe(byId(doc, 'first'));
    expect(findPreviousSiblingFocusable(byId(doc, 'after'))).toBe(byId(doc, 'last'));
  });

  test('ancestor climb: next / previous', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'outer' },
        div({ id: 'left' }, p({ id: 'current' }, 'current')),
        div({ id: 'right' }, p({ id: 'right-child' }, 'right'))
      )
    );

    // act & assert
    expect(findNextSiblingOrAncestorFocusable(byId(doc, 'current'), doc.root)).toBe(
      byId(doc, 'right')
    );
    expect(findPreviousSiblingOrAncestorFocusable(byId(doc, 'current'), doc.root)).toBe(
      byId(doc, 'left')
    );
  });
});

describe('findNextFocusableOutside / findPreviousFocusableOutside', () => {
  test('next skips descendants and finds the next outside FOCUSABLE', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'outer' },
        div({ id: 'inner' }, 'inside') //
      ) + p({ id: 'next' }, 'after')
    );

    // act
    const next = findNextFocusableOutside(byId(doc, 'outer'), doc.root);

    // assert
    expect(next).toBe(byId(doc, 'next'));
  });

  test('previous from the outer element', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'previous' }, 'before') +
        div(
          { id: 'outer' },
          div({ id: 'inner' }, 'inside') //
        )
    );

    // act
    const previous = findPreviousFocusableOutside(byId(doc, 'outer'), doc.root);

    // assert
    expect(previous).toBe(byId(doc, 'previous'));
  });

  test('previous from a nested element lands on its parent', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'previous' }, 'before') +
        div(
          { id: 'outer' },
          div({ id: 'inner' }, 'inside') //
        )
    );

    // act
    const previous = findPreviousFocusableOutside(byId(doc, 'inner'), doc.root);

    // assert
    expect(previous).toBe(byId(doc, 'outer'));
  });
});

describe('getInitialFocusTarget', () => {
  test('ul resolves to its li', () => {
    // arrange
    const el = createElement({ tagName: 'ul', children: [{ tagName: 'li' }] });

    // act
    const target = getInitialFocusTarget(el);

    // assert
    expect(target.tagName).toBe('LI');
  });

  test('anchorable element resolves to itself', () => {
    // arrange
    const el = createElement({ tagName: 'p' });

    // act
    const target = getInitialFocusTarget(el);

    // assert
    expect(target).toBe(el);
  });

  test('non-anchorable element with no anchorable descendant falls back to itself', () => {
    // arrange
    const el = createElement({ tagName: 'div' });

    // act
    const target = getInitialFocusTarget(el);

    // assert
    expect(target).toBe(el);
  });

  test('ul with paragraph resolves to the paragraph', () => {
    // arrange
    const el = createElement({
      tagName: 'ul',
      children: [{ tagName: 'li', children: [{ tagName: 'p' }] }]
    });

    // act
    const target = getInitialFocusTarget(el);

    // assert
    expect(target.tagName).toBe('P');
  });

  test('table resolves to its first cell', () => {
    // arrange
    const el = createElement({
      tagName: 'table',
      children: [
        {
          tagName: 'tbody',
          children: [{ tagName: 'tr', children: [{ tagName: 'td' }] }]
        }
      ]
    });

    // act
    const target = getInitialFocusTarget(el);

    // assert
    expect(target.tagName).toBe('TD');
  });

  test('finds re-opened focus-on leaf inside a focus-off ancestor', () => {
    // arrange — focus-off container, transparent wrappers, nested focus-on leaf
    const doc = makeRoot(
      div(
        { id: 'outer' },
        div(
          { id: 'off', 'data-jsed-focus': 'off' },
          div(div(p({ id: 'leaf', 'data-jsed-focus': 'on' }, 'editable')))
        )
      )
    );

    // act
    const fromOff = getInitialFocusTarget(byId(doc, 'off'));
    const fromOuter = getInitialFocusTarget(byId(doc, 'outer'));

    // assert
    expect(fromOff).toBe(byId(doc, 'leaf'));
    expect(fromOuter).toBe(byId(doc, 'leaf'));
  });

  test('focus-off ancestor with no re-opened leaf is not chosen as the target', () => {
    // arrange
    const doc = makeRoot(
      div({ id: 'outer' }, div({ id: 'off', 'data-jsed-focus': 'off' }, div(p('plain'))))
    );

    // act
    const fromOff = getInitialFocusTarget(byId(doc, 'off'));
    const fromOuter = getInitialFocusTarget(byId(doc, 'outer'));

    // assert — no FOCUSABLE leaf under off; fall back to the element passed in
    expect(fromOff).toBe(byId(doc, 'off'));
    expect(fromOuter).toBe(byId(doc, 'outer'));
  });
});

describe('findFocusNear', () => {
  test('a FOCUSABLE in the document is its own result', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));

    // act
    const found = findFocusNear(byId(doc, 'p1'), doc.root);

    // assert
    expect(found).toBe(byId(doc, 'p1'));
  });

  test('a marker goes to the next FOCUSABLE, then the previous one', () => {
    // arrange
    const doc = makeRoot(
      frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two'), p({ id: 'p3' }, 'three'))
    );
    const p3 = byId(doc, 'p3');
    const middle = createElementDeleteMarker();
    retainElementPosition(byId(doc, 'p2'), middle);

    // act
    const afterMiddle = findFocusNear(middle, doc.root);
    const last = createElementDeleteMarker();
    retainElementPosition(p3, last);
    const afterLast = findFocusNear(last, doc.root);

    // assert
    expect(afterMiddle).toBe(p3);
    expect(afterLast).toBe(byId(doc, 'p1'));
  });

  test('a marker with no FOCUSABLE beside it climbs to an ancestor', () => {
    // arrange
    const doc = makeRoot(div({ id: 'outer' }, p({ id: 'only' }, 'only')));
    const marker = createElementDeleteMarker();
    retainElementPosition(byId(doc, 'only'), marker);

    // act
    const found = findFocusNear(marker, doc.root);

    // assert
    expect(found).toBe(byId(doc, 'outer'));
  });

  test('a node that is not in the document has no result', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'one'));
    const detached = document.createElement('p');

    // act
    const found = findFocusNear(detached, doc.root);

    // assert
    expect(found).toBeNull();
  });
});
