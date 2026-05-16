import { describe, expect, test } from 'vitest';
import { byId, div, makeRoot, p } from '../../../test/util';
import {
  copyEmptyNext,
  copyEmptyPrevious,
  deleteHighestEmptyTree,
  findNextFocusableOutside,
  findPreviousFocusableOutside
} from '../../focus/focusable';
import {
  executeDeleteHighestEmptySubtree,
  planDeleteHighestEmptySubtree,
  undoDeleteHighestEmptySubtree
} from '../focusable.mutate';
import { JSED_ANCHOR_CLASS, JSED_FOCUS_CLASS } from '../../core/taxonomy';

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
    deleteHighestEmptyTree(inner, doc.root);

    // assert
    expect(outer.isConnected).toBe(false);
    expect(middle.isConnected).toBe(false);
    expect(inner.isConnected).toBe(false);
    expect(doc.root.children).toHaveLength(0);
  });

  test('stops at ceiling', () => {
    // arrange
    const doc = makeRoot(div({ id: 'outer' }, div({ id: 'inner' })));
    const outer = byId(doc, 'outer');
    const inner = byId(doc, 'inner');

    // act
    deleteHighestEmptyTree(inner, outer);

    // assert
    expect(outer.isConnected).toBe(true);
    expect(inner.isConnected).toBe(false);
    expect(outer.children).toHaveLength(0);
  });

  test('assumes base is removable', () => {
    // arrange
    const doc = makeRoot(div({ id: 'outer' }, div({ id: 'inner' }, p('text'))));
    const outer = byId(doc, 'outer');
    const inner = byId(doc, 'inner');

    // act
    deleteHighestEmptyTree(inner, doc.root);

    // assert
    expect(outer.isConnected).toBe(false);
    expect(inner.isConnected).toBe(false);
  });
});

describe('planDeleteHighestEmptySubtree', () => {
  test('includes base', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'outer' }, //
        div(
          { id: 'inner' }, //
          p('text')
        )
      )
    );
    const outer = byId(doc, 'outer');
    const inner = byId(doc, 'inner');

    // act
    const plan = planDeleteHighestEmptySubtree(inner, doc.root);

    // assert
    expect(plan.highest).toBe(outer);
    expect(plan.insertionSite?.parent).toBe(doc.root);
    expect(plan.insertionSite?.previousSibling).toBeNull();
    expect(plan.insertionSite?.nextSibling).toBeNull();
  });

  test('stops at sibling', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'outer' }, //
        div({ id: 'inner' }),
        p({ id: 'sibling' })
      )
    );
    const inner = byId(doc, 'inner');

    // act
    const plan = planDeleteHighestEmptySubtree(inner, doc.root);

    // assert
    expect(plan.highest).toBe(inner);
    expect(plan.insertionSite?.parent).toBe(byId(doc, 'outer'));
    expect(plan.insertionSite?.previousSibling).toBeNull();
    expect(plan.insertionSite?.nextSibling).toBe(byId(doc, 'sibling'));
  });

  test('stops at ceiling', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'outer' }, //
        div(
          { id: 'middle' }, //
          div({ id: 'inner' })
        )
      )
    );
    const outer = byId(doc, 'outer');
    const inner = byId(doc, 'inner');

    // act
    const plan = planDeleteHighestEmptySubtree(inner, outer);

    // assert
    const middle = byId(doc, 'middle');
    expect(plan.highest).toBe(middle);
    expect(plan.insertionSite?.parent).toBe(outer);
    expect(plan.insertionSite?.previousSibling).toBeNull();
    expect(plan.insertionSite?.nextSibling).toBeNull();
  });

  test('undo restores subtree', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'root-child' },
        p({ id: 'before' }),
        div({ id: 'outer' }, div({ id: 'inner' })),
        p({ id: 'after' })
      )
    );
    const rootChild = byId(doc, 'root-child');
    const outer = byId(doc, 'outer');
    const plan = planDeleteHighestEmptySubtree(outer, doc.root);
    executeDeleteHighestEmptySubtree(plan);

    // act
    undoDeleteHighestEmptySubtree(plan);

    // assert
    expect(Array.from(rootChild.children).map((child) => child.id)).toEqual([
      'before',
      'outer',
      'after'
    ]);
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
