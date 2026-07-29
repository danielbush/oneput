import { describe, expect, test } from 'vitest';
import { byId, div, frag, identifyChildren, makeRoot, p } from '../../../../test/util';
import { isDeletedElement } from '../../../core/taxonomy';
import {
  appendNew,
  insertNewAfter,
  insertNewBefore,
  redoAppendElement,
  redoInsertElementAfter,
  redoInsertElementBefore,
  undoAppendElement,
  undoInsertElementAfter,
  undoInsertElementBefore
} from '../insert';
import { moveElement, redoMoveElement, undoMoveElement } from '../move';
import { redoRemoveElement, removeElement, undoRemoveElement } from '../remove';

describe('DOM_RETENTION', () => {
  test('insert after retains its position while undone', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const op = insertNewAfter({ tagName: 'p' }, byId(doc, 'p1'))!;

    // act
    undoInsertElementAfter(op);
    byId(doc, 'p1').remove();
    redoInsertElementAfter(op);

    // assert
    expect(op.marker.isConnected).toBe(false);
    expect(identifyChildren(doc.root)).toEqual(['[element:p]', '[element:p#p2]']);
  });

  test('insert before retains its position while undone', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const op = insertNewBefore({ tagName: 'p' }, byId(doc, 'p2'))!;

    // act
    undoInsertElementBefore(op);
    byId(doc, 'p2').remove();
    redoInsertElementBefore(op);

    // assert
    expect(op.marker.isConnected).toBe(false);
    expect(identifyChildren(doc.root)).toEqual(['[element:p#p1]', '[element:p]']);
  });

  test('append retains its position while undone', () => {
    // arrange
    const doc = makeRoot(div({ id: 'host' }, p({ id: 'p1' }, 'foo')));
    const host = byId(doc, 'host');
    const op = appendNew(host, { tagName: 'p' })!;

    // act
    undoAppendElement(op);
    host.insertAdjacentHTML('beforeend', p({ id: 'p2' }, 'bar'));
    redoAppendElement(op);

    // assert
    expect(op.marker.isConnected).toBe(false);
    expect(identifyChildren(host)).toEqual(['[element:p#p1]', '[element:p]', '[element:p#p2]']);
  });

  test('remove retains the removed element position', () => {
    // arrange
    const doc = makeRoot(
      frag(p({ id: 'p1' }, 'foo'), p({ id: 'remove' }, 'bar'), p({ id: 'p2' }, 'baz'))
    );
    const op = removeElement(byId(doc, 'remove'))!;

    // act
    byId(doc, 'p1').remove();
    undoRemoveElement(op);
    redoRemoveElement(op);

    // assert
    expect(isDeletedElement(op.marker)).toBe(true);
    expect(op.marker.nextElementSibling).toBe(byId(doc, 'p2'));
    expect(identifyChildren(doc.root)).toEqual(['[deleted-element]', '[element:p#p2]']);
  });

  test('move retains both origin and destination positions', () => {
    // arrange
    const doc = makeRoot(
      frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two'), p({ id: 'p3' }, 'three'))
    );
    const op = moveElement(byId(doc, 'p1'), {
      type: 'after',
      ref: byId(doc, 'p2')
    })!;

    // act & assert
    expect(isDeletedElement(op.fromMarker)).toBe(true);
    expect(identifyChildren(doc.root)).toEqual([
      '[deleted-element]',
      '[element:p#p2]',
      '[element:p#p1]',
      '[element:p#p3]'
    ]);

    undoMoveElement(op);
    expect(isDeletedElement(op.toMarker)).toBe(true);
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[element:p#p2]',
      '[deleted-element]',
      '[element:p#p3]'
    ]);

    redoMoveElement(op);
    expect(isDeletedElement(op.fromMarker)).toBe(true);
    expect(identifyChildren(doc.root)).toEqual([
      '[deleted-element]',
      '[element:p#p2]',
      '[element:p#p1]',
      '[element:p#p3]'
    ]);
  });
});
