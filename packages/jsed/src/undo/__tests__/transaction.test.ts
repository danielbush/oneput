import { Controller } from '@oneput/oneput';
import { describe, expect, test } from 'vitest';
import { EditorState } from '../../editor/lib/EditorState.js';
import { frag, identifyChildren, makeRoot, p } from '../../test/util.js';
import { transaction } from '../transaction.js';

describe('transaction', () => {
  test('commits several operations as one undo and redo', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();

    // act
    const succeeded = transaction(state, () => {
      const first = state.focusOps.insertNewAfter({ tagName: 'p' });
      const second = state.focusOps.insertNewAfter({ tagName: 'p' });
      return first && second;
    });

    // assert
    expect(succeeded).toBe(true);
    expect(state.undo.getRecords()).toHaveLength(1);
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[element:p]',
      '[element:p]',
      '[element:p#p2]'
    ]);

    // act
    const undoRecord = state.undo.popUndo();
    undoRecord?.undo(state);

    // assert
    expect(undoRecord).not.toBeNull();
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[deleted-element]',
      '[deleted-element]',
      '[element:p#p2]'
    ]);
    expect(state.undo.canUndo()).toBe(false);
    expect(state.undo.canRedo()).toBe(true);

    // act
    const redoRecord = state.undo.popRedo();
    redoRecord?.redo(state);

    // assert
    expect(redoRecord).not.toBeNull();
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[element:p]',
      '[element:p]',
      '[element:p#p2]'
    ]);

    state.destroy();
  });

  test('rolls captured operations back when the callback returns false', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();

    // act
    const succeeded = transaction(state, () => {
      state.focusOps.insertNewAfter({ tagName: 'p' });
      return false;
    });

    // assert
    expect(succeeded).toBe(false);
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[deleted-element]',
      '[element:p#p2]'
    ]);
    expect(state.undo.canUndo()).toBe(false);

    state.destroy();
  });

  test('rolls captured operations back and rethrows callback errors', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();

    // act & assert
    expect(() =>
      transaction(state, () => {
        state.focusOps.insertNewAfter({ tagName: 'p' });
        throw new Error('recipe failed');
      })
    ).toThrow('recipe failed');
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[deleted-element]',
      '[element:p#p2]'
    ]);
    expect(state.undo.canUndo()).toBe(false);

    state.destroy();
  });
});
