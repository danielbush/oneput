import { describe, expect, test } from 'vitest';
import { byId, div, makeRoot, p, span } from '../../../test/util';
import {
  copyEmptyNext,
  copyEmptyPrevious,
  deleteHighestEmpty,
  findNextFocusableOutside,
  findPreviousFocusableOutside,
  recSplitAfterChild,
  recSplitBeforeChild,
  splitAfterChild,
  splitBeforeChild
} from '../focusable';
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
      action: 'delete-element',
      marker: doc.root.firstElementChild,
      element: outer
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
      action: 'delete-element',
      marker: outer.firstElementChild,
      element: inner
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

describe('splitting', () => {
  describe('splitAfterChild', () => {
    test('peer receives all nodes after the child', () => {
      // arrange
      const doc = makeRoot(
        div(
          { id: 'outer' },
          div({ id: 'child' }) + p({ id: 'after1' }, 'one') + p({ id: 'after2' }, 'two')
        )
      );
      const child = byId(doc, 'child');
      const after1 = byId(doc, 'after1');
      const after2 = byId(doc, 'after2');

      // act
      const result = splitAfterChild(child);

      // assert
      expect(Array.from(result.peer.childNodes)).toEqual([after1, after2]);
      expect(child.nextSibling).toBeNull();
    });
  });

  describe('splitBeforeChild', () => {
    test('peer receives the child and all following nodes', () => {
      // arrange
      const doc = makeRoot(
        div(
          { id: 'outer' },
          p({ id: 'before' }, 'zero') + div({ id: 'child' }) + p({ id: 'after' }, 'one')
        )
      );
      const outer = byId(doc, 'outer');
      const before = byId(doc, 'before');
      const child = byId(doc, 'child');
      const after = byId(doc, 'after');

      // act
      const result = splitBeforeChild(child);

      // assert
      expect(Array.from(result.peer.childNodes)).toEqual([child, after]);
      expect(Array.from(outer.childNodes)).toEqual([before]);
    });
  });

  describe('recSplitAfterChild', () => {
    test('splits the tree at the child up to the ceiling, peers hold everything after', () => {
      // arrange — child is 3 levels deep, with trailing content at each level
      const doc = makeRoot(
        div(
          { id: 'l1' },
          div(
            { id: 'l2' },
            div(
              { id: 'l3' }, //
              span({ id: 'child' }, 'C') + span('a3')
            ) + span('a2')
          ) + span('a1')
        )
      );
      const l1 = byId(doc, 'l1');
      const child = byId(doc, 'child');

      // act — split up to and including l1
      const result = recSplitAfterChild(child, (el) => el === l1);

      // assert — bottom split excludes the child, the climbing splits include their peer
      expect(result.action).toBe('recursive-split-after-child');
      expect(result.splits.map((s) => s.action)).toEqual([
        'split-after-child',
        'split-before-child',
        'split-before-child'
      ]);

      // root now holds the original l1 (child side) and one new peer (after side)
      expect(doc.root.children).toHaveLength(2);
      const [left, right] = Array.from(doc.root.children);
      expect(left).toBe(l1);
      expect(left.textContent).toBe('C');
      expect(right.textContent).toBe('a3a2a1');

      // the peer tree preserves the 3-deep nesting: peer > div > div > span('a3')
      const deepest = right.firstElementChild?.firstElementChild?.firstElementChild;
      expect(deepest?.tagName).toBe('SPAN');
      expect(deepest?.textContent).toBe('a3');
    });
  });

  describe('recSplitBeforeChild', () => {
    test('splits the tree before the child up to the ceiling, peers hold the child and everything after', () => {
      // arrange — child is 3 levels deep, with trailing content at each level
      const doc = makeRoot(
        div(
          { id: 'l1' },
          div(
            { id: 'l2' },
            div(
              { id: 'l3' }, //
              span({ id: 'child' }, 'C') + span('a3')
            ) + span('a2')
          ) + span('a1')
        )
      );
      const l1 = byId(doc, 'l1');
      const child = byId(doc, 'child');

      // act — split up to and including l1
      const result = recSplitBeforeChild(child, (el) => el === l1);

      // assert — every level is a before-split, so the child moves onto the peer side
      expect(result.action).toBe('recursive-split-before-child');
      expect(result.splits.map((s) => s.action)).toEqual([
        'split-before-child',
        'split-before-child',
        'split-before-child'
      ]);

      // root holds the original l1 (now drained) and one new peer holding the child side
      expect(doc.root.children).toHaveLength(2);
      const [left, right] = Array.from(doc.root.children);
      expect(left).toBe(l1);
      expect(left.textContent).toBe('');
      expect(right.textContent).toBe('Ca3a2a1');

      // the peer tree preserves the 3-deep nesting: peer > div > div > span('C')
      const deepest = right.firstElementChild?.firstElementChild?.firstElementChild;
      expect(deepest).toBe(child);
      expect(deepest?.textContent).toBe('C');
    });
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
