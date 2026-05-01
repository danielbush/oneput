import { describe, expect, test } from 'vitest';
import { byId, div, makeRoot, p } from '../../test/util';
import { findNextFocusableOutside, findPreviousFocusableOutside } from '../dom';

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

  test('findPreviousFocusableOutside (1)', () => {
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

  test('findPreviousFocusableOutside (2)', () => {
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
