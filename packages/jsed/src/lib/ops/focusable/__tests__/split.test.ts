import { describe, expect, test } from 'vitest';
import { byId, div, makeRoot, p, span } from '../../../../test/util';
import {
  recSplitAfterChild,
  recSplitBeforeChild,
  splitAfterChild,
  splitBeforeChild
} from '../split';

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
