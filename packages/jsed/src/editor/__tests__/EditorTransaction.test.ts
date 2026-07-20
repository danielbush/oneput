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
});
