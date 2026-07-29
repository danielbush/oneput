import { describe, expect, test } from 'vitest';
import { byId, div, frag, makeRoot, p } from '../../../../test/util.js';
import {
  findClosestFocusableAncestor,
  findNextFocusable,
  findNextFocusableOnAncestorPath,
  findNextFocusableOutside,
  findNextSiblingFocusable,
  findNextSiblingOrAncestorFocusable,
  findPreviousFocusable,
  findPreviousFocusableOutside,
  findPreviousSiblingFocusable,
  findPreviousSiblingOrAncestorFocusable
} from '../find.js';

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
