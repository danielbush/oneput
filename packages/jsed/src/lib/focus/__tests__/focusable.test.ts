import { describe, expect, test } from 'vitest';
import { byId, div, makeRoot, p } from '../../../test/util';
import {
  copyEmptyNext,
  copyEmptyPrevious,
  deleteHighestEmpty,
  findNextFocusableOutside,
  findPreviousFocusableOutside
} from '../../focus/focusable';
import { isDeletedElement, JSED_ANCHOR_CLASS, JSED_FOCUS_CLASS } from '../../core/taxonomy';

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

describe('deleteHighestEmptyTree', () => {
  test('removes empty chain', () => {
    // arrange
    const doc = makeRoot(div({ id: 'outer' }, div({ id: 'middle' }, div({ id: 'inner' }))));
    const outer = byId(doc, 'outer');
    const middle = byId(doc, 'middle');
    const inner = byId(doc, 'inner');

    // act
    const deletion = deleteHighestEmpty(inner, doc.root);

    // assert
    expect(outer.isConnected).toBe(false);
    expect(middle.isConnected).toBe(false);
    expect(inner.isConnected).toBe(false);
    expect(doc.root.children).toHaveLength(1);
    expect(isDeletedElement(doc.root.firstElementChild)).toBe(true);
    expect(deletion).toMatchObject({
      type: 'delete-element',
      marker: doc.root.firstElementChild,
      deleted: outer
    });
  });

  test('stops at ceiling', () => {
    // arrange
    const doc = makeRoot(div({ id: 'outer' }, div({ id: 'inner' })));
    const outer = byId(doc, 'outer');
    const inner = byId(doc, 'inner');

    // act
    const deletion = deleteHighestEmpty(inner, outer);

    // assert
    expect(outer.isConnected).toBe(true);
    expect(inner.isConnected).toBe(false);
    expect(outer.children).toHaveLength(1);
    expect(isDeletedElement(outer.firstElementChild)).toBe(true);
    expect(deletion).toMatchObject({
      type: 'delete-element',
      marker: outer.firstElementChild,
      deleted: inner
    });
  });

  test('keeps non-empty', () => {
    // arrange
    const doc = makeRoot(div({ id: 'outer' }, div({ id: 'inner' }, p('text'))));
    const inner = byId(doc, 'inner');

    // act
    deleteHighestEmpty(inner, doc.root);

    // assert
    expect(inner.isConnected).toBe(true);
  });
});

describe('copyEmptyNext', () => {
  test('copies an empty FOCUSABLE after target with an ANCHOR when tag supports anchors', () => {
    // arrange
    const doc = makeRoot(p({ id: 'target', class: JSED_FOCUS_CLASS }, 'content'));
    const target = byId(doc, 'target');

    // act
    const empty = copyEmptyNext(target);

    // assert
    expect(empty).not.toBeNull();
    expect(target.nextElementSibling).toBe(empty);
    expect(empty?.tagName).toBe('P');
    expect(empty?.classList.contains(JSED_FOCUS_CLASS)).toBe(false);
    expect(empty?.querySelectorAll(`.${JSED_ANCHOR_CLASS}`)).toHaveLength(1);
    expect(empty?.textContent).toBe('');
  });

  test('copies an empty FOCUSABLE after target without an ANCHOR when tag does not support anchors', () => {
    // arrange
    const doc = makeRoot(div({ id: 'target', class: JSED_FOCUS_CLASS }, 'content'));
    const target = byId(doc, 'target');

    // act
    const empty = copyEmptyNext(target);

    // assert
    expect(empty).not.toBeNull();
    expect(target.nextElementSibling).toBe(empty);
    expect(empty?.tagName).toBe('DIV');
    expect(empty?.classList.contains(JSED_FOCUS_CLASS)).toBe(false);
    expect(empty?.querySelector(`.${JSED_ANCHOR_CLASS}`)).toBeNull();
    expect(empty?.textContent).toBe('');
  });
});

describe('copyEmptyPrevious', () => {
  test('copies an empty FOCUSABLE before target with an ANCHOR when tag supports anchors', () => {
    // arrange
    const doc = makeRoot(p({ id: 'target', class: JSED_FOCUS_CLASS }, 'content'));
    const target = byId(doc, 'target');

    // act
    const empty = copyEmptyPrevious(target);

    // assert
    expect(empty).not.toBeNull();
    expect(target.previousElementSibling).toBe(empty);
    expect(empty?.tagName).toBe('P');
    expect(empty?.classList.contains(JSED_FOCUS_CLASS)).toBe(false);
    expect(empty?.querySelectorAll(`.${JSED_ANCHOR_CLASS}`)).toHaveLength(1);
    expect(empty?.textContent).toBe('');
  });

  test('copies an empty FOCUSABLE before target without an ANCHOR when tag does not support anchors', () => {
    // arrange
    const doc = makeRoot(div({ id: 'target', class: JSED_FOCUS_CLASS }, 'content'));
    const target = byId(doc, 'target');

    // act
    const empty = copyEmptyPrevious(target);

    // assert
    expect(empty).not.toBeNull();
    expect(target.previousElementSibling).toBe(empty);
    expect(empty?.tagName).toBe('DIV');
    expect(empty?.classList.contains(JSED_FOCUS_CLASS)).toBe(false);
    expect(empty?.querySelector(`.${JSED_ANCHOR_CLASS}`)).toBeNull();
    expect(empty?.textContent).toBe('');
  });
});
