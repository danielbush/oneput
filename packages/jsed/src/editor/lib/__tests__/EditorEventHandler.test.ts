import { Controller } from '@oneput/oneput';
import { describe, expect, test } from 'vitest';
import { transaction } from '../../../undo/transaction.js';
import { frag, identifyChildren, makeRoot, p } from '../../../test/util.js';
import { EditorEventHandler } from '../EditorEventHandler.js';
import { EditorState } from '../EditorState.js';

describe('EditorEventHandler', () => {
  test('undo and redo each emit one history-applied element change', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    const handler = new EditorEventHandler(state);
    state.start();
    transaction(state, () => {
      return state.focusOps.insertNewAfter({ tagName: 'p' });
    });

    let documentChanges = 0;
    const elementChanges: Array<{ type: string; direction?: string }> = [];
    state.eventsEmitter.subscribe({
      onDocumentChange: () => {
        documentChanges += 1;
      },
      onElementChange: (event) => {
        elementChanges.push(event);
      }
    });

    // act
    handler.undo();

    // assert
    expect(documentChanges).toBe(1);
    expect(elementChanges).toEqual([{ type: 'history-applied', direction: 'undo' }]);
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[deleted-element]',
      '[element:p#p2]'
    ]);

    // act
    handler.redo();

    // assert
    expect(documentChanges).toBe(2);
    expect(elementChanges).toEqual([
      { type: 'history-applied', direction: 'undo' },
      { type: 'history-applied', direction: 'redo' }
    ]);
    expect(identifyChildren(doc.root)).toEqual(['[element:p#p1]', '[element:p]', '[element:p#p2]']);

    state.destroy();
  });

  test('empty undo and redo do not emit history-applied', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'one'));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    const handler = new EditorEventHandler(state);
    state.start();

    let documentChanges = 0;
    const elementChanges: Array<{ type: string }> = [];
    state.eventsEmitter.subscribe({
      onDocumentChange: () => {
        documentChanges += 1;
      },
      onElementChange: (event) => {
        elementChanges.push(event);
      }
    });

    // act
    handler.undo();
    handler.redo();

    // assert
    expect(documentChanges).toBe(0);
    expect(elementChanges).toEqual([]);

    state.destroy();
  });
});
