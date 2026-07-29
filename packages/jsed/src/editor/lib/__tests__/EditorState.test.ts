import { Controller } from '@oneput/oneput';
import { describe, expect, test } from 'vitest';
import { byId, makeRoot, p } from '../../../test/util.js';
import { EditorState } from '../EditorState.js';

describe('EditorState.exitEditing', () => {
  test('selection: unwrap / exit', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'one two'));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();
    state.enterEditing(byId(doc, 'p1'));
    state.cursor?.extendNext();
    expect(doc.root.querySelector('.jsed-selection')).not.toBeNull();

    // act
    state.exitEditing();

    // assert
    expect(state.isEditing()).toBe(false);
    expect(doc.root.querySelector('.jsed-selection')).toBeNull();
    expect(byId(doc, 'p1').textContent).toBe('one two');

    state.destroy();
  });
});
