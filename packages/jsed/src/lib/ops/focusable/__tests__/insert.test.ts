import { describe, expect, test } from 'vitest';
import { byId, frag, identifyChildren, makeRoot, p } from '../../../../test/util';
import { insertNewAfter, redoInsertElementAfter, undoInsertElementAfter } from '../insert';

describe('insertNewAfter / undoInsertElementAfter / redoInsertElementAfter', () => {
  test('inserts between siblings', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));

    // act
    const op = insertNewAfter({ tagName: 'p' }, byId(doc, 'p1'));

    // assert
    expect(op?.action).toBe('insert-element-after');
    expect(op?.target).toBe(byId(doc, 'p1'));
    expect(op?.element.tagName).toBe('P');
    expect(identifyChildren(doc.root)).toEqual(['[element:p#p1]', '[element:p]', '[element:p#p2]']);
  });

  test('inserts at end of parent', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo')));

    // act
    const op = insertNewAfter({ tagName: 'p' }, byId(doc, 'p1'));

    // assert
    expect(op?.element.previousElementSibling).toBe(byId(doc, 'p1'));
    expect(identifyChildren(doc.root)).toEqual(['[element:p#p1]', '[element:p]']);
  });

  test('disallowed tag returns null', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo')));

    // act
    const op = insertNewAfter({ tagName: 'li' }, byId(doc, 'p1'));

    // assert
    expect(op).toBeNull();
    expect(identifyChildren(doc.root)).toEqual(['[element:p#p1]']);
  });

  test('undo removes the inserted element', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const op = insertNewAfter({ tagName: 'p' }, byId(doc, 'p1'))!;

    // act
    undoInsertElementAfter(op);

    // assert
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[deleted-element]',
      '[element:p#p2]'
    ]);
  });

  test('redo re-inserts the element after target', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const op = insertNewAfter({ tagName: 'p' }, byId(doc, 'p1'))!;
    undoInsertElementAfter(op);

    // act
    redoInsertElementAfter(op);

    // assert
    expect(identifyChildren(doc.root)).toEqual(['[element:p#p1]', '[element:p]', '[element:p#p2]']);
  });

  test('undo -> redo -> undo round-trips the same element', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo')));
    const op = insertNewAfter({ tagName: 'p' }, byId(doc, 'p1'))!;
    const inserted = op.element;

    // act
    undoInsertElementAfter(op);
    redoInsertElementAfter(op);
    undoInsertElementAfter(op);

    // assert
    expect(op.element).toBe(inserted);
    expect(identifyChildren(doc.root)).toEqual(['[element:p#p1]', '[deleted-element]']);
  });
});
