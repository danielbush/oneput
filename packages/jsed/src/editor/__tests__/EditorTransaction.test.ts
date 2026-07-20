import { Controller } from '@oneput/oneput';
import { describe, expect, test } from 'vitest';
import { Editor } from '../Editor.js';
import { frag, identifyChildren, makeRoot, p } from '../../test/util.js';

describe('Editor.transaction', () => {
  test('commits several operations as one undo and redo', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));
    const editor = Editor.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    editor.start();

    // act
    const succeeded = editor.transaction(() => {
      const first = editor.focusOps.insertNewAfter({ tagName: 'p' });
      const second = editor.focusOps.insertNewAfter({ tagName: 'p' });
      return first && second;
    });

    // assert
    expect(succeeded).toBe(true);
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[element:p]',
      '[element:p]',
      '[element:p#p2]'
    ]);

    // act
    editor.undo();

    // assert
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[deleted-element]',
      '[deleted-element]',
      '[element:p#p2]'
    ]);
    expect(editor.canUndo()).toBe(false);
    expect(editor.canRedo()).toBe(true);

    // act
    editor.redo();

    // assert
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[element:p]',
      '[element:p]',
      '[element:p#p2]'
    ]);

    editor.destroy();
  });

  test('rolls captured operations back when the callback returns false', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));
    const editor = Editor.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    editor.start();

    // act
    const succeeded = editor.transaction(() => {
      editor.focusOps.insertNewAfter({ tagName: 'p' });
      return false;
    });

    // assert
    expect(succeeded).toBe(false);
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[deleted-element]',
      '[element:p#p2]'
    ]);
    expect(editor.canUndo()).toBe(false);

    editor.destroy();
  });

  test('rolls captured operations back and rethrows callback errors', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));
    const editor = Editor.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    editor.start();

    // act & assert
    expect(() =>
      editor.transaction(() => {
        editor.focusOps.insertNewAfter({ tagName: 'p' });
        throw new Error('recipe failed');
      })
    ).toThrow('recipe failed');
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[deleted-element]',
      '[element:p#p2]'
    ]);
    expect(editor.canUndo()).toBe(false);

    editor.destroy();
  });

  test('undo and redo each emit one history-applied element change', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));
    const editor = Editor.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    editor.start();
    editor.transaction(() => {
      return editor.focusOps.insertNewAfter({ tagName: 'p' });
    });

    let documentChanges = 0;
    const elementChanges: Array<{ type: string; direction?: string }> = [];
    editor.eventsEmitter.subscribe({
      onDocumentChange: () => {
        documentChanges += 1;
      },
      onElementChange: (event) => {
        elementChanges.push(event);
      }
    });

    // act
    editor.undo();

    // assert
    expect(documentChanges).toBe(1);
    expect(elementChanges).toEqual([{ type: 'history-applied', direction: 'undo' }]);
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[deleted-element]',
      '[element:p#p2]'
    ]);

    // act
    editor.redo();

    // assert
    expect(documentChanges).toBe(2);
    expect(elementChanges).toEqual([
      { type: 'history-applied', direction: 'undo' },
      { type: 'history-applied', direction: 'redo' }
    ]);
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[element:p]',
      '[element:p#p2]'
    ]);

    editor.destroy();
  });

  test('empty undo and redo do not emit history-applied', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'one'));
    const editor = Editor.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    editor.start();

    let documentChanges = 0;
    const elementChanges: Array<{ type: string }> = [];
    editor.eventsEmitter.subscribe({
      onDocumentChange: () => {
        documentChanges += 1;
      },
      onElementChange: (event) => {
        elementChanges.push(event);
      }
    });

    // act
    editor.undo();
    editor.redo();

    // assert
    expect(documentChanges).toBe(0);
    expect(elementChanges).toEqual([]);

    editor.destroy();
  });
});
