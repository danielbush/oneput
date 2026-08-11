import { describe, expect, test } from 'vitest';
import { byId, div, makeRoot, p } from '../../../../test/util.js';
import { focusAncestorPath } from '../focusAncestorPath.js';

describe('focusAncestorPath', () => {
  test('empty chain', () => {
    // arrange
    // act
    const steps = focusAncestorPath([], null);

    // assert
    expect(steps).toEqual([]);
  });

  test('marks live FOCUS mid-chain', () => {
    // arrange
    const doc = makeRoot(div({ id: 'section' }, p({ id: 'target' }, 'foo')));
    const mark = byId(doc, 'target');
    const focus = byId(doc, 'section');
    const chain = [mark, focus, doc.root];

    // act
    const steps = focusAncestorPath(chain, focus);

    // assert
    expect(steps.map((s) => ({ id: s.element.id || 'root', current: s.current }))).toEqual([
      { id: 'root', current: false },
      { id: 'section', current: true },
      { id: 'target', current: false }
    ]);
  });
});
