import { describe, expect, test } from 'vitest';
import { byId, div, frag, makeRoot, p } from '../../../test/util.js';
import {
  findClosestFocusableAncestor,
  findNextFocusable,
  findNextFocusableOnAncestorPath,
  findNextSiblingFocusable,
  findNextSiblingOrAncestorFocusable,
  findPreviousFocusable,
  findPreviousSiblingFocusable,
  findPreviousSiblingOrAncestorFocusable
} from '../focus.js';

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
