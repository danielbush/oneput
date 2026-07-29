import { Controller } from '@oneput/oneput';
import { describe, expect, test } from 'vitest';
import { EditorState } from '../../editor/lib/EditorState.js';
import { byId, frag, identifyChildren, makeRoot, p } from '../../test/util.js';
import { transaction } from '../transaction.js';

describe('transaction', () => {
  test('commit: several operations as one undo and redo', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();

    // act
    const succeeded = transaction(state, { undoable: true }, () => {
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

  test('rollback: return false', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();

    // act
    const succeeded = transaction(state, { undoable: true }, () => {
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

  test('rollback: thrown error', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();

    // act & assert
    expect(() =>
      transaction(state, { undoable: true }, () => {
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

  test('untracked (undoable=false) : rolls back', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();

    // act
    const succeeded = transaction(state, { undoable: false }, () => {
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

  test('untracked (undoable=false) : does not add history', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();

    // act
    const succeeded = transaction(state, { undoable: false }, () => {
      return state.focusOps.insertNewAfter({ tagName: 'p' });
    });

    // assert
    expect(succeeded).toBe(true);
    expect(identifyChildren(doc.root)).toEqual(['[element:p#p1]', '[element:p]', '[element:p#p2]']);
    expect(state.undo.canUndo()).toBe(false);

    state.destroy();
  });

  test('nested / policy: ignore nested policy (untracked)', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();

    // act
    const succeeded = transaction(state, { undoable: true }, () => {
      const first = state.focusOps.insertNewAfter({ tagName: 'p' });
      const nested = transaction(state, { undoable: false }, () => {
        return state.focusOps.insertNewAfter({ tagName: 'p' });
      });
      return first && nested;
    });

    // assert
    expect(succeeded).toBe(true);
    expect(state.undo.getRecords()).toHaveLength(1);

    const undoRecord = state.undo.popUndo();
    undoRecord?.undo(state);
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[deleted-element]',
      '[deleted-element]',
      '[element:p#p2]'
    ]);

    state.destroy();
  });

  // A nested transaction’s undoable value is ignored for history retention; the
  // outermost transaction owns that policy.  The nested transaction still
  // creates a temporary boundary so it can roll back its own work on failure.
  // On success, its records flatten into the parent.
  test('nested / policy: ignore nested policy (tracked)', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();

    // act
    const succeeded = transaction(state, { undoable: false }, () => {
      const first = state.focusOps.insertNewAfter({ tagName: 'p' });
      const nested = transaction(state, { undoable: true }, () => {
        return state.focusOps.insertNewAfter({ tagName: 'p' });
      });
      return first && nested;
    });

    // assert
    expect(succeeded).toBe(true);
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[element:p]',
      '[element:p]',
      '[element:p#p2]'
    ]);
    expect(state.undo.canUndo()).toBe(false);

    state.destroy();
  });

  // “A failed nested change rolls itself back; callers propagate false when the
  // outer change must also fail.” It allows an outer operation to recover, try
  // an alternative, or ignore an optional nested attempt.
  test('nested / rollback: failed nested transaction can be discarded', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();

    // act
    const succeeded = transaction(state, { undoable: true }, () => {
      const first = state.focusOps.insertNewAfter({ tagName: 'p' });
      const nested = transaction(state, { undoable: true }, () => {
        state.focusOps.insertNewAfter({ tagName: 'p' });
        return false;
      });
      const third = state.focusOps.insertNewAfter({ tagName: 'p' });
      return first && !nested && third;
    });

    // assert
    expect(succeeded).toBe(true);
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[element:p]',
      '[element:p]',
      '[deleted-element]',
      '[element:p#p2]'
    ]);
    expect(state.undo.getRecords()).toHaveLength(1);

    const undoRecord = state.undo.popUndo();
    undoRecord?.undo(state);
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[deleted-element]',
      '[deleted-element]',
      '[deleted-element]',
      '[element:p#p2]'
    ]);

    state.destroy();
  });

  test('rollback: element patch', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();
    const target = byId(doc, 'p2');
    const elementChanges: Array<{ type: string }> = [];
    let documentChanges = 0;
    state.eventsEmitter.subscribe({
      onElementChange: (event) => elementChanges.push(event),
      onDocumentChange: () => {
        documentChanges += 1;
      }
    });

    // act
    const succeeded = transaction(state, { undoable: true }, () => {
      state.focusOps.patchElement(target, {
        attributes: { 'aria-label': 'Complete' },
        classes: { add: ['complete'] }
      });
      return false;
    });

    // assert
    expect(succeeded).toBe(false);
    expect(target.hasAttribute('aria-label')).toBe(false);
    expect(target.classList.contains('complete')).toBe(false);
    expect(state.undo.canUndo()).toBe(false);
    expect(elementChanges).toEqual([{ type: 'focusable-patched', element: target }]);
    expect(documentChanges).toBe(1);

    state.destroy();
  });
});
