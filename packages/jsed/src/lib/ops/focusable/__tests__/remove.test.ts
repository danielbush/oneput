import { describe, expect, test } from 'vitest';
import { byId, div, makeRoot, p } from '../../../../test/util';
import { isDeletedElement } from '../../../core/taxonomy';
import { deleteHighestEmpty } from '../remove';

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
